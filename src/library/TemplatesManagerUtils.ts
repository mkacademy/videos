import { incrementID } from "../utils";
import {
  Banner as TutorialBanner,
  Content as TutorialContent,
} from "../store/slices/tutorialSlice";
import {
  Banner as CourseBanner,
  Pennant,
  SlideGroup,
  SlideGroupItem,
  SlideItem,
} from "../store/slices/courseSlice";
import { Quiz } from "../store/slices/quizSlice";
import { CourseTrees, QuizTrees, TutorialTrees } from "./controlPanelUtils";
import { flushCourseTrees, flushQuizTrees, flushTutorialTrees } from "./controlPanelUtilz";
import { Metadata } from "../components/Core/types";
import type { Handler } from "../store/slices/errorSlice";
import {
  dataUrlByteLength,
  dataUrlToBlob,
  formatBannerCharacterQuote,
  formatBannerQuote,
  formatContentDescription,
  formatSizeLabel,
  formatVideoBannerQuote,
  formatVideoChunkContent,
  formatBase64SplitContent,
  isImageFileName,
  isMp4File,
  isMp4FileName,
  isMp3File,
  isMp3FileName,
  isUnicodeTextContent,
  MAX_IMAGE_BYTES,
  parseVideoChunkSequence,
  joinSplitPayloadRows,
  validateTutorialContentRows,
  resolveExportFileName,
  resolveTextExportFileName,
  resolveVideoExportFileName,
  resolveAudioExportFileName,
  sanitizePathSegment,
  splitBase64IntoEvenChunks,
  wrapBase64PayloadAsDataUrl,
  splitTextIntoChunks,
  END_OF_FILE_MARKER,
  TEXT_CHUNK_SIZE,
  MAX_VIDEO_BASE64_BYTES,
  uniqueFileName,
  areFmp4VideoChunks,
  extractFmp4InitPayloadFromRows,
  FMP4_INIT_CONTENT_LABEL,
  FMP4_MEDIA_MIME,
  VIDEO_MP4_MIME,
  writeBlobToHandle,
  writeBase64ChunksToHandle,
} from "./directoryTreeUtils";
import { imageFileToDataUrl } from "./imageCompression";
import { probeVideoFileForImport, probeAudioFileForImport } from "./ffmpegVideoProbe";
import { VideoSegmentImporter, type VideoImportSegment, type VideoSegmentImportProgress } from "./videoSegmentImport";
import {
  buildPlaylistFromTutorialVideoGroup,
  getPlaylistFmp4InitPayload,
  groupTutorialVideoBannerEntries,
  joinChunkPartPayloads,
  validateCourseVideoPennants,
  validateTutorialVideoChunkBanners,
} from "./videoChunkPlayback";
import { withTruncatedSaveTitle } from "./DeletionManagerUtils";

const handleFromTitle = ({ id, title }: { id: number; title: string }): Handler => ({
  id,
  keyword: title,
});

/** Mirrors {@link CpanelFormatter} tutorial `handlesFilters`. */
export const buildTutorialHandles = (
  banners: TutorialBanner[],
): Record<string, Handler[]> => ({
  handlesFilters: banners.map(handleFromTitle),
});

/** Mirrors {@link CpanelFormatter} course `handlesSifters` / `handlesFilters`. */
export const buildCourseHandles = (
  banners: CourseBanner[],
): Record<string, Handler[]> => ({
  handlesSifters: banners.map(handleFromTitle),
  handlesFilters: banners.flatMap((banner) => (banner.pennants ?? []).map(handleFromTitle)),
});

/** Mirrors {@link CpanelFormatter} quiz `handlesDashboards` / `handlesSifters` / `handlesFilters`. */
export const buildQuizHandles = (
  quizzes: Quiz[],
  banners: CourseBanner[],
): Record<string, Handler[]> => ({
  handlesDashboards: quizzes.map(handleFromTitle),
  handlesSifters: banners.map(handleFromTitle),
  handlesFilters: banners.flatMap((banner) => (banner.pennants ?? []).map(handleFromTitle)),
});

/** Mirrors `tutorialPresetOptions` in ColFourteen.tsx */
const TUTORIAL_PRESET: Record<string, { count: number; steps: number }> = {
  "1_10": { count: 1, steps: 10 },
  "5_10": { count: 5, steps: 10 },
  "5_50": { count: 5, steps: 50 },
  "10_10": { count: 10, steps: 10 },
  "15_10": { count: 1, steps: 15 },
  "25_10": { count: 1, steps: 25 },
};

/** Mirrors `coursePresetOptions` in ColFourteen.tsx — middle = covers per course, last = slides per cover. */
const COURSE_PRESET: Record<string, { count: number; covers: number; slidesPerCover: number }> = {
  "1_10_4": { count: 1, covers: 10, slidesPerCover: 4 },
  "1_50_4": { count: 1, covers: 50, slidesPerCover: 4 },
  "5_10_4": { count: 5, covers: 10, slidesPerCover: 4 },
  "5_50_4": { count: 5, covers: 50, slidesPerCover: 4 },
  "10_10_4": { count: 10, covers: 10, slidesPerCover: 4 },
  "15_10_4": { count: 15, covers: 15, slidesPerCover: 4 },
  "25_10_4": { count: 25, covers: 25, slidesPerCover: 4 },
};

/** Mirrors `quizPresetOptions` — per quiz: `questions` course banners; each has `options` slideGroupItems and `reports` slides under one pennant. */
const QUIZ_PRESET: Record<string, { count: number; questions: number; options: number; reports: number }> = {
  "1_10_4_1": { count: 1, questions: 10, options: 2, reports: 1 },
  "5_10_4_1": { count: 5, questions: 10, options: 2, reports: 1 },
  "5_50_4_1": { count: 5, questions: 50, options: 2, reports: 1 },
  "10_10_4_1": { count: 10, questions: 10, options: 2, reports: 1 },
  "15_10_4_1": { count: 15, questions: 15, options: 2, reports: 1 },
  "25_10_4_1": { count: 25, questions: 25, options: 2, reports: 1 },
};

export const parseTutorialPreset = (preset: string): { count: number; steps: number } | null => {
  const spec = TUTORIAL_PRESET[preset];
  return spec ?? null;
};

export const parseCoursePreset = (preset: string): {
  count: number;
  covers: number;
  slidesPerCover: number;
} | null => {
  const spec = COURSE_PRESET[preset];
  return spec ?? null;
};

export const parseQuizPreset = (preset: string): {
  count: number;
  questions: number;
  options: number;
  reports: number;
} | null => {
  const spec = QUIZ_PRESET[preset];
  return spec ?? null;
};

/** Flush defaults attach metadata; preset materialization should leave `metadata` unset. */
const withoutMetadata = <T extends {
  owner: boolean;
  sender?: string;
  edited?: boolean;
  metadata?: Metadata;
  modified?: boolean;
  contiguousOrdinal?: number
}>(o: T): T => {
  const {
    contiguousOrdinal: _omitContiguousOrdinal,
    modified: _omitModified,
    metadata: _omitMetadata,
    edited: _omitEdited,
    sender: _omitSender,
    ...rest } = o;
  rest.owner = true;
  return rest as T;
};

const stripTutorialFlushMetadata = (
  banners: TutorialBanner[],
  content: TutorialContent[][]
): { banners: TutorialBanner[]; content: TutorialContent[][] } => ({
  banners: banners.map((banner) => withTruncatedSaveTitle(withoutMetadata(banner))),
  content: content.map((row) => row.map((item) => withTruncatedSaveTitle(withoutMetadata(item)))),
});

const stripSlideGroupMetadata = (group: SlideGroup): SlideGroup => {
  const next: SlideGroup = { slides: [] };
  for (const key of Object.keys(group)) {
    if (key === "slides") {
      next.slides = (group.slides ?? []).map((row) =>
        row.map((item) => withTruncatedSaveTitle(withoutMetadata(item))),
      );
    } else {
      const k = Number(key);
      if (!Number.isNaN(k) && typeof (group as Record<number, SlideGroupItem>)[k] === "object") {
        const item = (group as Record<number, SlideGroupItem>)[k];
        (next as Record<number, SlideGroupItem>)[k] = withTruncatedSaveTitle(withoutMetadata(item));
      }
    }
  }
  return next;
};

const stripCourseFlushMetadata = (
  banners: CourseBanner[],
  content: SlideGroup[]
): { banners: CourseBanner[]; content: SlideGroup[] } => ({
  banners: banners.map((banner) => withTruncatedSaveTitle({
    ...withoutMetadata(banner),
    pennants: (banner.pennants ?? []).map((pennant) => withTruncatedSaveTitle(withoutMetadata(pennant))),
  })),
  content: content.map(stripSlideGroupMetadata),
});

const stripQuizFlushMetadata = (
  quizzes: Quiz[],
  banners: CourseBanner[],
  content: SlideGroup[]
): { quizzes: Quiz[]; banners: CourseBanner[]; content: SlideGroup[] } => {
  const nested = stripCourseFlushMetadata(banners, content);
  return {
    quizzes: quizzes.map((quiz) => withTruncatedSaveTitle({
      ...withoutMetadata(quiz),
      pennants: (quiz.pennants ?? []).map((pennant) => withTruncatedSaveTitle(withoutMetadata(pennant))),
    })),
    banners: nested.banners,
    content: nested.content,
  };
};

/**
 * Builds tutorial tree ids with {@link incrementID}, then materializes rows via {@link flushTutorialTrees}
 * (same path as control panel middleware).
 */
const defaultTutorialBannerFields = {
  sender: '',
  owner: false ,  
  ordinal: 0,
  filterId: 0,
  bannerId: 0,
  sizeInBytes: 0,
  isDismissed: false,
  isHighlighted: false,
  status: 0,
  contiguousOrdinal: 0,
  descendentsSums: { instructions: 0 },
  modified: false,
  edited: false,
};

const defaultTutorialContentFields = {
  sender: '',
  owner: false ,
  ordinal: 0,
  imageurl: 'data:image',
  sizeInBytes: 0,
  isHighlighted: false,
  status: 0,
  contiguousOrdinal: 0,
  descendentsSums: {} ,
  isDismissed: false,
  modified: false,
  edited: false,
};

