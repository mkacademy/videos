import React, { useCallback, useMemo } from 'react';
import { Alert, Button, Nav } from 'react-bootstrap';
import { createSearchParams, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaDownload } from 'react-icons/fa';
import { RootState } from '../../store';
import { signOut } from '../../utils';
import { clearData as clearReducers } from '../../store/slices/rowSlice';
import { resetPlayback, setPlaybackWebapp } from '../../store/slices/playbackSlice';
import { mutateCurApp } from '../../store/slices/sessionSlice';
import {
  highlightCoversBreathSelection,
  highlightCourseBreathSelection,
  highlightPennantBreathSelection,
  highlightSlideBreathSelection,
} from '../../store/slices/courseSlice';
import {
  highlightContentBreathSelection,
  highlightTutorialBreathSelection,
} from '../../store/slices/tutorialSlice';
import { highlightQuizBreathSelection } from '../../store/slices/quizSlice';
import { resolveCourseSlideGroupForBanner } from '../../library/videoChunkPlayback';
import { isDirectoryExportSupported, pickWritableDirectoryHandle } from '../../library/directoryTreeUtils';
import { prependError, prependWarning } from '../../store/slices/errorSlice';
import { viewRequest } from '../../store/slices/viewSlice';
import MediaScreenSwitcher from '../MediaScreenSwitcher';
import MarkdownPlayback from './MarkdownPlayback';
import {
  buildCourseThumbsLibrary,
  buildQuizThumbsLibrary,
  buildThumbsPlaylistFromCourseChapter,
  buildThumbsPlaylistFromCourseCovers,
  buildThumbsPlaylistFromTutorial,
  buildTutorialThumbsLibrary,
  collectCoupledTutorialIdsForCourse,
  exportTutorialBannerMarkdownToDirectory,
  exportTutorialBannerTextToDirectory,
  resolveMediaPlayerTab,
  type DocumentMediaKind,
  type MediaPlayerTab,
  type ThumbsPlaylistItem,
} from './mediaThumbsUtils';
import * as styles from '../../styles/mediaPlayer.module.css';

const accountIconSrc = new URL('../../Images/user.png', import.meta.url).href;
const exitIconSrc = new URL('../../Images/3094700.png', import.meta.url).href;

function buildLibraryUrl(
  basePath: string,
  tab: MediaPlayerTab,
  params?: {
    videoId?: number;
    audioId?: number;
    quizId?: number;
    courseId?: number;
    tutorialId?: number;
    ldr?: string | null;
  },
): string {
  const search = new URLSearchParams({ tab });
  if (params?.quizId !== undefined) search.set('quizId', String(params.quizId));
  if (params?.audioId !== undefined) search.set('audioId', String(params.audioId));
  if (params?.videoId !== undefined) search.set('videoId', String(params.videoId));
  if (params?.courseId !== undefined) search.set('courseId', String(params.courseId));
  if (params?.tutorialId !== undefined) search.set('tutorialId', String(params.tutorialId));
  if (params?.ldr) search.set('ldr', params.ldr);
  return `${basePath}?${search.toString()}`;
}

const MediaMarkdownAccountButton: React.FC = () => {
  const dispatch = useDispatch();
  const { pathname, search } = useLocation();
  const authenticated = useSelector((state: RootState) => state.session.authenticated);
  const loginSearch = createSearchParams({ redirectUrl: pathname + search }).toString();

  const handleAccountClick = (e: React.MouseEvent) => {
    if (!authenticated) return;
    e.preventDefault();
    dispatch(clearReducers());
    dispatch({ type: signOut() });
  };

  return (
    <Link
      to={{ pathname: '/login', search: loginSearch }}
      onClick={handleAccountClick}
      aria-label={authenticated ? 'Sign out' : 'Sign in'}
      className={styles['accountButton']}
    >
      <img
        src={accountIconSrc}
        alt=""
        className={styles['accountIcon']}
        style={{ opacity: authenticated ? 0 : 1 }}
      />
      <img
        src={exitIconSrc}
        alt=""
        className={styles['accountIcon']}
        style={{ opacity: authenticated ? 1 : 0 }}
      />
    </Link>
  );
};

