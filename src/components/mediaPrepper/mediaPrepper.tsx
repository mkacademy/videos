import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Container, Form, ListGroup, Nav, ProgressBar, Spinner } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { RootState } from '../../store';
import {
  resolveMediaPlayerTab,
  type MediaPlayerTab,
} from '../mediaPlayer/mediaPlayerUtils';
import MediaScreenSwitcher from '../MediaScreenSwitcher';
import { estimateProcessing, formatFileSize, formatTimestamp } from './estimateProcessing';
import { analyzeFormat } from './formatUtils';
import { analyzeAudioFormat, isValidAudioFile } from './audioFormatUtils';
import { probeVideo, revokeProbeUrl } from './probeVideo';
import { probeAudio, revokeAudioProbeUrl } from './probeAudio';
import type {
  AudioFileSelectionContext,
  FileSelectionContext,
  ImportDestination,
  MediaKind,
  ProcessingProgress,
  ProcessStage,
  TimeWindow,
  UiState,
} from './types';
import { LARGE_FILE_WARNING_BYTES, VIDEO_WIDTH_OPTIONS } from './types';
import { logError, logStage } from './debugLog';
import { buildOutputBaseName } from './downloadUtils';
import { useVideoProcessor } from './useVideoProcessor';
import { useAudioProcessor } from './useAudioProcessor';
import {
  buildCourseTreesFromPreparedVideo,
  buildQuizTreesFromPreparedVideos,
  buildTutorialTreesFromPreparedAudio,
  buildTutorialTreesFromPreparedVideo,
} from '../../library/TemplatesManagerUtils';
import type { VideoSegmentImportStage } from '../../library/videoSegmentImport';
import { prependError, prependWarning } from '../../store/slices/errorSlice';
import { setCourses } from '../../store/slices/courseSlice';
import { setTutorials } from '../../store/slices/tutorialSlice';
import { setQuizzes } from '../../store/slices/quizSlice';
import type { ProcessVideoOutput } from './types';
import {
  collectQuizVideoCandidatesFromDirectory,
  findQuizMatchingFilesystemFolder,
  formatQuizFolderMatchError,
  formatQuizFolderPathError,
  getAcceptedFileTypes,
  getDropZoneHint,
  getFilesystemPathHints,
  getImportDestinationForTab,
  getImportDestinationLabelForTab,
  getQuizFolderHints,
  isValidVideoFile,
  toQuizVideoCandidateFromFile,
  type QuizVideoCandidate,
} from './mediaPrepperUtils';
import { isDirectoryPickerSupported, pickDirectoryHandle } from '../../library/directoryTreeUtils';
import MediaPrepperAudioPreview from './MediaPrepperAudioPreview';
import AspectRatioVideoPreview from './AspectRatioVideoPreview';
import * as styles from '../../styles/mediaPrepper.module.css';

const CANCEL_ACK_MS = 2500;
const MIN_TRIM_GAP_SECONDS = 0.5;

type ActiveSelection =
  | { mediaKind: 'video'; context: FileSelectionContext }
  | { mediaKind: 'audio'; context: AudioFileSelectionContext };

function getCancellingBannerMessage(stage: ProcessStage | undefined, mediaKind: MediaKind): string {
  switch (stage) {
    case 'loading-ffmpeg':
      return 'Stopping — processing had not started yet.';
    case 'normalizing':
      return mediaKind === 'audio'
        ? 'Stopping conversion — importing any converted audio produced so far…'
        : 'Stopping conversion — importing any converted video produced so far…';
    case 'resizing':
      return 'Stopping resize — importing any resized video produced so far…';
    default:
      return 'Stopping — importing any completed output before closing…';
  }
}

function getCancellingDetailMessage(stage: ProcessStage | undefined, progressPercent: number, mediaKind: MediaKind): string {
  switch (stage) {
    case 'loading-ffmpeg':
      return `The ${mediaKind} processor is shutting down. Nothing will be imported because processing had not begun.`;
    case 'normalizing':
      return `Conversion was about ${progressPercent}% complete. We are saving whatever was converted so far and importing it automatically. This may take a few seconds.`;
    case 'resizing':
      return `Resize was about ${progressPercent}% complete. We are saving whatever was resized so far and importing it automatically. This may take a few seconds.`;
    default:
      return 'We are saving any completed output and importing it automatically. This may take a few seconds.';
  }
}

function getImportStageLabel(stage: VideoSegmentImportStage): string {
  switch (stage) {
    case 'loading-ffmpeg':
      return 'Loading media importer…';
    case 'preparing':
      return 'Preparing media for import…';
    case 'chunking':
      return 'Splitting into playable chunks…';
  }
}

function getDestinationNoun(destination: ImportDestination, count: number): string {
  switch (destination) {
    case 'tutorial':
      return count === 1 ? 'tutorial' : 'tutorials';
    case 'course':
      return count === 1 ? 'course' : 'courses';
    case 'quiz':
      return count === 1 ? 'quiz' : 'quizzes';
  }
}

type OutputPreview = {
  blobUrl: string;
  sizeBytes: number;
  partial: boolean;
  mediaKind: MediaKind;
};

const MediaPrepperTabs: React.FC<{
  activeTab: MediaPlayerTab;
  onSelect: (tab: MediaPlayerTab) => void;
}> = ({ activeTab, onSelect }) => (
  <Nav variant="tabs" className={styles['tabNav']}>
    {(['tutorial', 'course', 'quiz'] as const).map((tab) => (
      <Nav.Item key={tab}>
        <Nav.Link
          active={activeTab === tab}
          onClick={() => onSelect(tab)}
          className={styles['tabLink']}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </Nav.Link>
      </Nav.Item>
    ))}
  </Nav>
);