export type TutorialTreesFromDirectoryResult = {
  Trees: TutorialTrees;
  banners: TutorialBanner[];
  content: TutorialContent[][];
  handles: Record<string, Handler[]>;
  errors: string[];
  skipped: string[];
};

/**
 * Builds tutorial banners/content from a picked directory: the selected root and each subdirectory
 * with direct-child images becomes a banner; directories with no images are skipped.
 */
export const buildTutorialTreesFromDirectory = async (
  root: FileSystemDirectoryHandle,
): Promise<TutorialTreesFromDirectoryResult | null> => {
  const Trees: TutorialTrees = {};
  const banners: TutorialBanner[] = [];
  const content: TutorialContent[][] = [];
  const errors: string[] = [];
  const skipped: string[] = [];
  let bannerOrdinal = 0;

  const visitDir = async (
    handle: FileSystemDirectoryHandle,
    isRoot: boolean,
  ): Promise<void> => {
    const subdirs: FileSystemDirectoryHandle[] = [];
    const imageEntries: { name: string; file: File }[] = [];

    for await (const [name, entry] of handle.entries()) {
      if (entry.kind === 'directory') {
        subdirs.push(entry as FileSystemDirectoryHandle);
        continue;
      }

      if (!isImageFileName(name)) {
        if (isRoot) {
          skipped.push(`Skipped non-image at root: ${name}`);
        }
        continue;
      }

      const file = await (entry as FileSystemFileHandle).getFile();
      imageEntries.push({ name, file });
    }

    for (const subdir of subdirs) {
      await visitDir(subdir, false);
    }

    if (imageEntries.length === 0) return;

    const bannerId = incrementID();
    const contentIds: number[] = [];
    const contentRows: TutorialContent[] = [];
    let totalImageBytes = 0;
    let totalBase64Bytes = 0;

    for (let i = 0; i < imageEntries.length; i++) {
      const { name, file } = imageEntries[i];
      const { dataUrl: imageurl, preparedFile } = await imageFileToDataUrl(file);

      if (preparedFile.size >= MAX_IMAGE_BYTES) {
        errors.push(
          `Image too large (max 1 MB): ${name} (${formatSizeLabel(preparedFile.size)})`,
        );
        continue;
      }

      const contentId = incrementID();
      contentIds.push(contentId);
      totalImageBytes += preparedFile.size;

      const base64Bytes = dataUrlByteLength(imageurl);
      totalBase64Bytes += base64Bytes;
      contentRows.push(withoutMetadata({
        ...defaultTutorialContentFields,
        id: contentId,
        title: name,
        content: formatContentDescription(preparedFile.size, base64Bytes, preparedFile.lastModified),
        bannerId,
        imageurl,
        sizeInBytes: preparedFile.size,
        ordinal: contentRows.length,
      }));
    }

    if (contentRows.length === 0) return;

    Trees[bannerId] = contentIds;
    banners.push(withoutMetadata({
      ...defaultTutorialBannerFields,
      id: bannerId,
      title: handle.name,
      quote: formatBannerQuote(totalImageBytes, totalBase64Bytes),
      sizeInBytes: totalImageBytes,
      ordinal: bannerOrdinal++,
    }));
    content.push(contentRows);
  };

  try {
    await visitDir(root, true);
  } catch (error) {
    console.warn('Failed to build tutorial trees from directory:', error);
    return null;
  }

  const stripped = stripTutorialFlushMetadata(banners, content);
  return {
    Trees,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildTutorialHandles(stripped.banners),
    errors,
    skipped,
  };
};

export type TutorialTreesExportResult = {
  exportedBanners: number;
  exportedImages: number;
  errors: string[];
  skipped: string[];
};

/**
 * Writes highlighted tutorial banners as subdirectories and highlighted content rows as image files.
 */
export const exportTutorialTreesToDirectory = async (
  root: FileSystemDirectoryHandle,
  banners: TutorialBanner[],
  content: TutorialContent[][],
): Promise<TutorialTreesExportResult> => {
  const errors: string[] = [];
  const skipped: string[] = [];
  let exportedBanners = 0;
  let exportedImages = 0;

  const highlightedBanners = banners.filter(({ isHighlighted }) => isHighlighted);
  if (highlightedBanners.length === 0) {
    return { exportedBanners: 0, exportedImages: 0, errors, skipped };
  }

  const usedBannerDirs = new Set<string>();

  for (const banner of highlightedBanners) {
    const contentGroup = content.find((group) => group[0]?.bannerId === banner.id) ?? [];
    const highlightedContent = contentGroup.filter(({ isHighlighted }) => isHighlighted);

    if (highlightedContent.length === 0) {
      skipped.push(`Skipped banner "${banner.title}": no highlighted content with images`);
      continue;
    }

    const dirBase = uniqueFileName(sanitizePathSegment(banner.title), usedBannerDirs);
    let bannerDir: FileSystemDirectoryHandle;
    try {
      bannerDir = await root.getDirectoryHandle(dirBase, { create: true });
    } catch (error) {
      errors.push(`Failed to create directory for banner "${banner.title}": ${error}`);
      continue;
    }

    const usedFileNames = new Set<string>();
    let bannerImageCount = 0;

    for (const row of highlightedContent) {
      const blob = dataUrlToBlob(row.imageurl);
      if (!blob) {
        skipped.push(`Skipped "${row.title}" in "${banner.title}": no exportable image`);
        continue;
      }

      const fileName = uniqueFileName(
        resolveExportFileName(row.title, blob.type),
        usedFileNames,
      );

      try {
        await writeBlobToHandle(bannerDir, fileName, blob);
        bannerImageCount += 1;
        exportedImages += 1;
      } catch (error) {
        errors.push(`Failed to write "${fileName}" in "${banner.title}": ${error}`);
      }
    }

    if (bannerImageCount > 0) {
      exportedBanners += 1;
    } else {
      skipped.push(`Skipped banner "${banner.title}": no images written`);
    }
  }

  return { exportedBanners, exportedImages, errors, skipped };
};

export type TutorialTreesFromTextFolderResult = TutorialTreesFromDirectoryResult;

export type TutorialTreesTextExportResult = {
  exportedBanners: number;
  exportedFiles: number;
  errors: string[];
  skipped: string[];
};

const textChunksToContentRows = (
  chunks: string[],
  bannerId: number,
  fileName: string,
): TutorialContent[] => {
  const contentRows: TutorialContent[] = [];
  for (let i = 0; i < chunks.length; i += 2) {
    const imageurl = chunks[i] ?? '';
    const content = chunks[i + 1] ?? END_OF_FILE_MARKER;
    const contentId = incrementID();
    contentRows.push(withoutMetadata({
      ...defaultTutorialContentFields,
      id: contentId,
      title: `${fileName} #${contentRows.length + 1}`,
      imageurl,
      content,
      bannerId,
      sizeInBytes: new Blob([imageurl, content]).size,
      ordinal: contentRows.length,
    }));
  }
  return contentRows;
};

const contentRowsToText = (rows: readonly TutorialContent[]): string => {
  const sorted = [...rows].sort((a, b) => a.ordinal - b.ordinal);
  return sorted.map((row) => {
    const content = row.content === END_OF_FILE_MARKER ? '' : row.content;
    return row.imageurl + content;
  }).join('');
};

/**
 * Builds tutorial banners/content from a picked folder: each file with Unicode text contents
 * becomes one banner; contents are split into 500-character chunks across imageurl/content pairs.
 */
export const buildTutorialTreesFromTextFolder = async (
  root: FileSystemDirectoryHandle,
): Promise<TutorialTreesFromTextFolderResult | null> => {
  const Trees: TutorialTrees = {};
  const banners: TutorialBanner[] = [];
  const content: TutorialContent[][] = [];
  const errors: string[] = [];
  const skipped: string[] = [];
  let bannerOrdinal = 0;

  const collectFiles = async (
    handle: FileSystemDirectoryHandle,
    files: { name: string; file: File }[],
  ): Promise<void> => {
    for await (const [name, entry] of handle.entries()) {
      if (entry.kind === 'directory') {
        await collectFiles(entry as FileSystemDirectoryHandle, files);
        continue;
      }

      if (isImageFileName(name)) continue;

      const file = await (entry as FileSystemFileHandle).getFile();
      files.push({ name, file });
    }
  };

  const files: { name: string; file: File }[] = [];
  try {
    await collectFiles(root, files);
  } catch (error) {
    console.warn('Failed to collect files from folder:', error);
    return null;
  }

  for (const { name, file } of files) {
    let text: string;
    try {
      text = await file.text();
    } catch (error) {
      errors.push(`Failed to read file "${name}": ${error}`);
      continue;
    }

    if (!isUnicodeTextContent(text)) {
      errors.push(`"${name}" is not a Unicode text file`);
      continue;
    }

    const charCount = [...text].length;
    const chunks = splitTextIntoChunks(text, TEXT_CHUNK_SIZE);
    const contentRows = textChunksToContentRows(chunks, incrementID(), name);
    if (contentRows.length === 0) continue;

    const bannerId = contentRows[0].bannerId;
    Trees[bannerId] = contentRows.map((row) => row.id);
    banners.push(withoutMetadata({
      ...defaultTutorialBannerFields,
      id: bannerId,
      title: name,
      quote: formatBannerCharacterQuote(charCount),
      sizeInBytes: new Blob([text]).size,
      ordinal: bannerOrdinal++,
    }));
    content.push(contentRows);
  }

  const stripped = stripTutorialFlushMetadata(banners, content);
  return {
    Trees,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildTutorialHandles(stripped.banners),
    errors,
    skipped,
  };
};

/**
 * Writes highlighted tutorial banners as text files by joining imageurl/content chunk pairs per row.
 */