const MediaMarkdownTabs: React.FC<{
  activeTab: MediaPlayerTab;
  onSelect: (tab: MediaPlayerTab) => void;
}> = ({ activeTab, onSelect }) => (
  <div className={styles['tabRow']}>
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
    <MediaMarkdownAccountButton />
  </div>
);

type MediaDocumentsProps = {
  documentKind: DocumentMediaKind;
};

const MediaDocuments: React.FC<MediaDocumentsProps> = ({ documentKind }) => {
  const dispatch = useDispatch();
  const basePath = documentKind === 'text' ? '/media-text' : '/media-markdown';
  const kindLabel = documentKind === 'text' ? 'text' : 'markdown';
  const slotKind = documentKind;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const tabParam = searchParams.get('tab');
  const activeTab = resolveMediaPlayerTab(tabParam, curApp);
  const ldr = searchParams.get('ldr');
  const videoIdParam = searchParams.get('videoId');
  const audioIdParam = searchParams.get('audioId');
  const quizIdParam = searchParams.get('quizId');
  const courseIdParam = searchParams.get('courseId');
  const tutorialIdParam = searchParams.get('tutorialId');
  const parsedVideoId = videoIdParam ? Number(videoIdParam) : NaN;
  const parsedAudioId = audioIdParam ? Number(audioIdParam) : NaN;
  const parsedQuizId = quizIdParam ? Number(quizIdParam) : NaN;
  const parsedCourseId = courseIdParam ? Number(courseIdParam) : NaN;
  const parsedTutorialId = tutorialIdParam ? Number(tutorialIdParam) : NaN;
  const videoId = Number.isFinite(parsedVideoId) && parsedVideoId > 0 ? parsedVideoId : null;
  const audioId = Number.isFinite(parsedAudioId) && parsedAudioId > 0 ? parsedAudioId : null;
  const quizId = Number.isFinite(parsedQuizId) && parsedQuizId > 0 ? parsedQuizId : null;
  const courseId = Number.isFinite(parsedCourseId) && parsedCourseId > 0 ? parsedCourseId : null;
  const tutorialId = Number.isFinite(parsedTutorialId) && parsedTutorialId > 0 ? parsedTutorialId : null;

  const hasSelectedMedia = activeTab === 'tutorial'
    ? audioId !== null
    : activeTab === 'course'
      ? videoId !== null
      : false;

  const [exitedCourseId, setExitedCourseId] = React.useState<number | null>(null);
  const [exitedTutorialId, setExitedTutorialId] = React.useState<number | null>(null);
  const exitedLibraryItemRef = React.useRef<HTMLDivElement | null>(null);

  const courseBanners = useSelector((state: RootState) => state.course.banners);
  const courseContent = useSelector((state: RootState) => state.course.content);
  const tutorialBanners = useSelector((state: RootState) => state.tutorial.banners);
  const tutorialContent = useSelector((state: RootState) => state.tutorial.content);
  const quizQuizzes = useSelector((state: RootState) => state.quiz.quizzes);
  const quizBanners = useSelector((state: RootState) => state.quiz.banners);
  const quizContent = useSelector((state: RootState) => state.quiz.content);
  const exportInProgress = useSelector((state: RootState) => state.view.requestIsProcessing);
  const exportSupported = isDirectoryExportSupported();

  React.useEffect(() => {
    if (tabParam) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', resolveMediaPlayerTab(null, curApp));
      return next;
    }, { replace: true });
  }, [tabParam, curApp, setSearchParams]);

  React.useEffect(() => {
    dispatch(mutateCurApp(activeTab));
  }, [activeTab, dispatch]);

  React.useLayoutEffect(() => {
    if (hasSelectedMedia) return;
    const exitedId = activeTab === 'course'
      ? exitedCourseId
      : activeTab === 'tutorial'
        ? exitedTutorialId
        : null;
    if (exitedId == null) return;
    exitedLibraryItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeTab, exitedCourseId, exitedTutorialId, hasSelectedMedia]);

  const courseLibrary = useMemo(() => {
    if (quizId !== null) {
      return buildCourseThumbsLibrary(quizBanners, quizContent, quizId, slotKind);
    }
    return buildCourseThumbsLibrary(courseBanners, courseContent, undefined, slotKind);
  }, [quizId, quizBanners, quizContent, courseBanners, courseContent, slotKind]);

  const filterCourseContext = useMemo(() => {
    if (courseId === null) return null;
    if (quizId !== null) {
      const quizBanner = quizBanners.find((banner) => banner.id === courseId) ?? null;
      const slideGroup = quizBanner
        ? resolveCourseSlideGroupForBanner(quizBanner, quizContent)
        : null;
      if (quizBanner && slideGroup) return { courseBanner: quizBanner, slideGroup };
    }
    const courseBanner = courseBanners.find((banner) => banner.id === courseId)
      ?? quizBanners.find((banner) => banner.id === courseId)
      ?? null;
    const contentGroups = courseBanners.some((banner) => banner.id === courseId)
      ? courseContent
      : quizContent;
    const slideGroup = courseBanner
      ? resolveCourseSlideGroupForBanner(courseBanner, contentGroups)
      : null;
    if (!courseBanner || !slideGroup) return null;
    return { courseBanner, slideGroup };
  }, [courseId, courseBanners, courseContent, quizBanners, quizContent, quizId]);

  const tutorialFilterIds = useMemo(() => {
    if (courseId !== null) {
      if (!filterCourseContext) return new Set<number>();
      return collectCoupledTutorialIdsForCourse(
        filterCourseContext.courseBanner,
        filterCourseContext.slideGroup,
        tutorialContent,
      );
    }

    if (tutorialId !== null) return new Set([tutorialId]);
    return null;
  }, [courseId, filterCourseContext, tutorialContent, tutorialId]);

  const tutorialLibrary = useMemo(() => {
    const entries = buildTutorialThumbsLibrary(
      tutorialBanners,
      tutorialContent,
      tutorialFilterIds,
      slotKind,
    );
    if (!filterCourseContext) return entries;

    return entries.map((entry) => {
      const pennant = filterCourseContext.courseBanner.pennants
        ?.find((p) => p.id === entry.id);
      const pennantTitle = pennant?.title;
      const chapterCount = entry.imageCount > 0
        ? entry.imageCount
        : buildThumbsPlaylistFromCourseChapter(
          filterCourseContext.slideGroup,
          entry.id,
          slotKind,
        ).length;
      return {
        ...entry,
        title: entry.title.startsWith('Tutorial #') && pennantTitle
          ? pennantTitle
          : entry.title,
        imageCount: chapterCount,
        isHighlighted: entry.isHighlighted || pennant?.isHighlighted || false,
      };
    });
  }, [filterCourseContext, tutorialBanners, tutorialContent, tutorialFilterIds, slotKind]);

  const quizLibrary = useMemo(
    () => buildQuizThumbsLibrary(quizQuizzes, quizBanners, quizContent, slotKind),
    [quizQuizzes, quizBanners, quizContent, slotKind],
  );

  const selectedCourseBanner = activeTab === 'course' && videoId !== null
    ? (
      (quizId !== null
        ? quizBanners.find((banner) => banner.id === videoId)
        : courseBanners.find((banner) => banner.id === videoId))
      ?? quizBanners.find((banner) => banner.id === videoId)
      ?? courseBanners.find((banner) => banner.id === videoId)
      ?? null
    )
    : null;

  const selectedCourseUsesQuizContent = selectedCourseBanner != null && (
    quizId !== null
    || (
      courseBanners.every((banner) => banner.id !== selectedCourseBanner.id)
      && quizBanners.some((banner) => banner.id === selectedCourseBanner.id)
    )
  );

  const selectedCourseSlideGroup = selectedCourseBanner
    ? resolveCourseSlideGroupForBanner(
      selectedCourseBanner,
      selectedCourseUsesQuizContent ? quizContent : courseContent,
    )
    : null;

  const selectedTutorialBanner = activeTab === 'tutorial' && audioId !== null
    ? tutorialBanners.find((banner) => banner.id === audioId) ?? null
    : null;

  const tutorialPlaylist = useMemo(() => {
    if (audioId === null) return [] as ThumbsPlaylistItem[];

    const fromTutorial = buildThumbsPlaylistFromTutorial(
      audioId,
      tutorialContent,
      slotKind,
    );
    if (fromTutorial.length > 0) return fromTutorial;

    if (filterCourseContext) {
      const fromCourseChapter = buildThumbsPlaylistFromCourseChapter(
        filterCourseContext.slideGroup,
        audioId,
        slotKind,
      );
      if (fromCourseChapter.length > 0) return fromCourseChapter;
    }

    return [];
  }, [audioId, filterCourseContext, tutorialContent, slotKind]);

  const coursePlaylist = useMemo(() => {
    if (!selectedCourseBanner || !selectedCourseSlideGroup) return [] as ThumbsPlaylistItem[];
    return buildThumbsPlaylistFromCourseCovers(
      selectedCourseBanner,
      selectedCourseSlideGroup,
      tutorialContent,
      slotKind,
    );
  }, [selectedCourseBanner, selectedCourseSlideGroup, tutorialContent, slotKind]);

  React.useEffect(() => () => {
    dispatch(resetPlayback());
  }, [dispatch]);

  React.useEffect(() => {
    if (!hasSelectedMedia) {
      dispatch(setPlaybackWebapp(null));
      return;
    }
    const webapp = activeTab === 'tutorial'
      ? 'tutorial'
      : quizId !== null
        ? 'quiz'
        : 'course';
    dispatch(setPlaybackWebapp(webapp));
  }, [activeTab, dispatch, hasSelectedMedia, quizId]);

  const handleTabSelect = useCallback((tab: MediaPlayerTab) => {
    const next: Record<string, string> = { tab };
    if (ldr) next.ldr = ldr;
    if (quizId !== null) next.quizId = String(quizId);
    if (tab === 'tutorial' && courseId !== null) next.courseId = String(courseId);
    if (tab === 'tutorial' && tutorialId !== null) next.tutorialId = String(tutorialId);
    if (tab === 'course' && courseId !== null) next.courseId = String(courseId);
    setSearchParams(next);
  }, [courseId, ldr, quizId, setSearchParams, tutorialId]);

  const handleChangeCourseMedia = useCallback(() => {
    if (videoId !== null) setExitedCourseId(videoId);
    navigate(buildLibraryUrl(basePath, 'course', {
      quizId: quizId ?? undefined,
      courseId: courseId ?? undefined,
      ldr,
    }));
  }, [basePath, courseId, ldr, navigate, quizId, videoId]);

  const handleChangeTutorialMedia = useCallback(() => {
    if (audioId !== null) setExitedTutorialId(audioId);
    navigate(buildLibraryUrl(basePath, 'tutorial', {
      courseId: courseId ?? undefined,
      tutorialId: tutorialId ?? undefined,
      quizId: quizId ?? undefined,
      ldr,
    }));
  }, [basePath, audioId, courseId, ldr, navigate, quizId, tutorialId]);

  const handleViewCourse = useCallback((id: number) => {
    setExitedCourseId(null);
    navigate(buildLibraryUrl(basePath, 'course', {
      videoId: id,
      quizId: quizId ?? undefined,
      courseId: courseId ?? undefined,
      ldr,
    }));
  }, [basePath, courseId, ldr, navigate, quizId]);

  const handleViewTutorial = useCallback((id: number) => {
    setExitedTutorialId(null);
    navigate(buildLibraryUrl(basePath, 'tutorial', {
      audioId: id,
      courseId: courseId ?? undefined,
      tutorialId: tutorialId ?? undefined,
      quizId: quizId ?? undefined,
      ldr,
    }));
  }, [basePath, courseId, ldr, navigate, quizId, tutorialId]);

  const handleCourseMainImageClick = useCallback((item: ThumbsPlaylistItem) => {
    const resolvedId = item.coupledTutorialId;
    if (resolvedId == null || resolvedId <= 0) {
      dispatch(prependWarning('No tutorial coupled to this cover'));
      return;
    }
    navigate(buildLibraryUrl(basePath, 'tutorial', {
      audioId: resolvedId,
      tutorialId: resolvedId,
      courseId: courseId ?? videoId ?? undefined,
      quizId: quizId ?? undefined,
      ldr,
    }));
  }, [basePath, courseId, dispatch, ldr, navigate, quizId, videoId]);

  const handleTogglePlaylistHighlight = useCallback((item: ThumbsPlaylistItem) => {
    const source = item.highlightSource
      ?? (activeTab === 'course' ? 'cover' : 'content');
    if (source === 'cover') {
      dispatch(highlightCoversBreathSelection({ ids: [item.id] }));
      return;
    }
    if (source === 'slide') {
      dispatch(highlightSlideBreathSelection({ ids: [item.id] }));
      return;
    }
    dispatch(highlightContentBreathSelection({ ids: [item.id] }));
  }, [activeTab, dispatch]);

  const handleToggleCourseHighlight = useCallback((id: number) => {
    dispatch(highlightCourseBreathSelection({ ids: [id] }));
  }, [dispatch]);

  const handleToggleTutorialHighlight = useCallback((id: number) => {
    const hasTutorialBanner = tutorialBanners.some((banner) => banner.id === id);
    if (hasTutorialBanner) {
      dispatch(highlightTutorialBreathSelection({ ids: [id] }));
      return;
    }
    if (filterCourseContext) {
      dispatch(highlightPennantBreathSelection({ ids: [id] }));
      return;
    }
    dispatch(highlightTutorialBreathSelection({ ids: [id] }));
  }, [dispatch, filterCourseContext, tutorialBanners]);

  const handleToggleQuizHighlight = useCallback((id: number) => {
    dispatch(highlightQuizBreathSelection({ ids: [id] }));
  }, [dispatch]);

  const handleExportTutorial = useCallback(async (id: number) => {
    if (!exportSupported || exportInProgress) return;
    const banner = tutorialBanners.find((entry) => entry.id === id);
    if (!banner) return;

    const root = await pickWritableDirectoryHandle();
    if (!root) return;

    dispatch(viewRequest({ message: `Exporting ${kindLabel}... please wait`, completed: false }));
    try {
      const exporter = documentKind === 'text'
        ? exportTutorialBannerTextToDirectory
        : exportTutorialBannerMarkdownToDirectory;
      const result = await exporter(root, banner, tutorialContent);
      if (result.exportedBanners === 0) {
        dispatch(prependError(
          result.errors[0]
          ?? result.skipped[0]
          ?? `No ${kindLabel} to export`,
        ));
        return;
      }
      result.errors.forEach((msg) => dispatch(prependError(msg)));
      result.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(prependWarning(
        `Exported ${result.exportedImages} ${kindLabel} files in ${result.exportedBanners} banner folder`,
      ));
    } finally {
      dispatch(viewRequest({ completed: true }));
    }
  }, [dispatch, documentKind, exportInProgress, exportSupported, kindLabel, tutorialBanners, tutorialContent]);

  const tabs = (
    <MediaMarkdownTabs activeTab={activeTab} onSelect={handleTabSelect} />
  );

  if (hasSelectedMedia && activeTab === 'tutorial' && audioId !== null) {
    const title = selectedTutorialBanner?.title
      ?? filterCourseContext?.courseBanner.pennants?.find((pennant) => pennant.id === audioId)?.title
      ?? `Tutorial #${audioId}`;

    if (tutorialPlaylist.length === 0) {
      return (
        <div className={styles['container']}>
          <div className={styles['headerRow']}>
            <MediaScreenSwitcher asHeader />
          </div>
          {tabs}
          <Alert variant="warning">
            {`No ${kindLabel} documents found for tutorial id `}<strong>{audioId}</strong>.
          </Alert>
          <Link to={buildLibraryUrl(basePath, 'tutorial', {
            courseId: courseId ?? undefined,
            tutorialId: tutorialId ?? undefined,
            quizId: quizId ?? undefined,
            ldr,
          })}
          >
            Back to library
          </Link>
        </div>
      );
    }

    return (
      <MarkdownPlayback
        title={title}
        items={tutorialPlaylist}
        kind="tutorial"
        documentKind={documentKind}
        onChangeMedia={handleChangeTutorialMedia}
        onToggleHighlight={handleTogglePlaylistHighlight}
        tabs={tabs}
      />
    );
  }

  if (hasSelectedMedia && activeTab === 'course' && selectedCourseBanner && selectedCourseSlideGroup) {
    if (coursePlaylist.length === 0) {
      return (
        <div className={styles['container']}>
          <div className={styles['headerRow']}>
            <MediaScreenSwitcher asHeader />
          </div>
          {tabs}
          <Alert variant="warning">
            {`No ${kindLabel} covers found for course id `}<strong>{videoId}</strong>.
          </Alert>
          <Link to={buildLibraryUrl(basePath, 'course', {
            quizId: quizId ?? undefined,
            courseId: courseId ?? undefined,
            ldr,
          })}
          >
            Back to library
          </Link>
        </div>
      );
    }

    return (
      <MarkdownPlayback
        title={selectedCourseBanner.title}
        items={coursePlaylist}
        kind="course"
        documentKind={documentKind}
        onChangeMedia={handleChangeCourseMedia}
        onMainDocumentClick={handleCourseMainImageClick}
        onToggleHighlight={handleTogglePlaylistHighlight}
        tabs={tabs}
      />
    );
  }

  if (hasSelectedMedia) {
    return (
      <div className={styles['container']}>
        <div className={styles['headerRow']}>
          <MediaScreenSwitcher asHeader />
        </div>
        {tabs}
        <Alert variant="warning">
          Could not open the selected container.
        </Alert>
        <Link to={buildLibraryUrl(basePath, activeTab, {
          quizId: quizId ?? undefined,
          courseId: courseId ?? undefined,
          tutorialId: tutorialId ?? undefined,
          ldr,
        })}
        >
          Back to library
        </Link>
      </div>
    );
  }

  const librarySubtitle = activeTab === 'course'
    ? `Choose a course to view its ${kindLabel} covers.`
    : activeTab === 'tutorial'
      ? (courseId !== null
        ? `Choose a tutorial to view ${kindLabel} from this course.`
        : `Choose a tutorial to view its ${kindLabel} documents.`)
      : 'Choose a quiz to browse its courses.';

  return (
    <div className={styles['container']}>
      <div className={styles['headerRow']}>
        <div>
          <MediaScreenSwitcher asHeader />
          <p className={styles['subtitle']}>{librarySubtitle}</p>
        </div>
      </div>

      {tabs}

      {activeTab === 'course' && quizId !== null && (
        <div className={styles['filterBanner']}>
          <span>Showing courses for quiz #{quizId}</span>
          <Link to={buildLibraryUrl(basePath, 'quiz', { ldr })}>Back to quizzes</Link>
        </div>
      )}

      {activeTab === 'tutorial' && courseId !== null && (
        <div className={styles['filterBanner']}>
          <span>
            Showing tutorials for course #
            {courseId}
            {tutorialId !== null ? ` · tutorial #${tutorialId}` : ''}
          </span>
          <Link to={buildLibraryUrl(basePath, 'course', {
            videoId: courseId,
            quizId: quizId ?? undefined,
            ldr,
          })}
          >
            Back to course
          </Link>
        </div>
      )}

      {activeTab === 'tutorial' && courseId === null && tutorialId !== null && (
        <div className={styles['filterBanner']}>
          <span>
            Showing tutorial #
            {tutorialId}
          </span>
          <Link to={buildLibraryUrl(basePath, 'tutorial', { ldr })}>Back to tutorials</Link>
        </div>
      )}

      {activeTab === 'course' && (
        courseLibrary.length === 0 ? (
          <div className={styles['emptyState']}>
            {quizId !== null
              ? `No courses with ${kindLabel} covers found in this quiz.`
              : `No courses with ${kindLabel} covers found.`}
          </div>
        ) : (
          <div className={styles['libraryList']}>
            {courseLibrary.map((course) => (
              <div
                key={course.id}
                ref={course.id === exitedCourseId ? exitedLibraryItemRef : undefined}
                className={[
                  styles['libraryItem'],
                  course.isHighlighted ? styles['libraryItemHighlighted'] : '',
                ].filter(Boolean).join(' ')}
              >
                <div>
                  <div
                    className={`${styles['chunkTitle']} ${styles['titleClickable']}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleToggleCourseHighlight(course.id)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      handleToggleCourseHighlight(course.id);
                    }}
                  >
                    {course.title}
                  </div>
                  <div className={styles['chunkTime']}>
                    {course.imageCount}
                    {' '}
                    document
                    {course.imageCount === 1 ? '' : 's'}
                    {course.quote ? ` · ${course.quote}` : ''}
                  </div>
                </div>
                <div className={styles['libraryItemActions']}>
                  <Button
                    variant={course.id === exitedCourseId ? 'secondary' : 'primary'}
                    className={course.id === exitedCourseId ? styles['libraryPlayExited'] : undefined}
                    onClick={() => handleViewCourse(course.id)}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'tutorial' && (
        tutorialLibrary.length === 0 ? (
          <div className={styles['emptyState']}>
            {courseId !== null
              ? `No tutorials with ${kindLabel} documents found for this course.`
              : tutorialId !== null
                ? `No tutorial with ${kindLabel} documents found for this id.`
                : `No tutorials with ${kindLabel} documents found.`}
          </div>
        ) : (
          <div className={styles['libraryList']}>
            {tutorialLibrary.map((tutorial) => (
              <div
                key={tutorial.id}
                ref={tutorial.id === exitedTutorialId ? exitedLibraryItemRef : undefined}
                className={[
                  styles['libraryItem'],
                  tutorial.isHighlighted ? styles['libraryItemHighlighted'] : '',
                ].filter(Boolean).join(' ')}
              >
                <div>
                  <div
                    className={`${styles['chunkTitle']} ${styles['titleClickable']}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleToggleTutorialHighlight(tutorial.id)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      handleToggleTutorialHighlight(tutorial.id);
                    }}
                  >
                    {tutorial.title}
                  </div>
                  <div className={styles['chunkTime']}>
                    {tutorial.imageCount}
                    {' '}
                    document
                    {tutorial.imageCount === 1 ? '' : 's'}
                    {tutorial.quote ? ` · ${tutorial.quote}` : ''}
                  </div>
                </div>
                <div className={styles['libraryItemActions']}>
                  {tutorial.hasExportableImages && exportSupported && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      title={`Export ${kindLabel} to folder`}
                      aria-label={`Export ${kindLabel} to folder`}
                      disabled={exportInProgress}
                      onClick={() => handleExportTutorial(tutorial.id)}
                    >
                      <FaDownload />
                    </Button>
                  )}
                  <Button
                    variant={tutorial.id === exitedTutorialId ? 'secondary' : 'primary'}
                    className={
                      tutorial.id === exitedTutorialId ? styles['libraryPlayExited'] : undefined
                    }
                    onClick={() => handleViewTutorial(tutorial.id)}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'quiz' && (
        quizLibrary.length === 0 ? (
          <div className={styles['emptyState']}>
            {`No quizzes with ${kindLabel} course covers found.`}
          </div>
        ) : (
          <div className={styles['libraryList']}>
            {quizLibrary.map((quiz) => (
              <div
                key={quiz.id}
                className={[
                  styles['libraryItem'],
                  quiz.isHighlighted ? styles['libraryItemHighlighted'] : '',
                ].filter(Boolean).join(' ')}
              >
                <div>
                  <div
                    className={`${styles['chunkTitle']} ${styles['titleClickable']}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleToggleQuizHighlight(quiz.id)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      handleToggleQuizHighlight(quiz.id);
                    }}
                  >
                    {quiz.title}
                  </div>
                  <div className={styles['chunkTime']}>
                    {quiz.courseCount}
                    {' '}
                    course
                    {quiz.courseCount === 1 ? '' : 's'}
                    {quiz.quote ? ` · ${quiz.quote}` : ''}
                  </div>
                </div>
                <Button
                  variant="outline-primary"
                  onClick={() => navigate(buildLibraryUrl(basePath, 'course', { quizId: quiz.id, ldr }))}
                >
                  Browse
                </Button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

const MediaMarkdown: React.FC = () => <MediaDocuments documentKind="markdown" />;

export const MediaText: React.FC = () => <MediaDocuments documentKind="text" />;

export default MediaMarkdown;