const MediaPrepper: React.FC = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const quizQuizzes = useSelector((state: RootState) => state.quiz.quizzes);
  const quizBanners = useSelector((state: RootState) => state.quiz.banners);
  const tabParam = searchParams.get('tab');
  const activeTab = resolveMediaPlayerTab(tabParam, curApp);
  const mediaKind: MediaKind = activeTab === 'tutorial' ? 'audio' : 'video';
  const importDestination = getImportDestinationForTab(activeTab);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelAckTimeoutRef = useRef<number | null>(null);

  const { processVideo, cancel: cancelVideoFfmpeg, terminateFfmpeg: terminateVideoFfmpeg, isFfmpegLoaded: isVideoFfmpegLoaded } = useVideoProcessor();
  const { processAudio, cancel: cancelAudioFfmpeg, terminateFfmpeg: terminateAudioFfmpeg, isFfmpegLoaded: isAudioFfmpegLoaded } = useAudioProcessor();

  const [selectedWidths, setSelectedWidths] = useState<number[]>([]);
  const [uiState, setUiState] = useState<UiState>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [outputPreview, setOutputPreview] = useState<OutputPreview | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const progressRef = useRef<ProcessingProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [quizVideoCandidates, setQuizVideoCandidates] = useState<QuizVideoCandidate[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const videoProbeRef = useRef(activeSelection?.mediaKind === 'video' ? activeSelection.context.probe : null);
  const audioProbeRef = useRef(activeSelection?.mediaKind === 'audio' ? activeSelection.context.probe : null);
  const outputPreviewRef = useRef(outputPreview);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const outputBaseNameRef = useRef('media');

  videoProbeRef.current = activeSelection?.mediaKind === 'video' ? activeSelection.context.probe : null;
  audioProbeRef.current = activeSelection?.mediaKind === 'audio' ? activeSelection.context.probe : null;
  outputPreviewRef.current = outputPreview;
  progressRef.current = progress;

  useEffect(() => {
    if (tabParam) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', resolveMediaPlayerTab(null, curApp));
      return next;
    }, { replace: true });
  }, [tabParam, curApp, setSearchParams]);

  const revokeOutputPreview = useCallback((preview: OutputPreview | null) => {
    if (preview?.blobUrl) {
      URL.revokeObjectURL(preview.blobUrl);
    }
  }, []);

  const revokeActiveProbe = useCallback((selection: ActiveSelection | null) => {
    if (!selection) return;
    if (selection.mediaKind === 'video') {
      revokeProbeUrl(selection.context.probe);
    } else {
      revokeAudioProbeUrl(selection.context.probe);
    }
  }, []);

  const getDuration = useCallback((): number => {
    if (!activeSelection) return 0;
    return activeSelection.context.probe.duration;
  }, [activeSelection]);

  const getTimeWindow = useCallback((): TimeWindow | undefined => {
    const duration = getDuration();
    if (!activeSelection || duration <= 0) return undefined;
    const start = Math.max(0, Math.min(trimStart, duration));
    const end = Math.max(start + MIN_TRIM_GAP_SECONDS, Math.min(trimEnd, duration));
    if (start <= 0.05 && end >= duration - 0.05) return undefined;
    return { startSeconds: start, endSeconds: end };
  }, [activeSelection, getDuration, trimEnd, trimStart]);

  const isFfmpegLoaded = useCallback(() => (
    mediaKind === 'audio' ? isAudioFfmpegLoaded() : isVideoFfmpegLoaded()
  ), [isAudioFfmpegLoaded, isVideoFfmpegLoaded, mediaKind]);

  const updateEstimate = useCallback((
    selection: ActiveSelection,
    timeWindow?: TimeWindow,
    widths?: number[],
  ) => {
    const estimate = estimateProcessing(
      selection.context.probe,
      selection.context.format,
      isFfmpegLoaded(),
      selection.mediaKind,
      activeTab,
      timeWindow,
      widths ?? selectedWidths,
    );
    if (selection.mediaKind === 'audio') {
      setActiveSelection({
        mediaKind: 'audio',
        context: { ...selection.context, estimate },
      });
      return;
    }
    setActiveSelection({
      mediaKind: 'video',
      context: { ...selection.context, estimate },
    });
  }, [activeTab, isFfmpegLoaded, selectedWidths]);

  const resetToIdle = useCallback(() => {
    if (cancelAckTimeoutRef.current !== null) {
      window.clearTimeout(cancelAckTimeoutRef.current);
      cancelAckTimeoutRef.current = null;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    revokeActiveProbe(activeSelection);
    revokeOutputPreview(outputPreview);
    setActiveSelection(null);
    setTrimStart(0);
    setTrimEnd(0);
    setOutputPreview(null);
    setIsCancelling(false);
    setProgress(null);
    setErrorMessage(null);
    setStatusMessage(null);
    setQuizVideoCandidates([]);
    setUiState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [activeSelection, outputPreview, revokeActiveProbe, revokeOutputPreview]);

  useEffect(() => () => {
    if (cancelAckTimeoutRef.current !== null) {
      window.clearTimeout(cancelAckTimeoutRef.current);
    }
    abortControllerRef.current?.abort();
    void cancelVideoFfmpeg();
    void cancelAudioFfmpeg();
    terminateVideoFfmpeg();
    terminateAudioFfmpeg();
    revokeProbeUrl(videoProbeRef.current);
    revokeAudioProbeUrl(audioProbeRef.current);
    revokeOutputPreview(outputPreviewRef.current);
  }, [cancelAudioFfmpeg, cancelVideoFfmpeg, revokeOutputPreview, terminateAudioFfmpeg, terminateVideoFfmpeg]);

  const handleTabSelect = useCallback((tab: MediaPlayerTab) => {
    resetToIdle();
    setSelectedWidths([]);
    setSearchParams({ tab });
  }, [resetToIdle, setSearchParams]);

  const handleTrimStartChange = useCallback((value: number) => {
    const duration = getDuration();
    if (!activeSelection || duration <= 0) return;
    const nextStart = Math.max(0, Math.min(value, duration - MIN_TRIM_GAP_SECONDS));
    const nextEnd = Math.max(nextStart + MIN_TRIM_GAP_SECONDS, trimEnd);
    setTrimStart(nextStart);
    if (nextEnd !== trimEnd) {
      setTrimEnd(Math.min(nextEnd, duration));
    }
    const video = previewVideoRef.current;
    if (video) {
      video.currentTime = nextStart;
    }
  }, [activeSelection, getDuration, trimEnd]);

  const handleTrimEndChange = useCallback((value: number) => {
    const duration = getDuration();
    if (!activeSelection || duration <= 0) return;
    const nextEnd = Math.max(trimStart + MIN_TRIM_GAP_SECONDS, Math.min(value, duration));
    setTrimEnd(nextEnd);
    const video = previewVideoRef.current;
    if (video) {
      video.currentTime = nextEnd;
    }
  }, [activeSelection, getDuration, trimStart]);

  const handleRecalculateEstimate = useCallback(() => {
    if (!activeSelection) return;
    updateEstimate(activeSelection, getTimeWindow(), selectedWidths);
  }, [activeSelection, getTimeWindow, selectedWidths, updateEstimate]);

  const toggleSelectedWidth = useCallback((width: number) => {
    setSelectedWidths((current) => {
      let next: number[];
      if (activeTab === 'course') {
        next = current.includes(width) ? [] : [width];
      } else {
        next = current.includes(width)
          ? current.filter((value) => value !== width)
          : [...current, width].sort((a, b) => b - a);
      }
      if (activeSelection) {
        updateEstimate(activeSelection, getTimeWindow(), next);
      }
      return next;
    });
  }, [activeSelection, activeTab, getTimeWindow, updateEstimate]);

  const handleSelectedFile = useCallback(async (
    file: File | null | undefined,
    quizFolderKey?: string,
  ) => {
    if (!file) return;

    if (mediaKind === 'audio') {
      if (!isValidAudioFile(file)) {
        setErrorMessage('Please select a valid audio file.');
        setUiState('error');
        return;
      }
    } else if (!isValidVideoFile(file)) {
      setErrorMessage('Please select a valid video file.');
      setUiState('error');
      return;
    }

    resetToIdle();
    setUiState('probing');
    setErrorMessage(null);

    try {
      if (mediaKind === 'audio') {
        const probe = await probeAudio(file);
        const format = analyzeAudioFormat(file, probe);
        const context: AudioFileSelectionContext = {
          file,
          probe,
          format,
          estimate: estimateProcessing(probe, format, isFfmpegLoaded(), 'audio', activeTab, undefined, selectedWidths),
        };
        outputBaseNameRef.current = buildOutputBaseName(file.name);
        setTrimStart(0);
        setTrimEnd(probe.duration > 0 ? probe.duration : 0);
        setActiveSelection({ mediaKind: 'audio', context });
      } else {
        const probe = await probeVideo(file);
        const format = analyzeFormat(file, probe);

        let matchedQuiz: FileSelectionContext['matchedQuiz'];
        if (activeTab === 'quiz') {
          const folderHints = quizFolderKey
            ? getQuizFolderHints(quizFolderKey)
            : getFilesystemPathHints(file);
          if (folderHints.length === 0) {
            setErrorMessage(formatQuizFolderPathError());
            setUiState('error');
            return;
          }

          const quiz = findQuizMatchingFilesystemFolder(quizQuizzes, folderHints);
          if (!quiz) {
            setErrorMessage(formatQuizFolderMatchError(folderHints));
            setUiState('error');
            return;
          }

          matchedQuiz = { id: quiz.id, title: quiz.title ?? folderHints[folderHints.length - 1] };
        }

        const context: FileSelectionContext = {
          file,
          probe,
          format,
          estimate: estimateProcessing(probe, format, isFfmpegLoaded(), 'video', activeTab, undefined, selectedWidths),
          matchedQuiz,
        };
        outputBaseNameRef.current = buildOutputBaseName(file.name);
        setTrimStart(0);
        setTrimEnd(probe.duration > 0 ? probe.duration : 0);
        setActiveSelection({ mediaKind: 'video', context });
      }
      setUiState('awaiting-confirmation');
    } catch (error) {
      logError('probe', error, { fileName: file.name, fileSize: file.size, fileType: file.type });
      setErrorMessage(error instanceof Error ? error.message : `Failed to read ${mediaKind} metadata.`);
      setUiState('error');
    }
  }, [activeTab, isFfmpegLoaded, mediaKind, quizQuizzes, resetToIdle, selectedWidths]);

  const presentQuizVideoCandidates = useCallback((candidates: QuizVideoCandidate[]) => {
    if (candidates.length === 0) {
      setErrorMessage('No valid video files found in the selected folder.');
      setUiState('error');
      return;
    }
    if (candidates.length === 1) {
      setQuizVideoCandidates([]);
      void handleSelectedFile(candidates[0].file, candidates[0].folderKey);
      return;
    }
    setQuizVideoCandidates(candidates);
    setErrorMessage(null);
    setUiState('idle');
  }, [handleSelectedFile]);

  const pickQuizFolder = useCallback(async () => {
    if (isDirectoryPickerSupported()) {
      const root = await pickDirectoryHandle();
      if (!root) return;
      const candidates = await collectQuizVideoCandidatesFromDirectory(root);
      presentQuizVideoCandidates(candidates);
      return;
    }
    fileInputRef.current?.click();
  }, [presentQuizVideoCandidates]);

  const selectQuizFolderVideos = useCallback((files: FileList | File[]) => {
    const videos = [...files].filter(isValidVideoFile);
    if (videos.length === 0) {
      setErrorMessage('No valid video files found in the selected folder.');
      setUiState('error');
      return;
    }

    const candidates = videos
      .map((file) => toQuizVideoCandidateFromFile(file))
      .filter((candidate): candidate is QuizVideoCandidate => candidate !== null);
    if (candidates.length === 0) {
      setErrorMessage(formatQuizFolderPathError());
      setUiState('error');
      return;
    }
    presentQuizVideoCandidates(candidates);
  }, [presentQuizVideoCandidates]);

  const onInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    if (activeTab === 'quiz') {
      selectQuizFolderVideos(files);
      return;
    }
    void handleSelectedFile(files[0]);
  }, [activeTab, handleSelectedFile, selectQuizFolderVideos]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const files = event.dataTransfer.files;
    if (!files?.length) return;
    if (activeTab === 'quiz') {
      selectQuizFolderVideos(files);
      return;
    }
    void handleSelectedFile(files[0]);
  }, [activeTab, handleSelectedFile, selectQuizFolderVideos]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const storeOutputPreview = useCallback((blob: Blob, partial: boolean, previewMediaKind: MediaKind) => {
    setOutputPreview((current) => {
      revokeOutputPreview(current);
      return {
        blobUrl: URL.createObjectURL(blob),
        sizeBytes: blob.size,
        partial,
        mediaKind: previewMediaKind,
      };
    });
  }, [revokeOutputPreview]);

  const importPreparedOutputs = useCallback(async (
    outputs: ProcessVideoOutput[],
    baseName: string,
    partial: boolean,
    signal: AbortSignal,
    destination: ImportDestination,
    preparedMediaKind: MediaKind,
    matchedQuiz?: FileSelectionContext['matchedQuiz'],
  ) => {
    setUiState('importing');
    setProgress({ stage: 'loading-ffmpeg', stageLabel: getImportStageLabel('loading-ffmpeg'), ratio: 0 });

    if (destination === 'tutorial') {
      const output = outputs[0];
      if (!output) {
        throw new Error('No prepared media was produced.');
      }

      const file = preparedMediaKind === 'audio'
        ? new File([output.blob], `${baseName}_prepared.mp3`, { type: 'audio/mpeg' })
        : new File([output.blob], `${baseName}_prepared.mp4`, { type: 'video/mp4' });
      const built = preparedMediaKind === 'audio'
        ? await buildTutorialTreesFromPreparedAudio(file, {
          signal,
          onProgress: ({ stage, ratio }) => {
            if (signal.aborted) return;
            setProgress({
              stage: 'loading-ffmpeg',
              stageLabel: getImportStageLabel(stage),
              ratio,
            });
          },
        })
        : await buildTutorialTreesFromPreparedVideo(file, {
          signal,
          onProgress: ({ stage, ratio }) => {
            if (signal.aborted) return;
            setProgress({
              stage: 'loading-ffmpeg',
              stageLabel: getImportStageLabel(stage),
              ratio,
            });
          },
        });

      if (signal.aborted) return;

      if (!built || built.banners.length === 0) {
        throw new Error(built?.errors[0] ?? `Failed to import prepared ${preparedMediaKind} into tutorials.`);
      }

      built.errors.forEach((msg) => dispatch(prependError(msg)));
      built.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(setTutorials({ banners: built.banners, content: built.content }));

      const chunkCount = built.content[0]?.length ?? 0;
      const bannerTitle = built.banners[0]?.title ?? baseName;
      const noun = getDestinationNoun('tutorial', 1);
      const mediaLabel = preparedMediaKind === 'audio' ? 'audio' : 'video';
      dispatch(prependWarning(
        partial
          ? `Imported partial ${mediaLabel} "${bannerTitle}" (${chunkCount} chunk${chunkCount === 1 ? '' : 's'}) into ${noun}`
          : `Imported "${bannerTitle}" into ${noun} (${chunkCount} chunk${chunkCount === 1 ? '' : 's'})`,
      ));
      setStatusMessage(
        partial
          ? `Partial ${mediaLabel} imported into ${noun} as "${bannerTitle}" (${chunkCount} chunk${chunkCount === 1 ? '' : 's'}).`
          : `${preparedMediaKind === 'audio' ? 'Audio' : 'Video'} imported into ${noun} as "${bannerTitle}" (${chunkCount} chunk${chunkCount === 1 ? '' : 's'}).`,
      );
      setProgress(null);
      return;
    }

    if (destination === 'course') {
      const output = outputs[0];
      if (!output) {
        throw new Error('No prepared video was produced.');
      }

      const file = output.label === 'original' && output.blob instanceof File
        ? output.blob
        : new File([output.blob], `${baseName}_${output.label}_prepared.mp4`, { type: 'video/mp4' });
      const built = await buildCourseTreesFromPreparedVideo(file, {
        signal,
        onProgress: ({ stage, ratio }) => {
          if (signal.aborted) return;
          setProgress({
            stage: 'loading-ffmpeg',
            stageLabel: getImportStageLabel(stage),
            ratio,
          });
        },
      });

      if (signal.aborted) return;

      if (!built || built.banners.length === 0) {
        throw new Error(built?.errors[0] ?? 'Failed to import prepared video into courses.');
      }

      built.errors.forEach((msg) => dispatch(prependError(msg)));
      built.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(setCourses({ banners: built.banners, content: built.content }));

      const chunkCount = built.banners[0]?.pennants?.length ?? 0;
      const bannerTitle = built.banners[0]?.title ?? baseName;
      dispatch(prependWarning(
        partial
          ? `Imported partial video "${bannerTitle}" (${chunkCount} segment${chunkCount === 1 ? '' : 's'}) into courses`
          : `Imported "${bannerTitle}" into courses (${chunkCount} segment${chunkCount === 1 ? '' : 's'})`,
      ));
      setStatusMessage(
        partial
          ? `Partial video imported into courses as "${bannerTitle}" (${chunkCount} segment${chunkCount === 1 ? '' : 's'}).`
          : `Video imported into courses as "${bannerTitle}" (${chunkCount} segment${chunkCount === 1 ? '' : 's'}).`,
      );
      setProgress(null);
      return;
    }

    const files = outputs.map((output) => (
      output.label === 'original' && output.blob instanceof File
        ? output.blob
        : new File(
          [output.blob],
          `${baseName}_${output.label}_prepared.mp4`,
          { type: 'video/mp4' },
        )
    ));

    if (!matchedQuiz) {
      throw new Error('No matching quiz was selected for import.');
    }

    const startingBannerOrdinal = quizBanners.filter((banner) => banner.bannerId === matchedQuiz.id).length;
    const built = await buildQuizTreesFromPreparedVideos(
      files,
      matchedQuiz.id,
      startingBannerOrdinal,
      {
      signal,
      onProgress: ({ stage, ratio }) => {
        if (signal.aborted) return;
        setProgress({
          stage: 'loading-ffmpeg',
          stageLabel: getImportStageLabel(stage),
          ratio,
        });
      },
    },
    );

    if (signal.aborted) return;

    if (!built || built.banners.length === 0) {
      throw new Error(built?.errors[0] ?? 'Failed to import prepared videos into quizzes.');
    }

    built.errors.forEach((msg) => dispatch(prependError(msg)));
    built.skipped.forEach((msg) => dispatch(prependWarning(msg)));
    dispatch(setQuizzes({
      quizzes: [],
      banners: built.banners,
      content: built.content,
    }));

    const quizTitle = matchedQuiz.title;
    dispatch(prependWarning(
      partial
        ? `Imported partial outputs into quiz "${quizTitle}" (${built.banners.length} course banner${built.banners.length === 1 ? '' : 's'})`
        : `Imported ${built.banners.length} size variants into quiz "${quizTitle}"`,
    ));
    setStatusMessage(
      partial
        ? `Partial outputs imported into quiz "${quizTitle}" (${built.banners.length} course banner${built.banners.length === 1 ? '' : 's'}).`
        : `Imported ${built.banners.length} size variants into quiz "${quizTitle}".`,
    );
    setProgress(null);
  }, [dispatch, quizBanners]);

  const handleCancel = useCallback(async () => {
    if (uiState === 'importing') {
      abortControllerRef.current?.abort();
      return;
    }

    if (uiState === 'loading-ffmpeg' || uiState === 'processing') {
      if (isCancelling) return;
      const stage = progressRef.current?.stage;
      setIsCancelling(true);
      setStatusMessage(getCancellingBannerMessage(stage, mediaKind));
      abortControllerRef.current?.abort();
      if (mediaKind === 'audio') {
        cancelAudioFfmpeg();
      } else {
        cancelVideoFfmpeg();
      }
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    cancelVideoFfmpeg();
    cancelAudioFfmpeg();
    terminateVideoFfmpeg();
    terminateAudioFfmpeg();
    resetToIdle();
  }, [cancelAudioFfmpeg, cancelVideoFfmpeg, isCancelling, mediaKind, resetToIdle, terminateAudioFfmpeg, terminateVideoFfmpeg, uiState]);

  const handleProceed = useCallback(async () => {
    if (!activeSelection) return;

    if (activeTab === 'quiz' && selectedWidths.length < 2) {
      const timeWindow = getTimeWindow();
      if (selectedWidths.length > 0 || timeWindow) {
        setErrorMessage('Select at least two output widths for quiz import.');
        setUiState('error');
        return;
      }
    }
    if (activeTab === 'quiz' && activeSelection.mediaKind === 'video' && !activeSelection.context.matchedQuiz) {
      setErrorMessage(formatQuizFolderMatchError(getFilesystemPathHints(activeSelection.context.file)));
      setUiState('error');
      return;
    }

    const timeWindow = getTimeWindow();
    const outputBaseName = outputBaseNameRef.current;
    const { context } = activeSelection;
    const importOriginalVideo = activeSelection.mediaKind === 'video'
      && !timeWindow
      && selectedWidths.length === 0;

    if (importOriginalVideo) {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setErrorMessage(null);
      setStatusMessage(null);
      setIsCancelling(false);
      revokeOutputPreview(outputPreview);
      setOutputPreview(null);

      logStage('ui', 'User confirmed import without processing', {
        fileName: context.file.name,
        fileSize: context.file.size,
        format: context.format,
        activeTab,
      });

      try {
        storeOutputPreview(context.file, false, 'video');
        await importPreparedOutputs(
          [{ blob: context.file, label: 'original' }],
          outputBaseName,
          false,
          controller.signal,
          importDestination,
          'video',
          activeSelection.mediaKind === 'video' ? activeSelection.context.matchedQuiz : undefined,
        );
        if (controller.signal.aborted) return;
        setUiState('done');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          logStage('ui', 'Import aborted by user');
          setProgress(null);
          setUiState('cancelled');
          cancelAckTimeoutRef.current = window.setTimeout(() => {
            resetToIdle();
          }, CANCEL_ACK_MS);
          return;
        }
        logError('ui', error, {
          fileName: context.file.name,
          fileSize: context.file.size,
          format: context.format,
        });
        const message = error instanceof Error ? error.message : 'Video import failed.';
        setErrorMessage(message);
        setUiState('error');
        setProgress(null);
      } finally {
        abortControllerRef.current = null;
        setIsCancelling(false);
      }
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setErrorMessage(null);
    setStatusMessage(null);
    setIsCancelling(false);
    revokeOutputPreview(outputPreview);
    setOutputPreview(null);
    setUiState('loading-ffmpeg');
    setProgress({
      stage: 'loading-ffmpeg',
      stageLabel: mediaKind === 'audio' ? 'Loading audio processor…' : 'Loading video processor…',
      ratio: 0,
    });

    logStage('ui', 'User confirmed processing', {
      fileName: context.file.name,
      fileSize: context.file.size,
      format: context.format,
      estimate: context.estimate,
      timeWindow,
      activeTab,
      mediaKind: activeSelection.mediaKind,
    });

    try {
      const result = activeSelection.mediaKind === 'audio'
        ? await processAudio(context.file, context.format, {
          signal: controller.signal,
          timeWindow,
          sourceDurationSeconds: context.probe.duration,
          onProgress: (nextProgress) => {
            if (controller.signal.aborted) return;
            setProgress(nextProgress);
            if (nextProgress.stage === 'loading-ffmpeg' && nextProgress.ratio < 1) {
              setUiState('loading-ffmpeg');
            } else {
              setUiState('processing');
            }
          },
          onOutputReady: (blob) => {
            storeOutputPreview(blob, false, 'audio');
          },
        })
        : await processVideo(context.file, context.format, {
          signal: controller.signal,
          timeWindow,
          sourceDurationSeconds: context.probe.duration,
          targetWidths: selectedWidths,
          onProgress: (nextProgress) => {
            if (controller.signal.aborted) return;
            setProgress(nextProgress);
            if (nextProgress.stage === 'loading-ffmpeg' && nextProgress.ratio < 1) {
              setUiState('loading-ffmpeg');
            } else {
              setUiState('processing');
            }
          },
          onOutputReady: (blob) => {
            storeOutputPreview(blob, false, 'video');
          },
        });

      if (controller.signal.aborted && !result.cancelled) return;

      revokeActiveProbe(activeSelection);
      if (activeSelection.mediaKind === 'video') {
        setActiveSelection((current) => (
          current?.mediaKind === 'video'
            ? { mediaKind: 'video', context: { ...current.context, probe: { ...current.context.probe, probeUrl: '' } } }
            : current
        ));
      } else {
        setActiveSelection((current) => (
          current?.mediaKind === 'audio'
            ? { mediaKind: 'audio', context: { ...current.context, probe: { ...current.context.probe, probeUrl: '' } } }
            : current
        ));
      }

      if (result.cancelled) {
        if (result.outputs.length > 0) {
          const previewOutput = result.outputs[result.outputs.length - 1];
          storeOutputPreview(previewOutput.blob, true, activeSelection.mediaKind);
          setIsCancelling(false);
          await importPreparedOutputs(
            result.outputs,
            outputBaseNameRef.current,
            true,
            controller.signal,
            importDestination,
            activeSelection.mediaKind,
            activeSelection.mediaKind === 'video' ? activeSelection.context.matchedQuiz : undefined,
          );
          if (controller.signal.aborted) return;
          setUiState('done');
        } else {
          const stage = result.cancelledDuringStage;
          const stageMessage = stage === 'normalizing' || stage === 'resizing'
            ? 'Processing cancelled during conversion before any output was ready.'
            : 'Processing cancelled before any output was ready.';
          setStatusMessage(stageMessage);
          setProgress(null);
          setUiState('cancelled');
          cancelAckTimeoutRef.current = window.setTimeout(() => {
            resetToIdle();
          }, CANCEL_ACK_MS);
        }
        return;
      }

      if (result.outputs.length === 0) {
        throw new Error(`No prepared ${activeSelection.mediaKind} was produced.`);
      }

      const previewOutput = result.outputs[result.outputs.length - 1];
      storeOutputPreview(previewOutput.blob, false, activeSelection.mediaKind);

      await importPreparedOutputs(
        result.outputs,
        outputBaseName,
        false,
        controller.signal,
        importDestination,
        activeSelection.mediaKind,
        activeSelection.mediaKind === 'video' ? activeSelection.context.matchedQuiz : undefined,
      );
      if (controller.signal.aborted) return;

      setUiState('done');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        logStage('ui', 'Processing or import aborted by user');
        setProgress(null);
        setUiState('cancelled');
        cancelAckTimeoutRef.current = window.setTimeout(() => {
          resetToIdle();
        }, CANCEL_ACK_MS);
        return;
      }
      logError('ui', error, {
        fileName: context.file.name,
        fileSize: context.file.size,
        format: context.format,
        progress,
      });
      const message = error instanceof Error ? error.message : `${activeSelection.mediaKind} processing failed.`;
      const mobileHint = /memory|oom|out of memory/i.test(message)
        ? ' Try a smaller file or use a desktop browser.'
        : '';
      setErrorMessage(`${message}${mobileHint}`);
      setUiState('error');
      setProgress(null);
    } finally {
      abortControllerRef.current = null;
      setIsCancelling(false);
    }
  }, [
    activeSelection,
    activeTab,
    getTimeWindow,
    importDestination,
    importPreparedOutputs,
    mediaKind,
    outputPreview,
    processAudio,
    processVideo,
    progress,
    resetToIdle,
    revokeActiveProbe,
    revokeOutputPreview,
    selectedWidths,
    storeOutputPreview,
  ]);

  const isBusy = uiState === 'probing' || uiState === 'loading-ffmpeg' || uiState === 'processing' || uiState === 'importing';

  const tabSubtitle = activeTab === 'tutorial'
    ? 'Pick an audio file, trim it, and import it into tutorials as MP3 chunks.'
    : activeTab === 'course'
      ? 'Pick a video, optionally trim or resize it, and import it into courses.'
      : 'Pick a video, optionally trim or resize it, and import it into an existing quiz that matches the video\'s folder name.';

  const dropLabel = mediaKind === 'audio'
    ? 'Drag and drop an audio file here, or click to browse'
    : activeTab === 'quiz'
      ? 'Select the folder on your computer that contains the video you want to process'
      : 'Drag and drop a video here, or click to browse';

  const tabs = (
    <MediaPrepperTabs activeTab={activeTab} onSelect={handleTabSelect} />
  );

  return (
    <Container className={styles['container']}>
      <div className={styles['headerRow']}>
        <div>
          <h1 className={styles['title']}>Media Prepper</h1>
          <p className={styles['subtitle']}>{tabSubtitle}</p>
        </div>
        <div className={styles['headerActions']}>
          <MediaScreenSwitcher />
        </div>
      </div>

      {tabs}

      {(uiState === 'idle' || uiState === 'probing' || uiState === 'error' || uiState === 'cancelled') && (
        <div
          className={`${styles['dropZone']} ${dragActive ? styles['dropZoneActive'] : ''}`}
          onClick={() => {
            if (activeTab === 'quiz') {
              void pickQuizFolder();
              return;
            }
            fileInputRef.current?.click();
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (activeTab === 'quiz') {
                void pickQuizFolder();
                return;
              }
              fileInputRef.current?.click();
            }
          }}
        >
          <div className={styles['dropZoneIcon']} aria-hidden>{mediaKind === 'audio' ? '🎧' : '🎬'}</div>
          <p className="mb-1">{dropLabel}</p>
          <p className="text-muted mb-0">{getDropZoneHint(activeTab)}</p>
          <input
            ref={fileInputRef}
            className={styles['hiddenInput']}
            type="file"
            accept={getAcceptedFileTypes(activeTab)}
            {...(activeTab === 'quiz'
              ? ({
                webkitdirectory: '',
                directory: '',
                multiple: true,
              } as React.InputHTMLAttributes<HTMLInputElement>)
              : {})}
            onChange={onInputChange}
          />
        </div>
      )}

      {activeTab === 'quiz' && quizVideoCandidates.length > 1 && uiState === 'idle' && (
        <Card className={styles['summaryCard']}>
          <Card.Body>
            <Card.Title>Select a video</Card.Title>
            <p className="text-muted small mb-3">
              Multiple videos were found in the selected folder. Pick the one you want to process.
            </p>
            <ListGroup className="mb-3">
              {quizVideoCandidates.map((candidate) => (
                <ListGroup.Item
                  key={`${candidate.relativePath}-${candidate.file.lastModified}`}
                  action
                  onClick={() => {
                    setQuizVideoCandidates([]);
                    void handleSelectedFile(candidate.file, candidate.folderKey);
                  }}
                >
                  <strong>{candidate.relativePath}</strong>
                  <span className="text-muted ms-2">({formatFileSize(candidate.file.size)})</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
            <Button variant="outline-secondary" size="sm" onClick={() => setQuizVideoCandidates([])}>
              Choose a different folder
            </Button>
          </Card.Body>
        </Card>
      )}

      {uiState === 'probing' && (
        <div className={`${styles['message']} d-flex align-items-center gap-2`}>
          <Spinner animation="border" size="sm" />
          <span>Reading {mediaKind} metadata…</span>
        </div>
      )}

      {statusMessage && (
        <Alert variant="info" className={styles['message']}>
          {isCancelling && (
            <Spinner animation="border" size="sm" className="me-2" />
          )}
          {statusMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="danger" className={styles['message']}>
          {errorMessage}
          <div className="mt-2">
            <Button variant="outline-danger" size="sm" onClick={resetToIdle}>
              Try again
            </Button>
          </div>
        </Alert>
      )}

      {activeSelection && uiState === 'awaiting-confirmation' && (
        <Card className={styles['summaryCard']}>
          <Card.Body>
            <Card.Title>Review before processing</Card.Title>
            <ListGroup variant="flush" className="mb-3">
              <ListGroup.Item>
                <strong>File:</strong> {activeSelection.context.file.name} ({formatFileSize(activeSelection.context.file.size)})
              </ListGroup.Item>
              {activeSelection.mediaKind === 'video' && (
                <ListGroup.Item>
                  <strong>Resolution:</strong> {activeSelection.context.probe.width} × {activeSelection.context.probe.height}
                </ListGroup.Item>
              )}
              <ListGroup.Item>
                <strong>Duration:</strong>{' '}
                {activeSelection.context.probe.duration > 0
                  ? `${Math.round(activeSelection.context.probe.duration)}s`
                  : 'Unknown'}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Format:</strong> {activeSelection.context.format.detectedFormat} → {activeSelection.context.format.targetFormat}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Download cost:</strong> {activeSelection.context.estimate.downloadCost}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Estimated time:</strong> {activeSelection.context.estimate.estimatedTimeLabel}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Import destination:</strong> {getImportDestinationLabelForTab(activeTab)}
              </ListGroup.Item>
              {activeTab === 'quiz' && activeSelection.mediaKind === 'video' && activeSelection.context.matchedQuiz && (
                <ListGroup.Item>
                  <strong>Matched quiz:</strong> {activeSelection.context.matchedQuiz.title}
                </ListGroup.Item>
              )}
            </ListGroup>

            {activeSelection.context.probe.duration > 0 && activeSelection.context.probe.probeUrl && (
              <div className={styles['trimSection']}>
                <strong className="d-block mb-2">Select time window</strong>
                <p className="text-muted small mb-2">
                  Choose the start and end times to include in the prepared {mediaKind}.
                </p>
                {activeSelection.mediaKind === 'audio' ? (
                  <MediaPrepperAudioPreview
                    src={activeSelection.context.probe.probeUrl}
                    seekToSeconds={trimStart}
                  />
                ) : (
                  <AspectRatioVideoPreview
                    src={activeSelection.context.probe.probeUrl}
                    videoWidth={activeSelection.context.probe.width}
                    videoHeight={activeSelection.context.probe.height}
                    videoRef={previewVideoRef}
                  />
                )}
                <div className={styles['trimControls']}>
                  <Form.Group>
                    <Form.Label>
                      Start: {formatTimestamp(trimStart)}
                    </Form.Label>
                    <Form.Range
                      min={0}
                      max={activeSelection.context.probe.duration}
                      step={0.1}
                      value={trimStart}
                      onChange={(event) => handleTrimStartChange(Number(event.target.value))}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>
                      End: {formatTimestamp(trimEnd)}
                    </Form.Label>
                    <Form.Range
                      min={0}
                      max={activeSelection.context.probe.duration}
                      step={0.1}
                      value={trimEnd}
                      onChange={(event) => handleTrimEndChange(Number(event.target.value))}
                    />
                  </Form.Group>
                  <div className={styles['trimSummary']}>
                    Selected segment: {formatTimestamp(trimStart)} – {formatTimestamp(trimEnd)}
                    {' '}
                    ({formatTimestamp(Math.max(0, trimEnd - trimStart))})
                  </div>
                </div>
              </div>
            )}

            {activeTab !== 'tutorial' && (
              <div className="mb-3">
                <strong>Output widths (optional)</strong>
                <p className="text-muted small mb-2">
                  {activeTab === 'course'
                    ? 'Leave unselected to keep the original resolution. Select one width to resize before import.'
                    : 'Select two or more widths to add one course banner per size to the matched quiz. Leave unselected to import at original resolution.'}
                </p>
                <div className="d-flex flex-wrap gap-3">
                  {VIDEO_WIDTH_OPTIONS.map((width) => (
                    <Form.Check
                      key={width}
                      type="checkbox"
                      id={`width-${width}`}
                      label={`${width}px`}
                      checked={selectedWidths.includes(width)}
                      onChange={() => toggleSelectedWidth(width)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mb-3">
              <strong>Planned operations</strong>
              <ul className={styles['summaryList']}>
                {activeSelection.context.estimate.operations.map((operation) => (
                  <li key={operation}>{operation}</li>
                ))}
              </ul>
            </div>

            {activeSelection.context.file.size >= LARGE_FILE_WARNING_BYTES && (
              <Alert variant="warning">
                This file is large for in-browser processing and may take a long time or fail.
              </Alert>
            )}

            {activeSelection.context.estimate.riskNote && (
              <Alert variant="warning">{activeSelection.context.estimate.riskNote}</Alert>
            )}

            <div className={styles['actionRow']}>
              <Button variant="primary" onClick={() => void handleProceed()}>
                Proceed
              </Button>
              <Button variant="outline-primary" onClick={handleRecalculateEstimate}>
                Recalculate estimate
              </Button>
              <Button variant="outline-secondary" onClick={() => void handleCancel()}>
                Cancel
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {(uiState === 'loading-ffmpeg' || uiState === 'processing' || uiState === 'importing') && (
        <Card className={styles['progressPanel']}>
          <Card.Body>
            {isCancelling ? (
              <>
                <div className={styles['stageLabel']}>Saving your progress…</div>
                <Alert variant="info" className={styles['cancelNotice']}>
                  <div className="d-flex align-items-start gap-2">
                    <Spinner animation="border" size="sm" className="mt-1 flex-shrink-0" />
                    <div>
                      <strong className="d-block mb-1">Preparing import</strong>
                      <span className="small">
                        {getCancellingDetailMessage(
                          progress?.stage,
                          Math.round((progress?.ratio ?? 0) * 100),
                          mediaKind,
                        )}
                      </span>
                    </div>
                  </div>
                </Alert>
                <ProgressBar
                  now={Math.round((progress?.ratio ?? 0) * 100)}
                  label={`${Math.round((progress?.ratio ?? 0) * 100)}%`}
                  striped
                  animated
                  variant="info"
                />
              </>
            ) : (
              <>
                <div className={styles['stageLabel']}>
                  {progress?.stageLabel ?? (uiState === 'importing' ? `Importing ${mediaKind}…` : `Processing ${mediaKind}…`)}
                </div>
                <ProgressBar
                  now={Math.round((progress?.ratio ?? 0) * 100)}
                  label={`${Math.round((progress?.ratio ?? 0) * 100)}%`}
                  striped
                  animated
                />
                <p className="text-muted small mt-2 mb-0">
                  {uiState === 'importing'
                    ? `The prepared ${mediaKind} is being segmented and added to your ${getDestinationNoun(importDestination, 2)}.`
                    : `The prepared ${mediaKind} will be imported automatically into ${getDestinationNoun(importDestination, 2)} when processing finishes.`}
                </p>
              </>
            )}
            <div className={`${styles['actionRow']} mt-3`}>
              <Button
                variant="outline-danger"
                onClick={() => void handleCancel()}
                disabled={!isBusy || isCancelling}
              >
                {isCancelling ? 'Saving progress…' : 'Cancel'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {uiState === 'done' && outputPreview && (
        <div className="mt-4">
          {outputPreview.partial && (
            <Alert variant="warning" className={styles['message']}>
              Processing was stopped early. This preview may cover only part of the selected segment.
            </Alert>
          )}
          <h2 className="h4 mb-3">Prepared {outputPreview.mediaKind}</h2>
          <Alert variant="success" className={styles['message']}>
            This {outputPreview.mediaKind} has been imported into your {getDestinationNoun(importDestination, 2)}.
          </Alert>
          <Card>
            <Card.Body>
              <div className={styles['outputMeta']}>
                <span>
                  {outputBaseNameRef.current}_prepared.{outputPreview.mediaKind === 'audio' ? 'mp3' : 'mp4'}
                </span>
                <span>{formatFileSize(outputPreview.sizeBytes)}</span>
              </div>
              {outputPreview.mediaKind === 'audio' ? (
                <MediaPrepperAudioPreview src={outputPreview.blobUrl} />
              ) : (
                <AspectRatioVideoPreview
                  src={outputPreview.blobUrl}
                  videoWidth={activeSelection?.mediaKind === 'video' ? activeSelection.context.probe.width : 0}
                  videoHeight={activeSelection?.mediaKind === 'video' ? activeSelection.context.probe.height : 0}
                />
              )}
            </Card.Body>
          </Card>
          <div className={styles['footerActions']}>
            <Button variant="secondary" onClick={resetToIdle}>
              Process another {mediaKind}
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
};

export default MediaPrepper;