export const exportTutorialTreesToTextFolder = async (
  root: FileSystemDirectoryHandle,
  banners: TutorialBanner[],
  content: TutorialContent[][],
): Promise<TutorialTreesTextExportResult> => {
  const errors: string[] = [];
  const skipped: string[] = [];
  let exportedBanners = 0;
  let exportedFiles = 0;

  const highlightedBanners = banners.filter(({ isHighlighted }) => isHighlighted);
  if (highlightedBanners.length === 0) {
    return { exportedBanners: 0, exportedFiles: 0, errors, skipped };
  }

  const usedFileNames = new Set<string>();

  for (const banner of highlightedBanners) {
    const contentGroup = content.find((group) => group[0]?.bannerId === banner.id) ?? [];
    const highlightedContent = contentGroup.filter(({ isHighlighted }) => isHighlighted);

    if (highlightedContent.length === 0) {
      skipped.push(`Skipped banner "${banner.title}": no highlighted content rows`);
      continue;
    }

    const text = contentRowsToText(highlightedContent);
    const fileName = uniqueFileName(
      resolveTextExportFileName(banner.title),
      usedFileNames,
    );

    try {
      const blob = new Blob([text], { type: 'text/plain' });
      await writeBlobToHandle(root, fileName, blob);
      exportedBanners += 1;
      exportedFiles += 1;
    } catch (error) {
      errors.push(`Failed to write "${fileName}" for banner "${banner.title}": ${error}`);
    }
  }

  return { exportedBanners, exportedFiles, errors, skipped };
};

export type TutorialTreesFromVideoFolderResult = TutorialTreesFromDirectoryResult;

export type VideoFolderImportProgress = {
  current: number;
  total: number;
  fileName: string;
};

export type VideoFolderImportOptions = {
  onProgress?: (progress: VideoFolderImportProgress) => void;
  targetChunkBytes?: number;
};

export type TutorialTreesVideoExportResult = {
  exportedBanners: number;
  exportedFiles: number;
  errors: string[];
  skipped: string[];
};

const base64PayloadToTutorialContentRows = (
  base64Payload: string,
  bannerId: number,
  fileName: string,
  mime = VIDEO_MP4_MIME,
  fmp4InitPayload?: string,
): TutorialContent[] => {
  const rows: TutorialContent[] = [];
  const mediaMime = fmp4InitPayload ? FMP4_MEDIA_MIME : mime;
  if (fmp4InitPayload) {
    const imageurl = wrapBase64PayloadAsDataUrl(fmp4InitPayload, VIDEO_MP4_MIME);
    rows.push(withoutMetadata({
      ...defaultTutorialContentFields,
      id: incrementID(),
      title: fileName,
      content: FMP4_INIT_CONTENT_LABEL,
      imageurl,
      bannerId,
      sizeInBytes: new Blob([imageurl]).size,
      ordinal: -1,
    }));
  }

  const chunks = splitBase64IntoEvenChunks(base64Payload, MAX_VIDEO_BASE64_BYTES);
  const total = chunks.length;
  return rows.concat(chunks.map((chunk, i) => {
    const imageurl = wrapBase64PayloadAsDataUrl(chunk, mediaMime);
    return withoutMetadata({
      ...defaultTutorialContentFields,
      id: incrementID(),
      title: fileName,
      content: formatBase64SplitContent(i + 1, total),
      imageurl,
      bannerId,
      sizeInBytes: new Blob([imageurl]).size,
      ordinal: i,
    });
  }));
};

const contentRowsToBase64Payload = (
  rows: readonly TutorialContent[],
): { payload: string } | { error: string } => joinSplitPayloadRows(rows);

const buildTutorialBannersFromVideoSegments = (
  fileName: string,
  segments: readonly VideoImportSegment[],
  bannerOrdinal: number,
): {
  banners: TutorialBanner[];
  content: TutorialContent[][];
  trees: TutorialTrees;
  nextBannerOrdinal: number;
} => {
  const total = segments.length;
  const banners: TutorialBanner[] = [];
  const content: TutorialContent[][] = [];
  const trees: TutorialTrees = {};

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const chunkBannerId = incrementID();
    const contentRows = base64PayloadToTutorialContentRows(
      segment.base64Payload,
      chunkBannerId,
      fileName,
      segment.mimeType,
      segment.fmp4InitPayload,
    );

    trees[chunkBannerId] = contentRows.map((row) => row.id);
    banners.push(withoutMetadata({
      ...defaultTutorialBannerFields,
      id: chunkBannerId,
      title: fileName,
      quote: formatVideoChunkContent(
        i + 1,
        total,
        segment.startMs,
        segment.endMs,
        segment.base64Payload.length,
      ),
      sizeInBytes: segment.byteSize,
      ordinal: bannerOrdinal + i,
    }));
    content.push(contentRows);
  }

  return {
    banners,
    content,
    trees,
    nextBannerOrdinal: bannerOrdinal + total,
  };
};

export type PreparedVideoImportOptions = {
  onProgress?: (progress: VideoSegmentImportProgress) => void;
  signal?: AbortSignal;
};

/**
 * Builds a tutorial banner/content from a single prepared MP4 (e.g. video prepper output).
 * Segments the file into fMP4 chunks stored as base64 across content rows.
 */
export const buildTutorialTreesFromPreparedVideo = async (
  file: File,
  options?: PreparedVideoImportOptions,
): Promise<TutorialTreesFromDirectoryResult | null> => {
  const { onProgress, signal } = options ?? {};
  const errors: string[] = [];
  const skipped: string[] = [];
  const Trees: TutorialTrees = {};
  const banners: TutorialBanner[] = [];
  const content: TutorialContent[][] = [];
  const name = file.name;

  const importer = new VideoSegmentImporter();
  try {
    await importer.load(signal, onProgress);

    let probe;
    try {
      probe = await probeVideoFileForImport(file);
    } catch (error) {
      errors.push(`Failed to probe "${name}": ${error}`);
      return { Trees, banners, content, handles: {}, errors, skipped };
    }

    let segments;
    try {
      segments = await importer.segmentFile(file, probe.durationSeconds, signal, onProgress);
    } catch (error) {
      errors.push(`Failed to segment "${name}": ${error}`);
      return { Trees, banners, content, handles: {}, errors, skipped };
    }

    const built = buildTutorialBannersFromVideoSegments(name, segments, 0);
    if (built.banners.length === 0) {
      errors.push(`No tutorial banners produced for "${name}"`);
      return { Trees, banners, content, handles: {}, errors, skipped };
    }

    Object.assign(Trees, built.trees);
    banners.push(...built.banners);
    content.push(...built.content);

    const stripped = stripTutorialFlushMetadata(banners, content);
    return {
      Trees,
      banners: stripped.banners,
      content: stripped.content,
      handles: buildTutorialHandles(stripped.banners),
      errors,
      skipped,
    };
  } finally {
    importer.terminate();
  }
};

/**
 * Builds a tutorial banner/content from a single prepared MP3 (e.g. media prepper audio output).
 * Segments the file into MP3 chunks stored as base64 across content rows.
 */
export const buildTutorialTreesFromPreparedAudio = async (
  file: File,
  options?: PreparedVideoImportOptions,
): Promise<TutorialTreesFromDirectoryResult | null> => {
  const { onProgress, signal } = options ?? {};
  const errors: string[] = [];
  const skipped: string[] = [];
  const Trees: TutorialTrees = {};
  const banners: TutorialBanner[] = [];
  const content: TutorialContent[][] = [];
  const name = file.name;

  const importer = new VideoSegmentImporter();
  try {
    await importer.load(signal, onProgress);

    let probe;
    try {
      probe = await probeAudioFileForImport(file);
    } catch (error) {
      errors.push(`Failed to probe "${name}": ${error}`);
      return { Trees, banners, content, handles: {}, errors, skipped };
    }

    let segments;
    try {
      segments = await importer.segmentFile(file, probe.durationSeconds, signal, onProgress);
    } catch (error) {
      errors.push(`Failed to segment "${name}": ${error}`);
      return { Trees, banners, content, handles: {}, errors, skipped };
    }

    const built = buildTutorialBannersFromVideoSegments(name, segments, 0);
    if (built.banners.length === 0) {
      errors.push(`No tutorial banners produced for "${name}"`);
      return { Trees, banners, content, handles: {}, errors, skipped };
    }

    Object.assign(Trees, built.trees);
    banners.push(...built.banners);
    content.push(...built.content);

    const stripped = stripTutorialFlushMetadata(banners, content);
    return {
      Trees,
      banners: stripped.banners,
      content: stripped.content,
      handles: buildTutorialHandles(stripped.banners),
      errors,
      skipped,
    };
  } finally {
    importer.terminate();
  }
};

/**
 * Builds tutorial banners/content from a picked folder: each .mp4 file becomes one banner;
 * ffmpeg segments each file into fMP4 chunks stored as base64 across content rows.
 */
export const buildTutorialTreesFromVideoFolder = async (
  root: FileSystemDirectoryHandle,
  options?: VideoFolderImportOptions,
): Promise<TutorialTreesFromVideoFolderResult | null> => {
  const Trees: TutorialTrees = {};
  const banners: TutorialBanner[] = [];
  const content: TutorialContent[][] = [];
  const errors: string[] = [];
  const skipped: string[] = [];
  let bannerOrdinal = 0;

  const collectFiles = async (
    handle: FileSystemDirectoryHandle,
    files: { name: string; file: File }[],
  ): Promise<void> => {
    for await (const [name, entry] of handle.entries()) {
      if (entry.kind === 'directory') {
        await collectFiles(entry as FileSystemDirectoryHandle, files);
        continue;
      }

      const file = await (entry as FileSystemFileHandle).getFile();
      files.push({ name, file });
    }
  };

  const files: { name: string; file: File }[] = [];
  try {
    await collectFiles(root, files);
  } catch (error) {
    console.warn('Failed to collect files from video folder:', error);
    return null;
  }

  const mp4Candidates = files.flatMap(({ name, file }) => {
      if (!isMp4FileName(name)) {
        errors.push(`Skipped non-MP4 file: ${name}`);
        return [];
      }
      if (!isMp4File(file)) {
        errors.push(`"${name}" is not a valid MP4 file`);
        return [];
      }
      return [{ name, file }];
    });

  const importer = new VideoSegmentImporter();
  try {
    await importer.load();

    const total = mp4Candidates.length;
    for (let i = 0; i < mp4Candidates.length; i += 1) {
      const { name, file } = mp4Candidates[i];
      options?.onProgress?.({ current: i + 1, total, fileName: name });

      let probe;
      try {
        probe = await probeVideoFileForImport(file);
      } catch (error) {
        errors.push(`Failed to probe "${name}": ${error}`);
        continue;
      }

      let segments;
      try {
        segments = await importer.segmentFile(
          file,
          probe.durationSeconds,
          undefined,
          undefined,
          options?.targetChunkBytes,
        );
      } catch (error) {
        errors.push(`Failed to segment "${name}": ${error}`);
        continue;
      }

      const built = buildTutorialBannersFromVideoSegments(name, segments, bannerOrdinal);
      if (built.banners.length === 0) continue;

      Object.assign(Trees, built.trees);
      banners.push(...built.banners);
      content.push(...built.content);
      bannerOrdinal = built.nextBannerOrdinal;
    }
  } finally {
    importer.terminate();
  }

  const stripped = stripTutorialFlushMetadata(banners, content);
  return {
    Trees,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildTutorialHandles(stripped.banners),
    errors,
    skipped,
  };
};

/**
 * Writes highlighted tutorial banners as MP4 files by reassembling base64 chunks from content rows.
 */
export const exportTutorialTreesToVideoFolder = async (
  root: FileSystemDirectoryHandle,
  banners: TutorialBanner[],
  content: TutorialContent[][],
): Promise<TutorialTreesVideoExportResult> => {
  const errors: string[] = [];
  const skipped: string[] = [];
  let exportedBanners = 0;
  let exportedFiles = 0;

  const highlightedBanners = banners.filter(({ isHighlighted }) => isHighlighted);
  if (highlightedBanners.length === 0) {
    return { exportedBanners: 0, exportedFiles: 0, errors, skipped };
  }

  const usedFileNames = new Set<string>();
  const processedTitles = new Set<string>();

  for (const group of groupTutorialVideoBannerEntries(highlightedBanners, content)) {
    const title = group[0]?.banner.title;
    if (!title || processedTitles.has(title)) continue;
    processedTitles.add(title);

    const entries = group.map((entry) => {
      const highlightedContent = entry.contentRows.filter(({ isHighlighted }) => isHighlighted);
      return {
        banner: entry.banner,
        contentRows: highlightedContent.length > 0 ? highlightedContent : entry.contentRows,
      };
    });

    if (entries.some((entry) => entry.contentRows.length === 0)) {
      skipped.push(`Skipped "${title}": no highlighted content rows`);
      continue;
    }

    const chunkBanners = entries.map((entry) => entry.banner);
    if (!validateTutorialVideoChunkBanners(chunkBanners, entries.map((entry) => entry.contentRows)).valid) {
      errors.push(`Skipped "${title}": invalid chunk banner group`);
      continue;
    }

    const playlist = buildPlaylistFromTutorialVideoGroup(entries);
    if (playlist.error || playlist.chunks.length === 0) {
      errors.push(`Skipped "${title}": ${playlist.error ?? 'no playable chunks'}`);
      continue;
    }

    const segmentPayloads = playlist.chunks.map((chunk) => joinChunkPartPayloads(chunk.partPayloads));
    const initPayload = getPlaylistFmp4InitPayload(playlist.chunks);
    const fileName = uniqueFileName(
      resolveVideoExportFileName(title),
      usedFileNames,
    );

    try {
      if (!areFmp4VideoChunks(segmentPayloads, initPayload)) {
        errors.push(`Skipped "${title}": not fMP4 video chunks`);
        continue;
      }
      const importer = new VideoSegmentImporter();
      try {
        await importer.load();
        const blob = await importer.concatSegments(segmentPayloads, undefined, initPayload);
        await writeBlobToHandle(root, fileName, blob);
      } finally {
        importer.terminate();
      }
      exportedBanners += entries.length;
      exportedFiles += 1;
    } catch (error) {
      errors.push(`Failed to write "${fileName}" for "${title}": ${error}`);
    }
  }

  return { exportedBanners, exportedFiles, errors, skipped };
};

export type TutorialTreesFromAudioFolderResult = TutorialTreesFromDirectoryResult;

export type AudioFolderImportOptions = {
  targetChunkBytes?: number;
};

export type TutorialTreesAudioExportResult = {
  exportedBanners: number;
  exportedFiles: number;
  errors: string[];
  skipped: string[];
};

/**
 * Builds tutorial banners/content from a picked folder: each .mp3 file is segmented,
 * each segment is base64-encoded and split into ≤1 MiB storage rows.
 */
export const buildTutorialTreesFromAudioFolder = async (
  root: FileSystemDirectoryHandle,
  options?: AudioFolderImportOptions,
): Promise<TutorialTreesFromAudioFolderResult | null> => {
  const Trees: TutorialTrees = {};
  const banners: TutorialBanner[] = [];
  const content: TutorialContent[][] = [];
  const errors: string[] = [];
  const skipped: string[] = [];
  let bannerOrdinal = 0;

  const collectFiles = async (
    handle: FileSystemDirectoryHandle,
    files: { name: string; file: File }[],
  ): Promise<void> => {
    for await (const [name, entry] of handle.entries()) {
      if (entry.kind === 'directory') {
        await collectFiles(entry as FileSystemDirectoryHandle, files);
        continue;
      }

      const file = await (entry as FileSystemFileHandle).getFile();
      files.push({ name, file });
    }
  };

  const files: { name: string; file: File }[] = [];
  try {
    await collectFiles(root, files);
  } catch (error) {
    console.warn('Failed to collect files from audio folder:', error);
    return null;
  }

  const mp3Candidates = files.flatMap(({ name, file }) => {
    if (!isMp3FileName(name)) {
      errors.push(`Skipped non-MP3 file: ${name}`);
      return [];
    }
    if (!isMp3File(file)) {
      errors.push(`"${name}" is not a valid MP3 file`);
      return [];
    }
    return [{ name, file }];
  });

  const importer = new VideoSegmentImporter();
  try {
    await importer.load();

    for (const { name, file } of mp3Candidates) {
      let probe;
      try {
        probe = await probeAudioFileForImport(file);
      } catch (error) {
        errors.push(`Failed to probe "${name}": ${error}`);
        continue;
      }

      let segments;
      try {
        segments = await importer.segmentFile(
          file,
          probe.durationSeconds,
          undefined,
          undefined,
          options?.targetChunkBytes,
        );
      } catch (error) {
        errors.push(`Failed to segment "${name}": ${error}`);
        continue;
      }

      const built = buildTutorialBannersFromVideoSegments(name, segments, bannerOrdinal);
      if (built.banners.length === 0) continue;

      Object.assign(Trees, built.trees);
      banners.push(...built.banners);
      content.push(...built.content);
      bannerOrdinal = built.nextBannerOrdinal;
    }
  } finally {
    importer.terminate();
  }

  const stripped = stripTutorialFlushMetadata(banners, content);
  return {
    Trees,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildTutorialHandles(stripped.banners),
    errors,
    skipped,
  };
};

/**
 * Writes highlighted tutorial banners as MP3 files by reassembling base64 chunks from content rows.
 */
export const exportTutorialTreesToAudioFolder = async (
  root: FileSystemDirectoryHandle,
  banners: TutorialBanner[],
  content: TutorialContent[][],
): Promise<TutorialTreesAudioExportResult> => {
  const errors: string[] = [];
  const skipped: string[] = [];
  let exportedBanners = 0;
  let exportedFiles = 0;

  const highlightedBanners = banners.filter(({ isHighlighted }) => isHighlighted);
  if (highlightedBanners.length === 0) {
    return { exportedBanners: 0, exportedFiles: 0, errors, skipped };
  }

  const usedFileNames = new Set<string>();

  for (const banner of highlightedBanners) {
    const contentGroup = content.find((group) => group[0]?.bannerId === banner.id) ?? [];
    const highlightedContent = contentGroup.filter(({ isHighlighted }) => isHighlighted);

    if (highlightedContent.length === 0) {
      skipped.push(`Skipped banner "${banner.title}": no highlighted content rows`);
      continue;
    }

    const assembled = contentRowsToBase64Payload(
      highlightedContent.length > 0 ? highlightedContent : contentGroup,
    );
    if ('error' in assembled) {
      errors.push(`Skipped banner "${banner.title}": ${assembled.error}`);
      continue;
    }

    const fileName = uniqueFileName(
      resolveAudioExportFileName(banner.title),
      usedFileNames,
    );

    try {
      await writeBase64ChunksToHandle(root, fileName, [assembled.payload]);
      exportedBanners += 1;
      exportedFiles += 1;
    } catch (error) {
      errors.push(`Failed to write "${fileName}" for banner "${banner.title}": ${error}`);
    }
  }

  return { exportedBanners, exportedFiles, errors, skipped };
};

const defaultCourseBannerFields = {
  sender: '',
  owner: false ,
  ordinal: 0,
  sifterId: 0,
  bannerId: 0,
  sizeInBytes: 0,
  isDismissed: false,
  isHighlighted: false,
  status: 0,
  contiguousOrdinal: 0,
  descendentsSums: { instructions: 0, filters: 0 },
  pennants: [] as Pennant[],
  modified: false,
  edited: false,
};

const defaultPennantFields = {
  sender: '',
  owner: false ,
  ordinal: 0,
  filterId: 0,
  bannerId: 0,
  sizeInBytes: 0,
  isDismissed: false,
  isHighlighted: false,
  status: 0,
  contiguousOrdinal: 0,
  descendentsSums: { instructions: 0 },
  modified: false,
  edited: false,
};

const defaultCoverFields = {
  sender: '',
  owner: false ,
  ordinal: 0,
  imageurl: '',
  sizeInBytes: 0,
  isHighlighted: false,
  status: 0,
  contiguousOrdinal: 0,
  descendentsSums: {} ,
  isDismissed: false,
  modified: false,
  edited: false,
};

const defaultSlideFields = {
  sender: '',
  owner: false ,
  ordinal: 0,
  imageurl: '',
  sizeInBytes: 0,
  isHighlighted: false,
  status: 0,
  contiguousOrdinal: 0,
  descendentsSums: {} ,
  isDismissed: false,
  modified: false,
  edited: false,
};

export type CourseTreesFromMediaResult = {
  Trees: CourseTrees;
  banners: CourseBanner[];
  content: SlideGroup[];
  handles: Record<string, Handler[]>;
  errors: string[];
  skipped: string[];
};

const coverFromThumbnail = (
  coverId: number,
  bannerId: number,
  fileName: string,
  ordinal: number,
  thumbnailDataUrl?: string,
): SlideGroupItem => {
  const coverImageUrl = thumbnailDataUrl ?? '';
  let coverContent = '';
  let coverSizeBytes = 0;
  if (coverImageUrl) {
    const thumbBlob = dataUrlToBlob(coverImageUrl);
    coverSizeBytes = thumbBlob?.size ?? 0;
    coverContent = formatContentDescription(
      coverSizeBytes,
      dataUrlByteLength(coverImageUrl),
      Date.now(),
    );
  }

  return withoutMetadata({
    ...defaultCoverFields,
    id: coverId,
    bannerId,
    title: fileName,
    content: coverContent,
    imageurl: coverImageUrl,
    ordinal,
    sizeInBytes: coverSizeBytes,
  });
};

const segmentToSlideRows = (
  base64Payload: string,
  pennantId: number,
  fileName: string,
  mime = VIDEO_MP4_MIME,
  fmp4InitPayload?: string,
): SlideItem[] => {
  const rows: SlideItem[] = [];
  const mediaMime = fmp4InitPayload ? FMP4_MEDIA_MIME : mime;
  if (fmp4InitPayload) {
    const imageurl = wrapBase64PayloadAsDataUrl(fmp4InitPayload, VIDEO_MP4_MIME);
    rows.push(withoutMetadata({
      ...defaultSlideFields,
      id: incrementID(),
      title: fileName,
      content: FMP4_INIT_CONTENT_LABEL,
      imageurl,
      bannerId: pennantId,
      sizeInBytes: new Blob([imageurl]).size,
      ordinal: -1,
    }));
  }

  const chunks = splitBase64IntoEvenChunks(base64Payload, MAX_VIDEO_BASE64_BYTES);
  const total = chunks.length;
  return rows.concat(chunks.map((chunk, i) => {
    const imageurl = wrapBase64PayloadAsDataUrl(chunk, mediaMime);
    return withoutMetadata({
      ...defaultSlideFields,
      id: incrementID(),
      title: fileName,
      content: formatBase64SplitContent(i + 1, total),
      imageurl,
      bannerId: pennantId,
      sizeInBytes: new Blob([imageurl]).size,
      ordinal: i,
    });
  }));
};

const buildCourseFromVideoSegments = (
  bannerId: number,
  fileName: string,
  fileSize: number,
  probe: { durationSeconds: number; frameRate: number | null },
  segments: readonly VideoImportSegment[],
  bannerOrdinal: number,
): { banner: CourseBanner; slideGroup: SlideGroup } => {
  const totalTutorials = segments.length;
  const pennants: Pennant[] = [];
  const slideGroup: SlideGroup = { slides: [] };

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const pennantId = incrementID();
    const coverId = incrementID();
    const ordinal = i;
    const pennantTitle = formatNumberedMediaTitle(fileName, i + 1);

    pennants.push(withoutMetadata({
      ...defaultPennantFields,
      id: pennantId,
      bannerId,
      title: pennantTitle,
      quote: formatVideoChunkContent(
        i + 1,
        totalTutorials,
        segment.startMs,
        segment.endMs,
        segment.base64Payload.length,
      ),
      ordinal,
      sizeInBytes: segment.byteSize,
    }));

    slideGroup[ordinal] = coverFromThumbnail(
      coverId,
      bannerId,
      pennantTitle,
      ordinal,
      segment.thumbnailDataUrl,
    );

    slideGroup.slides.push(
      segmentToSlideRows(
        segment.base64Payload,
        pennantId,
        pennantTitle,
        segment.mimeType,
        segment.fmp4InitPayload,
      ),
    );
  }

  const dataUrlBytes = segments.reduce((sum, segment) => sum + segment.base64Payload.length, 0);
  const banner = withoutMetadata({
    ...defaultCourseBannerFields,
    id: bannerId,
    title: fileName,
    quote: formatVideoBannerQuote(fileSize, dataUrlBytes, probe),
    pennants,
    sizeInBytes: fileSize,
    ordinal: bannerOrdinal,
  });

  return { banner, slideGroup };
};

const slidesToBase64Payload = (
  slides: readonly SlideItem[],
): { payload: string } | { error: string } => joinSplitPayloadRows(slides);

const findSlideRowForPennant = (
  slideGroup: SlideGroup,
  pennantId: number,
): SlideItem[] | null => {
  for (const row of slideGroup.slides ?? []) {
    if (row.length > 0 && row[0].bannerId === pennantId) {
      return row;
    }
  }
  return null;
};

export const isVideoCourseContent = (
  banner: CourseBanner,
  slideGroup: SlideGroup,
): boolean => validateCourseVideoPennants(banner, slideGroup).valid;

export const isVideoTutorialChunkBanner = (
  banner: TutorialBanner,
  contentRows: readonly TutorialContent[],
): boolean => {
  if (parseVideoChunkSequence(banner.quote) === null) return false;
  if (contentRows.length === 0) return false;
  return contentRows.every((row) => row.bannerId === banner.id)
    && validateTutorialContentRows(contentRows).valid;
};

const defaultQuizEntityFields = {
  sender: '',
  owner: false ,
  ordinal: 0,
  dashboardId: 0,
  bannerId: 0,
  sizeInBytes: 0,
  isDismissed: false,
  isHighlighted: false,
  status: 0,
  contiguousOrdinal: 0,
  descendentsSums: { sifters: 0, filters: 0 },
  pennants: [] as Quiz['pennants'],
  modified: false,
  edited: false,
};

type CollectedGroupedMediaFile = {
  groupKey: string;
  name: string;
  file: File;
};

const MAX_NUMBERED_MEDIA_TITLE_LENGTH = 50;

/** `{fileName}-{index}` with the filename truncated so the full title is <= 50 chars. */
const formatNumberedMediaTitle = (fileName: string, index: number): string => {
  const suffix = `-${index}`;
  const maxBaseLength = Math.max(
    0,
    MAX_NUMBERED_MEDIA_TITLE_LENGTH - suffix.length,
  );
  const base = fileName.length > maxBaseLength ? fileName.slice(0, maxBaseLength) : fileName;
  return `${base}${suffix}`;
};

const collectGroupedMediaFiles = async (
  handle: FileSystemDirectoryHandle,
  parentDirName: string | null,
  rootFolderName: string,
  files: CollectedGroupedMediaFile[],
): Promise<void> => {
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === 'directory') {
      await collectGroupedMediaFiles(entry as FileSystemDirectoryHandle, name, rootFolderName, files);
      continue;
    }
    const file = await (entry as FileSystemFileHandle).getFile();
    const groupKey = parentDirName ?? rootFolderName;
    files.push({ groupKey, name, file });
  }
};

const buildCourseTreeEntryFromSlideGroup = (
  banner: CourseBanner,
  slideGroup: SlideGroup,
): CourseTrees[number] => {
  const covers = Object.keys(slideGroup)
    .filter((key) => key !== 'slides' && !Number.isNaN(Number(key)))
    .map((key) => (slideGroup[Number(key)] as SlideGroupItem).id);

  return {
    slideGroupItems: covers,
    ...Object.fromEntries(
      (banner.pennants ?? []).map((pennant) => [
        pennant.id,
        findSlideRowForPennant(slideGroup, pennant.id)?.map((s) => s.id) ?? [],
      ]),
    ),
  } as CourseTrees[number];
};

export type QuizTreesFromMediaResult = {
  Trees: QuizTrees;
  quizzes: Quiz[];
  banners: CourseBanner[];
  content: SlideGroup[];
  handles: Record<string, Handler[]>;
  errors: string[];
  skipped: string[];
};

export type QuizTreesVideoExportResult = {
  exportedQuizzes: number;
  exportedBanners: number;
  exportedFiles: number;
  errors: string[];
  skipped: string[];
};

const importCourseBannerFromAudioFile = async (
  importer: VideoSegmentImporter,
  name: string,
  file: File,
  quizId: number,
  bannerOrdinal: number,
  questionBanners: CourseTrees,
  banners: CourseBanner[],
  content: SlideGroup[],
  errors: string[],
  targetChunkBytes?: number,
): Promise<boolean> => {
  if (!isMp3FileName(name)) {
    errors.push(`Skipped non-MP3 file: ${name}`);
    return false;
  }
  if (!isMp3File(file)) {
    errors.push(`"${name}" is not a valid MP3 file`);
    return false;
  }

  let probe;
  try {
    probe = await probeAudioFileForImport(file);
  } catch (error) {
    errors.push(`Failed to probe "${name}": ${error}`);
    return false;
  }

  let segments;
  try {
    segments = await importer.segmentFile(
      file,
      probe.durationSeconds,
      undefined,
      undefined,
      targetChunkBytes,
    );
  } catch (error) {
    errors.push(`Failed to segment "${name}": ${error}`);
    return false;
  }

  if (segments.length === 0) return false;

  const bannerId = incrementID();
  const { banner, slideGroup } = buildCourseFromVideoSegments(
    bannerId,
    name,
    file.size,
    probe,
    segments,
    bannerOrdinal,
  );
  banner.bannerId = quizId;

  questionBanners[bannerId] = buildCourseTreeEntryFromSlideGroup(banner, slideGroup);
  banners.push(banner);
  content.push(slideGroup);
  return true;
};

const importCourseBannerFromVideoFile = async (
  importer: VideoSegmentImporter,
  name: string,
  file: File,
  quizId: number,
  bannerOrdinal: number,
  questionBanners: CourseTrees,
  banners: CourseBanner[],
  content: SlideGroup[],
  errors: string[],
  targetChunkBytes?: number,
): Promise<boolean> => {
  if (!isMp4FileName(name)) {
    errors.push(`Skipped non-MP4 file: ${name}`);
    return false;
  }
  if (!isMp4File(file)) {
    errors.push(`"${name}" is not a valid MP4 file`);
    return false;
  }

  let probe;
  try {
    probe = await probeVideoFileForImport(file);
  } catch (error) {
    errors.push(`Failed to probe "${name}": ${error}`);
    return false;
  }

  let segments;
  try {
    segments = await importer.segmentFile(
      file,
      probe.durationSeconds,
      undefined,
      undefined,
      targetChunkBytes,
    );
  } catch (error) {
    errors.push(`Failed to segment "${name}": ${error}`);
    return false;
  }

  if (segments.length === 0) return false;

  const bannerId = incrementID();
  const { banner, slideGroup } = buildCourseFromVideoSegments(
    bannerId,
    name,
    file.size,
    probe,
    segments,
    bannerOrdinal,
  );
  banner.bannerId = quizId;

  questionBanners[bannerId] = buildCourseTreeEntryFromSlideGroup(banner, slideGroup);
  banners.push(banner);
  content.push(slideGroup);
  return true;
};

/**
 * Builds quiz entities from a picked folder: MP4s in the same subdirectory become course banners
 * under one quiz (title = subdirectory name, or the picked folder name for root-level files).
 */
export const buildQuizTreesFromVideoFolder = async (
  root: FileSystemDirectoryHandle,
  options?: VideoFolderImportOptions,
): Promise<QuizTreesFromMediaResult | null> => {
  const Trees: QuizTrees = {};
  const quizzes: Quiz[] = [];
  const banners: CourseBanner[] = [];
  const content: SlideGroup[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  const collected: CollectedGroupedMediaFile[] = [];
  try {
    await collectGroupedMediaFiles(root, null, root.name, collected);
  } catch (error) {
    console.warn('Failed to collect files from video folder:', error);
    return null;
  }

  const mp4Candidates = collected.filter(({ name }) => isMp4FileName(name));
  if (mp4Candidates.length === 0) {
    return {
      Trees,
      quizzes,
      banners,
      content,
      handles: {},
      errors: ['No MP4 files found in the selected folder'],
      skipped,
    };
  }

  const groups = new Map<string, CollectedGroupedMediaFile[]>();
  for (const item of mp4Candidates) {
    const list = groups.get(item.groupKey) ?? [];
    list.push(item);
    groups.set(item.groupKey, list);
  }

  const importer = new VideoSegmentImporter();
  try {
    await importer.load();

    let processed = 0;
    const total = mp4Candidates.length;
    let quizOrdinal = 0;

    for (const [groupKey, groupFiles] of groups) {
      const quizId = incrementID();
      const questionBanners: CourseTrees = {};
      let bannerOrdinal = 0;
      let importedInGroup = 0;

      for (const { name, file } of groupFiles) {
        processed += 1;
        options?.onProgress?.({ current: processed, total, fileName: name });

        const imported = await importCourseBannerFromVideoFile(
          importer,
          name,
          file,
          quizId,
          bannerOrdinal,
          questionBanners,
          banners,
          content,
          errors,
          options?.targetChunkBytes,
        );
        if (imported) {
          bannerOrdinal += 1;
          importedInGroup += 1;
        }
      }

      if (importedInGroup === 0) {
        skipped.push(`Skipped quiz group "${groupKey}": no valid MP4 files imported`);
        continue;
      }

      Trees[quizId] = { banners: questionBanners };
      quizzes.push(withoutMetadata({
        ...defaultQuizEntityFields,
        id: quizId,
        title: groupKey,
        quote: `${importedInGroup} video${importedInGroup === 1 ? '' : 's'}`,
        ordinal: quizOrdinal++,
      }));
    }
  } finally {
    importer.terminate();
  }

  const stripped = stripQuizFlushMetadata(quizzes, banners, content);
  return {
    Trees,
    quizzes: stripped.quizzes,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildQuizHandles(stripped.quizzes, stripped.banners),
    errors,
    skipped,
  };
};

/**
 * Adds course banners from multiple prepared MP4 outputs (e.g. video prepper multi-size exports)
 * into an existing quiz. Each file becomes one course banner inside the quiz.
 */
export const buildQuizTreesFromPreparedVideos = async (
  files: readonly File[],
  existingQuizId: number,
  startingBannerOrdinal: number,
  options?: PreparedVideoImportOptions,
): Promise<QuizTreesFromMediaResult | null> => {
  const { onProgress, signal } = options ?? {};
  const Trees: QuizTrees = {};
  const quizzes: Quiz[] = [];
  const banners: CourseBanner[] = [];
  const content: SlideGroup[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  if (files.length === 0) {
    return {
      Trees,
      quizzes,
      banners,
      content,
      handles: {},
      errors: ['No prepared videos to import'],
      skipped,
    };
  }

  const quizId = existingQuizId;
  const questionBanners: CourseTrees = {};
  const importer = new VideoSegmentImporter();

  try {
    await importer.load(signal, onProgress);

    let bannerOrdinal = startingBannerOrdinal;
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const name = file.name;

      let probe;
      try {
        probe = await probeVideoFileForImport(file);
      } catch (error) {
        errors.push(`Failed to probe "${name}": ${error}`);
        continue;
      }

      let segments;
      try {
        segments = await importer.segmentFile(file, probe.durationSeconds, signal, onProgress);
      } catch (error) {
        errors.push(`Failed to segment "${name}": ${error}`);
        continue;
      }

      if (segments.length === 0) {
        errors.push(`No segments produced for "${name}"`);
        continue;
      }

      const bannerId = incrementID();
      const { banner, slideGroup } = buildCourseFromVideoSegments(
        bannerId,
        name,
        file.size,
        probe,
        segments,
        bannerOrdinal,
      );
      banner.bannerId = quizId;

      questionBanners[bannerId] = buildCourseTreeEntryFromSlideGroup(banner, slideGroup);
      banners.push(banner);
      content.push(slideGroup);
      bannerOrdinal += 1;
    }
  } finally {
    importer.terminate();
  }

  if (banners.length === 0) {
    return {
      Trees,
      quizzes,
      banners,
      content,
      handles: {},
      errors: errors.length > 0 ? errors : ['No course banners could be created from prepared videos'],
      skipped,
    };
  }

  Trees[quizId] = { banners: questionBanners };

  const stripped = stripQuizFlushMetadata(quizzes, banners, content);
  return {
    Trees,
    quizzes: stripped.quizzes,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildQuizHandles(stripped.quizzes, stripped.banners),
    errors,
    skipped,
  };
};

/**
 * Builds quiz entities from a picked folder using the same directory grouping as video import.
 * Each MP3 becomes one course banner inside its quiz group.
 */
export const buildQuizTreesFromAudioFolder = async (
  root: FileSystemDirectoryHandle,
  options?: AudioFolderImportOptions,
): Promise<QuizTreesFromMediaResult | null> => {
  const Trees: QuizTrees = {};
  const quizzes: Quiz[] = [];
  const banners: CourseBanner[] = [];
  const content: SlideGroup[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  const collected: CollectedGroupedMediaFile[] = [];
  try {
    await collectGroupedMediaFiles(root, null, root.name, collected);
  } catch (error) {
    console.warn('Failed to collect files from audio folder:', error);
    return null;
  }

  const mp3Candidates = collected.filter(({ name }) => isMp3FileName(name));
  if (mp3Candidates.length === 0) {
    return {
      Trees,
      quizzes,
      banners,
      content,
      handles: {},
      errors: ['No MP3 files found in the selected folder'],
      skipped,
    };
  }

  const groups = new Map<string, CollectedGroupedMediaFile[]>();
  for (const item of mp3Candidates) {
    const list = groups.get(item.groupKey) ?? [];
    list.push(item);
    groups.set(item.groupKey, list);
  }

  const importer = new VideoSegmentImporter();
  try {
    await importer.load();

    let quizOrdinal = 0;
    for (const [groupKey, groupFiles] of groups) {
      const quizId = incrementID();
      const questionBanners: CourseTrees = {};
      let bannerOrdinal = 0;
      let importedInGroup = 0;

      for (const { name, file } of groupFiles) {
        const imported = await importCourseBannerFromAudioFile(
          importer,
          name,
          file,
          quizId,
          bannerOrdinal,
          questionBanners,
          banners,
          content,
          errors,
          options?.targetChunkBytes,
        );
        if (imported) {
          bannerOrdinal += 1;
          importedInGroup += 1;
        }
      }

      if (importedInGroup === 0) {
        skipped.push(`Skipped quiz group "${groupKey}": no valid MP3 files imported`);
        continue;
      }

      Trees[quizId] = { banners: questionBanners };
      quizzes.push(withoutMetadata({
        ...defaultQuizEntityFields,
        id: quizId,
        title: groupKey,
        quote: `${importedInGroup} audio file${importedInGroup === 1 ? '' : 's'}`,
        ordinal: quizOrdinal++,
      }));
    }
  } finally {
    importer.terminate();
  }

  const stripped = stripQuizFlushMetadata(quizzes, banners, content);
  return {
    Trees,
    quizzes: stripped.quizzes,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildQuizHandles(stripped.quizzes, stripped.banners),
    errors,
    skipped,
  };
};

/**
 * Writes highlighted quiz course banners as MP4 files under subfolders named after their quiz.
 */
export const exportQuizTreesToVideoFolder = async (
  root: FileSystemDirectoryHandle,
  quizzes: Quiz[],
  banners: CourseBanner[],
  content: SlideGroup[],
): Promise<QuizTreesVideoExportResult> => {
  const errors: string[] = [];
  const skipped: string[] = [];
  let exportedQuizzes = 0;
  let exportedBanners = 0;
  let exportedFiles = 0;

  const highlightedQuizzes = quizzes.filter(({ isHighlighted }) => isHighlighted);
  if (highlightedQuizzes.length === 0) {
    return { exportedQuizzes: 0, exportedBanners: 0, exportedFiles: 0, errors, skipped };
  }

  for (const quiz of highlightedQuizzes) {
    const quizBanners = banners.filter(
      (banner) => banner.bannerId === quiz.id && banner.isHighlighted,
    );
    if (quizBanners.length === 0) {
      skipped.push(`Skipped quiz "${quiz.title}": no highlighted course banners`);
      continue;
    }

    const videoBanners = quizBanners.filter((banner) => {
      const slideGroup = content.find((group) => {
        const firstCover = group[0] as SlideGroupItem | undefined;
        return firstCover?.bannerId === banner.id;
      });
      return slideGroup ? isVideoCourseContent(banner, slideGroup) : false;
    });

    if (videoBanners.length === 0) {
      skipped.push(`Skipped quiz "${quiz.title}": no highlighted video course banners`);
      continue;
    }

    const subDirName = sanitizePathSegment(quiz.title);
    let subDir: FileSystemDirectoryHandle;
    try {
      subDir = await root.getDirectoryHandle(subDirName, { create: true });
    } catch (error) {
      errors.push(`Failed to create folder "${subDirName}" for quiz "${quiz.title}": ${error}`);
      continue;
    }

    const result = await exportCourseTreesToVideoFolder(subDir, videoBanners, content);
    result.errors.forEach((msg) => errors.push(msg));
    result.skipped.forEach((msg) => skipped.push(msg));
    if (result.exportedBanners > 0) {
      exportedQuizzes += 1;
      exportedBanners += result.exportedBanners;
      exportedFiles += result.exportedFiles;
    }
  }

  return { exportedQuizzes, exportedBanners, exportedFiles, errors, skipped };
};

/**
 * Writes highlighted quiz course banners as MP3 files under subfolders named after their quiz.
 */
export const exportQuizTreesToAudioFolder = async (
  root: FileSystemDirectoryHandle,
  quizzes: Quiz[],
  banners: CourseBanner[],
  content: SlideGroup[],
): Promise<QuizTreesVideoExportResult> => {
  const errors: string[] = [];
  const skipped: string[] = [];
  let exportedQuizzes = 0;
  let exportedBanners = 0;
  let exportedFiles = 0;

  const highlightedQuizzes = quizzes.filter(({ isHighlighted }) => isHighlighted);
  if (highlightedQuizzes.length === 0) {
    return { exportedQuizzes: 0, exportedBanners: 0, exportedFiles: 0, errors, skipped };
  }

  for (const quiz of highlightedQuizzes) {
    const quizBanners = banners.filter(
      (banner) => banner.bannerId === quiz.id && banner.isHighlighted,
    );
    if (quizBanners.length === 0) {
      skipped.push(`Skipped quiz "${quiz.title}": no highlighted course banners`);
      continue;
    }

    const subDirName = sanitizePathSegment(quiz.title);
    let subDir: FileSystemDirectoryHandle;
    try {
      subDir = await root.getDirectoryHandle(subDirName, { create: true });
    } catch (error) {
      errors.push(`Failed to create folder "${subDirName}" for quiz "${quiz.title}": ${error}`);
      continue;
    }

    const result = await exportCourseTreesToAudioFolder(subDir, quizBanners, content);
    result.errors.forEach((msg) => errors.push(msg));
    result.skipped.forEach((msg) => skipped.push(msg));
    if (result.exportedBanners > 0) {
      exportedQuizzes += 1;
      exportedBanners += result.exportedBanners;
      exportedFiles += result.exportedFiles;
    }
  }

  return { exportedQuizzes, exportedBanners, exportedFiles, errors, skipped };
};

/**
 * Builds a course banner/slide group from a single prepared MP4 (e.g. video prepper output).
 */
export const buildCourseTreesFromPreparedVideo = async (
  file: File,
  options?: PreparedVideoImportOptions,
): Promise<CourseTreesFromMediaResult | null> => {
  const { onProgress, signal } = options ?? {};
  const errors: string[] = [];
  const skipped: string[] = [];
  const Trees: CourseTrees = {};
  const banners: CourseBanner[] = [];
  const content: SlideGroup[] = [];
  const name = file.name;

  const importer = new VideoSegmentImporter();
  try {
    await importer.load(signal, onProgress);

    let probe;
    try {
      probe = await probeVideoFileForImport(file);
    } catch (error) {
      errors.push(`Failed to probe "${name}": ${error}`);
      return { Trees, banners, content, handles: {}, errors, skipped };
    }

    let segments;
    try {
      segments = await importer.segmentFile(file, probe.durationSeconds, signal, onProgress);
    } catch (error) {
      errors.push(`Failed to segment "${name}": ${error}`);
      return { Trees, banners, content, handles: {}, errors, skipped };
    }

    if (segments.length === 0) {
      errors.push(`No segments produced for "${name}"`);
      return { Trees, banners, content, handles: {}, errors, skipped };
    }

    const bannerId = incrementID();
    const { banner, slideGroup } = buildCourseFromVideoSegments(
      bannerId,
      name,
      file.size,
      probe,
      segments,
      0,
    );

    Trees[bannerId] = {
      slideGroupItems: segments.map((_, i) => (slideGroup[i] as SlideGroupItem).id),
      ...Object.fromEntries(
        banner.pennants.map((pennant) => [
          pennant.id,
          findSlideRowForPennant(slideGroup, pennant.id)?.map((s) => s.id) ?? [],
        ]),
      ),
    };

    banners.push(banner);
    content.push(slideGroup);

    const stripped = stripCourseFlushMetadata(banners, content);
    return {
      Trees,
      banners: stripped.banners,
      content: stripped.content,
      handles: buildCourseHandles(stripped.banners),
      errors,
      skipped,
    };
  } finally {
    importer.terminate();
  }
};

export type CourseTreesFromVideoFolderResult = CourseTreesFromMediaResult;

/**
 * Builds course banners/content from a picked folder: each .mp4 file becomes one course;
 * ffmpeg segments each file into pennants with base64-split slides and thumbnail covers.
 */
export const buildCourseTreesFromVideoFolder = async (
  root: FileSystemDirectoryHandle,
  options?: VideoFolderImportOptions,
): Promise<CourseTreesFromVideoFolderResult | null> => {
  const Trees: CourseTrees = {};
  const banners: CourseBanner[] = [];
  const content: SlideGroup[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];
  let bannerOrdinal = 0;

  const collectFiles = async (
    handle: FileSystemDirectoryHandle,
    files: { name: string; file: File }[],
  ): Promise<void> => {
    for await (const [name, entry] of handle.entries()) {
      if (entry.kind === 'directory') {
        await collectFiles(entry as FileSystemDirectoryHandle, files);
        continue;
      }
      const file = await (entry as FileSystemFileHandle).getFile();
      files.push({ name, file });
    }
  };

  const files: { name: string; file: File }[] = [];
  try {
    await collectFiles(root, files);
  } catch (error) {
    console.warn('Failed to collect files from video folder:', error);
    return null;
  }

  const mp4Candidates = files.flatMap(({ name, file }) => {
    if (!isMp4FileName(name)) {
      errors.push(`Skipped non-MP4 file: ${name}`);
      return [];
    }
    if (!isMp4File(file)) {
      errors.push(`"${name}" is not a valid MP4 file`);
      return [];
    }
    return [{ name, file }];
  });

  const importer = new VideoSegmentImporter();
  try {
    await importer.load();

    const total = mp4Candidates.length;
    for (let i = 0; i < mp4Candidates.length; i += 1) {
      const { name, file } = mp4Candidates[i];
      options?.onProgress?.({ current: i + 1, total, fileName: name });

      let probe;
      try {
        probe = await probeVideoFileForImport(file);
      } catch (error) {
        errors.push(`Failed to probe "${name}": ${error}`);
        continue;
      }

      let segments;
      try {
        segments = await importer.segmentFile(
          file,
          probe.durationSeconds,
          undefined,
          undefined,
          options?.targetChunkBytes,
        );
      } catch (error) {
        errors.push(`Failed to segment "${name}": ${error}`);
        continue;
      }

      if (segments.length === 0) continue;

      const bannerId = incrementID();
      const { banner, slideGroup } = buildCourseFromVideoSegments(
        bannerId,
        name,
        file.size,
        probe,
        segments,
        bannerOrdinal++,
      );

      Trees[bannerId] = {
        slideGroupItems: segments.map((_, idx) => (slideGroup[idx] as SlideGroupItem).id),
        ...Object.fromEntries(
          banner.pennants.map((pennant) => [
            pennant.id,
            findSlideRowForPennant(slideGroup, pennant.id)?.map((s) => s.id) ?? [],
          ]),
        ),
      };

      banners.push(banner);
      content.push(slideGroup);
    }
  } finally {
    importer.terminate();
  }

  const stripped = stripCourseFlushMetadata(banners, content);
  return {
    Trees,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildCourseHandles(stripped.banners),
    errors,
    skipped,
  };
};

export type CourseTreesFromAudioFolderResult = CourseTreesFromMediaResult;

export type CourseTreesVideoExportResult = {
  exportedBanners: number;
  exportedFiles: number;
  errors: string[];
  skipped: string[];
};

export type CourseTreesAudioExportResult = {
  exportedBanners: number;
  exportedFiles: number;
  errors: string[];
  skipped: string[];
};

/**
 * Builds course banners/content from a picked folder: each .mp3 file is segmented into
 * pennants with base64-split slide rows (≤1 MiB per row).
 */
export const buildCourseTreesFromAudioFolder = async (
  root: FileSystemDirectoryHandle,
  options?: AudioFolderImportOptions,
): Promise<CourseTreesFromAudioFolderResult | null> => {
  const Trees: CourseTrees = {};
  const banners: CourseBanner[] = [];
  const content: SlideGroup[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];
  let bannerOrdinal = 0;

  const collectFiles = async (
    handle: FileSystemDirectoryHandle,
    files: { name: string; file: File }[],
  ): Promise<void> => {
    for await (const [name, entry] of handle.entries()) {
      if (entry.kind === 'directory') {
        await collectFiles(entry as FileSystemDirectoryHandle, files);
        continue;
      }
      const file = await (entry as FileSystemFileHandle).getFile();
      files.push({ name, file });
    }
  };

  const files: { name: string; file: File }[] = [];
  try {
    await collectFiles(root, files);
  } catch (error) {
    console.warn('Failed to collect files from audio folder:', error);
    return null;
  }

  const mp3Candidates = files.flatMap(({ name, file }) => {
    if (!isMp3FileName(name)) {
      errors.push(`Skipped non-MP3 file: ${name}`);
      return [];
    }
    if (!isMp3File(file)) {
      errors.push(`"${name}" is not a valid MP3 file`);
      return [];
    }
    return [{ name, file }];
  });

  const importer = new VideoSegmentImporter();
  try {
    await importer.load();

    for (const { name, file } of mp3Candidates) {
      let probe;
      try {
        probe = await probeAudioFileForImport(file);
      } catch (error) {
        errors.push(`Failed to probe "${name}": ${error}`);
        continue;
      }

      let segments;
      try {
        segments = await importer.segmentFile(
          file,
          probe.durationSeconds,
          undefined,
          undefined,
          options?.targetChunkBytes,
        );
      } catch (error) {
        errors.push(`Failed to segment "${name}": ${error}`);
        continue;
      }

      if (segments.length === 0) continue;

      const bannerId = incrementID();
      const { banner, slideGroup } = buildCourseFromVideoSegments(
        bannerId,
        name,
        file.size,
        probe,
        segments,
        bannerOrdinal++,
      );

      Trees[bannerId] = {
        slideGroupItems: segments.map((_, idx) => (slideGroup[idx] as SlideGroupItem).id),
        ...Object.fromEntries(
          banner.pennants.map((pennant) => [
            pennant.id,
            findSlideRowForPennant(slideGroup, pennant.id)?.map((s) => s.id) ?? [],
          ]),
        ),
      };

      banners.push(banner);
      content.push(slideGroup);
    }
  } finally {
    importer.terminate();
  }

  const stripped = stripCourseFlushMetadata(banners, content);
  return {
    Trees,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildCourseHandles(stripped.banners),
    errors,
    skipped,
  };
};

/**
 * Writes highlighted course banners as MP4 files by reassembling pennant base64 payloads.
 */
export const exportCourseTreesToVideoFolder = async (
  root: FileSystemDirectoryHandle,
  banners: CourseBanner[],
  content: SlideGroup[],
): Promise<CourseTreesVideoExportResult> => {
  const errors: string[] = [];
  const skipped: string[] = [];
  let exportedBanners = 0;
  let exportedFiles = 0;

  const highlightedBanners = banners.filter(({ isHighlighted }) => isHighlighted);
  if (highlightedBanners.length === 0) {
    return { exportedBanners: 0, exportedFiles: 0, errors, skipped };
  }

  const usedFileNames = new Set<string>();

  for (const banner of highlightedBanners) {
    const slideGroup = content.find((group) => {
      const firstCover = group[0] as SlideGroupItem | undefined;
      return firstCover?.bannerId === banner.id;
    });

    if (!slideGroup) {
      skipped.push(`Skipped course "${banner.title}": no slide group found`);
      continue;
    }

    const pennantsToExport = [...(banner.pennants ?? [])].sort((a, b) => a.ordinal - b.ordinal);

    if (pennantsToExport.length === 0) {
      skipped.push(`Skipped course "${banner.title}": no pennants`);
      continue;
    }

    const pennantPayloads: string[] = [];
    let pennantError: string | null = null;

    for (const pennant of pennantsToExport) {
      const slideRow = findSlideRowForPennant(slideGroup, pennant.id);
      if (!slideRow) {
        pennantError = `missing slides for pennant ${pennant.id}`;
        break;
      }
      const highlightedSlides = slideRow.filter(({ isHighlighted }) => isHighlighted);
      const slidesToUse = highlightedSlides.length > 0 ? highlightedSlides : slideRow;
      const assembled = slidesToBase64Payload(slidesToUse);
      if ('error' in assembled) {
        pennantError = assembled.error;
        break;
      }
      pennantPayloads.push(assembled.payload);
    }

    if (pennantError || pennantPayloads.length === 0) {
      errors.push(`Skipped course "${banner.title}": ${pennantError ?? 'no pennant payloads'}`);
      continue;
    }

    const fileName = uniqueFileName(
      resolveVideoExportFileName(banner.title),
      usedFileNames,
    );

    const firstSlideRow = pennantsToExport[0]
      ? findSlideRowForPennant(slideGroup, pennantsToExport[0].id)
      : null;
    const initPayload = firstSlideRow
      ? extractFmp4InitPayloadFromRows(firstSlideRow)
      : null;

    try {
      if (!areFmp4VideoChunks(pennantPayloads, initPayload)) {
        errors.push(`Skipped course "${banner.title}": not fMP4 video chunks`);
        continue;
      }
      const importer = new VideoSegmentImporter();
      try {
        await importer.load();
        const blob = await importer.concatSegments(pennantPayloads, undefined, initPayload);
        await writeBlobToHandle(root, fileName, blob);
      } finally {
        importer.terminate();
      }
      exportedBanners += 1;
      exportedFiles += 1;
    } catch (error) {
      errors.push(`Failed to write "${fileName}" for course "${banner.title}": ${error}`);
    }
  }

  return { exportedBanners, exportedFiles, errors, skipped };
};

/**
 * Writes highlighted course banners as MP3 files by reassembling base64 split slide rows.
 */
export const exportCourseTreesToAudioFolder = async (
  root: FileSystemDirectoryHandle,
  banners: CourseBanner[],
  content: SlideGroup[],
): Promise<CourseTreesAudioExportResult> => {
  const errors: string[] = [];
  const skipped: string[] = [];
  let exportedBanners = 0;
  let exportedFiles = 0;

  const highlightedBanners = banners.filter(({ isHighlighted }) => isHighlighted);
  if (highlightedBanners.length === 0) {
    return { exportedBanners: 0, exportedFiles: 0, errors, skipped };
  }

  const usedFileNames = new Set<string>();

  for (const banner of highlightedBanners) {
    const slideGroup = content.find((group) => {
      const firstCover = group[0] as SlideGroupItem | undefined;
      return firstCover?.bannerId === banner.id;
    });

    if (!slideGroup) {
      skipped.push(`Skipped course "${banner.title}": no slide group found`);
      continue;
    }

    const pennant = (banner.pennants ?? [])[0];
    if (!pennant) {
      skipped.push(`Skipped course "${banner.title}": no pennant`);
      continue;
    }

    const slideRow = findSlideRowForPennant(slideGroup, pennant.id);
    if (!slideRow) {
      skipped.push(`Skipped course "${banner.title}": no slide rows`);
      continue;
    }

    const highlightedSlides = slideRow.filter(({ isHighlighted }) => isHighlighted);
    const slidesToUse = highlightedSlides.length > 0 ? highlightedSlides : slideRow;
    const assembled = slidesToBase64Payload(slidesToUse);
    if ('error' in assembled) {
      errors.push(`Skipped course "${banner.title}": ${assembled.error}`);
      continue;
    }

    const fileName = uniqueFileName(
      resolveAudioExportFileName(banner.title),
      usedFileNames,
    );

    try {
      await writeBase64ChunksToHandle(root, fileName, [assembled.payload]);
      exportedBanners += 1;
      exportedFiles += 1;
    } catch (error) {
      errors.push(`Failed to write "${fileName}" for course "${banner.title}": ${error}`);
    }
  }

  return { exportedBanners, exportedFiles, errors, skipped };
};

export const buildTutorialTreesFromPreset = (
  preset: string
): { Trees: TutorialTrees; banners: TutorialBanner[]; content: TutorialContent[][]; handles: Record<string, Handler[]> } | null => {
  const parsed = parseTutorialPreset(preset);
  if (!parsed) return null;
  const { count, steps } = parsed;
  const Trees: TutorialTrees = {};
  for (let i = 0; i < count; i++) {
    const bannerId = incrementID();
    Trees[bannerId] = Array.from({ length: steps }, () => incrementID());
  }
  const flushed = flushTutorialTrees(Trees);
  const stripped = stripTutorialFlushMetadata(flushed.banners ?? [], flushed.content ?? []);
  return {
    Trees,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildTutorialHandles(stripped.banners),
  };
};

/**
 * Each course banner: **covers** pennants (one per cover), each with **slidesPerCover** slide ids, plus
 * **slideGroupItems** (one id per cover — parallel cover row for `flushCourseTrees` / `getCourseTrees`).
 */
export const buildCourseTreesFromPreset = (
  preset: string
): { Trees: CourseTrees; banners: CourseBanner[]; content: SlideGroup[]; handles: Record<string, Handler[]> } | null => {
  const parsed = parseCoursePreset(preset);
  if (!parsed) return null;
  const { count, covers, slidesPerCover } = parsed;
  const Trees: CourseTrees = {};
  for (let i = 0; i < count; i++) {
    const bannerId = incrementID();
    const byPennant: Record<number, number[]> = {};
    for (let c = 0; c < covers; c++) {
      const pennantId = incrementID();
      byPennant[pennantId] = Array.from({ length: slidesPerCover }, () => incrementID());
    }
    Trees[bannerId] = {
      ...byPennant,
      slideGroupItems: Array.from({ length: covers }, () => incrementID()),
    };
  }
  const flushed = flushCourseTrees(Trees);
  const stripped = stripCourseFlushMetadata(flushed.banners ?? [], flushed.content ?? []);
  return {
    Trees,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildCourseHandles(stripped.banners),
  };
};

/**
 * Each quiz → `banners` is a {@link CourseTrees} with **one course banner per question**.
 * Per question banner: **slideGroupItems** = options (ids); one pennant with **slides** = reports (ids).
 * No `submissions` on the quiz tree.
 */
export const buildQuizTreesFromPreset = (
  preset: string
): { Trees: QuizTrees; quizzes: Quiz[]; banners: CourseBanner[]; content: SlideGroup[]; handles: Record<string, Handler[]> } | null => {
  const parsed = parseQuizPreset(preset);
  if (!parsed) return null;
  const { count, questions, options, reports } = parsed;
  const Trees: QuizTrees = {};
  for (let i = 0; i < count; i++) {
    const quizId = incrementID();
    const questionBanners: CourseTrees = {};
    for (let q = 0; q < questions; q++) {
      const questionBannerId = incrementID();
      const pennantId = incrementID();
      questionBanners[questionBannerId] = {
        slideGroupItems: Array.from({ length: options }, () => incrementID()),
        [pennantId]: Array.from({ length: reports }, () => incrementID()),
      };
    }
    Trees[quizId] = {
      banners: questionBanners,
    };
  }
  const flushed = flushQuizTrees(Trees);
  const stripped = stripQuizFlushMetadata(
    flushed.quizzes ?? [],
    flushed.banners ?? [],
    flushed.content ?? []
  );
  return {
    Trees,
    quizzes: stripped.quizzes,
    banners: stripped.banners,
    content: stripped.content,
    handles: buildQuizHandles(stripped.quizzes, stripped.banners),
  };
};
