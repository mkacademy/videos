import React, { useCallback, useMemo } from 'react';
import { Alert, Button, Nav } from 'react-bootstrap';
import { createSearchParams, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { signOut } from '../../utils';
import { clearData as clearReducers } from '../../store/slices/rowSlice';
import { resetPlayback, setPlaybackWebapp } from '../../store/slices/playbackSlice';
import { mutateCurApp, setAllowMimeOnlyImageurlOverrideOnUpdateSteps } from '../../store/slices/sessionSlice';
import {
  buildChunkPlaylistFromCourseSlideGroup,
  buildChunkPlaylistFromTutorialVideoGroup,
  findTutorialVideoGroupForBanner,
  getCourseSlideGroupPayloadSignature,
  getTutorialVideoGroupPayloadSignature,
  resolveCourseSlideGroupForBanner,
  validateCourseVideoChunkQuotes,
  validateTutorialVideoChunkQuotes,
} from '../../library/videoChunkPlayback';
import CourseVideoPlayback from './CourseVideoPlayback';
import TutorialAudioPlayback from './TutorialAudioPlayback';
import {
  buildCourseVideoLibrary,
  buildCourseVideoPayloadReleaseUpdates,
  buildQuizVideoLibrary,
  buildTutorialVideoLibrary,
  exportCourseVideoBanner,
  getNextCourseVideoInLibrary,
  resolveMediaPlayerTab,
  type MediaPlayerTab,
} from './mediaPlayerUtils';
import { updateSteps } from '../../library/actions';
import { isDirectoryExportSupported, pickWritableDirectoryHandle } from '../../library/directoryTreeUtils';
import { prependError, prependWarning } from '../../store/slices/errorSlice';
import { clearEscrow, viewRequest } from '../../store/slices/viewSlice';
import { FaDownload, FaTrash } from 'react-icons/fa';
import MediaScreenSwitcher from '../MediaScreenSwitcher';
import * as styles from '../../styles/mediaPlayer.module.css';

const accountIconSrc = new URL('../../Images/user.png', import.meta.url).href;
const exitIconSrc = new URL('../../Images/3094700.png', import.meta.url).href;

function buildLibraryUrl(
  tab: MediaPlayerTab,
  params?: { videoId?: number; audioId?: number; quizId?: number; ldr?: string | null },
): string {
  const search = new URLSearchParams({ tab });
  if (params?.quizId !== undefined) {
    search.set('quizId', String(params.quizId));
  }
  if (params?.audioId !== undefined) {
    search.set('audioId', String(params.audioId));
  }
  if (params?.videoId !== undefined) {
    search.set('videoId', String(params.videoId));
  }
  if (params?.ldr) {
    search.set('ldr', params.ldr);
  }
  return `/media-player?${search.toString()}`;
}

const MediaPlayerAccountButton: React.FC = () => {
  const dispatch = useDispatch();
  const { pathname, search } = useLocation();
  const authenticated = useSelector((state: RootState) => state.session.authenticated);
  const pauseFetchers = useSelector((state: RootState) => state.session.pauseFetchers);
  const loginSearch = createSearchParams({ redirectUrl: pathname + search }).toString();

  const handleAccountClick = (e: React.MouseEvent) => {
    if (!authenticated) return;
    e.preventDefault();
    dispatch(clearReducers());
    dispatch(clearEscrow());
    dispatch({ type: signOut(pauseFetchers) });
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

const MediaPlayerTabs: React.FC<{
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
    <MediaPlayerAccountButton />
  </div>
);

const MediaPlayer: React.FC = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const tabParam = searchParams.get('tab');
  const activeTab = resolveMediaPlayerTab(tabParam, curApp);
  const ldr = searchParams.get('ldr');
  const videoIdParam = searchParams.get('videoId');
  const audioIdParam = searchParams.get('audioId');
  const quizIdParam = searchParams.get('quizId');
  const parsedVideoId = videoIdParam ? Number(videoIdParam) : NaN;
  const parsedAudioId = audioIdParam ? Number(audioIdParam) : NaN;
  const parsedQuizId = quizIdParam ? Number(quizIdParam) : NaN;
  const videoId = Number.isFinite(parsedVideoId) ? parsedVideoId : null;
  const audioId = Number.isFinite(parsedAudioId) ? parsedAudioId : null;
  const quizId = Number.isFinite(parsedQuizId) ? parsedQuizId : null;
  const hasSelectedMedia = activeTab === 'tutorial'
    ? audioId !== null
    : activeTab === 'course'
      ? videoId !== null
      : false;

  const [exitedCourseVideoId, setExitedCourseVideoId] = React.useState<number | null>(null);
  const [exitedTutorialAudioId, setExitedTutorialAudioId] = React.useState<number | null>(null);

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

  // Sync curApp to the active tab so switching tabs triggers hydration for that
  // webapp (HydrationManager reacts to mutateCurApp, mirroring the editor's screen switch).
  React.useEffect(() => {
    dispatch(mutateCurApp(activeTab));
  }, [activeTab, dispatch]);

  const courseLibrary = useMemo(
    () => {
      if (quizId !== null) {
        return buildCourseVideoLibrary(quizBanners, quizContent, quizId);
      }
      return buildCourseVideoLibrary(courseBanners, courseContent);
    },
    [quizId, quizBanners, quizContent, courseBanners, courseContent],
  );

  const tutorialLibrary = useMemo(
    () => buildTutorialVideoLibrary(tutorialBanners, tutorialContent),
    [tutorialBanners, tutorialContent],
  );

  const quizLibrary = useMemo(
    () => buildQuizVideoLibrary(quizQuizzes, quizBanners, quizContent),
    [quizQuizzes, quizBanners, quizContent],
  );

  const selectedCourseBanner = activeTab === 'course' && videoId !== null
    ? (quizId !== null
      ? quizBanners.find((banner) => banner.id === videoId)
      : courseBanners.find((banner) => banner.id === videoId)) ?? null
    : null;

  const selectedCourseSlideGroup = activeTab === 'course' && selectedCourseBanner
    ? resolveCourseSlideGroupForBanner(
      selectedCourseBanner,
      quizId !== null ? quizContent : courseContent,
    )
    : null;

  const selectedTutorialGroup = useMemo(() => {
    if (activeTab !== 'tutorial' || audioId === null) return null;
    return findTutorialVideoGroupForBanner(tutorialBanners, tutorialContent, audioId);
  }, [activeTab, audioId, tutorialBanners, tutorialContent]);

  const coursePayloadSignature = selectedCourseSlideGroup
    ? getCourseSlideGroupPayloadSignature(selectedCourseSlideGroup)
    : '';
  const tutorialPayloadSignature = selectedTutorialGroup
    ? getTutorialVideoGroupPayloadSignature(selectedTutorialGroup)
    : '';

  const hasValidChunkQuotes = useMemo(() => {
    if (activeTab === 'course' && selectedCourseBanner) {
      return validateCourseVideoChunkQuotes(selectedCourseBanner).valid;
    }
    if (activeTab === 'tutorial' && selectedTutorialGroup) {
      return validateTutorialVideoChunkQuotes(
        selectedTutorialGroup.map((entry) => entry.banner),
      ).valid;
    }
    return false;
  }, [activeTab, selectedCourseBanner, selectedTutorialGroup]);

  const expectedChunkCount = useMemo(() => {
    if (activeTab === 'course' && selectedCourseBanner) {
      const result = validateCourseVideoChunkQuotes(selectedCourseBanner);
      return result.valid ? result.chunkCount : 0;
    }
    if (activeTab === 'tutorial' && selectedTutorialGroup) {
      const result = validateTutorialVideoChunkQuotes(
        selectedTutorialGroup.map((entry) => entry.banner),
      );
      return result.valid ? result.chunkCount : 0;
    }
    return 0;
  }, [activeTab, selectedCourseBanner, selectedTutorialGroup]);

  const { chunks: chunkPlaylist, error: playlistError } = useMemo(() => {
    if (activeTab === 'course' && selectedCourseBanner && selectedCourseSlideGroup) {
      return buildChunkPlaylistFromCourseSlideGroup(selectedCourseBanner, selectedCourseSlideGroup);
    }
    if (activeTab === 'tutorial' && selectedTutorialGroup) {
      return buildChunkPlaylistFromTutorialVideoGroup(selectedTutorialGroup);
    }
    return { chunks: [], error: null };
  }, [
    activeTab,
    selectedCourseBanner,
    selectedCourseSlideGroup,
    selectedTutorialGroup,
    coursePayloadSignature,
    tutorialPayloadSignature,
  ]);

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
    setSearchParams(ldr ? { tab, ldr } : { tab });
  }, [ldr, setSearchParams]);

  const handleChangeCourseMedia = useCallback(() => {
    if (videoId !== null) {
      setExitedCourseVideoId(videoId);
    }
    navigate(buildLibraryUrl('course', { quizId: quizId ?? undefined, ldr }));
  }, [ldr, navigate, quizId, videoId]);

  const handleChangeTutorialMedia = useCallback(() => {
    if (audioId !== null) {
      setExitedTutorialAudioId(audioId);
    }
    navigate(buildLibraryUrl('tutorial', { ldr }));
  }, [audioId, ldr, navigate]);

  const handlePlayCourseVideo = useCallback((id: number) => {
    setExitedCourseVideoId(null);
    navigate(buildLibraryUrl('course', { videoId: id, quizId: quizId ?? undefined, ldr }));
  }, [ldr, navigate, quizId]);

  const handleReleaseCourseVideoPayload = useCallback((id: number) => {
    const banners = quizId !== null ? quizBanners : courseBanners;
    const contentGroups = quizId !== null ? quizContent : courseContent;
    const banner = banners.find((entry) => entry.id === id);
    if (!banner) return;

    const updates = buildCourseVideoPayloadReleaseUpdates(banner, contentGroups);
    if (updates.length > 0) {
      dispatch(setAllowMimeOnlyImageurlOverrideOnUpdateSteps(true));
      dispatch(updateSteps(updates));
      dispatch(setAllowMimeOnlyImageurlOverrideOnUpdateSteps(false));
    }
  }, [courseBanners, courseContent, dispatch, quizBanners, quizContent, quizId]);

  const handleExportCourseVideo = useCallback(async (id: number) => {
    if (!exportSupported || exportInProgress) return;

    const banners = quizId !== null ? quizBanners : courseBanners;
    const contentGroups = quizId !== null ? quizContent : courseContent;
    const banner = banners.find((entry) => entry.id === id);
    if (!banner) return;

    const root = await pickWritableDirectoryHandle();
    if (!root) return;

    dispatch(viewRequest({ message: 'Exporting video... please wait', completed: false }));
    try {
      const result = await exportCourseVideoBanner(root, banner, contentGroups);
      if (result.exportedBanners === 0) {
        dispatch(prependError(
          result.errors[0]
          ?? result.skipped[0]
          ?? 'No video content to export',
        ));
        return;
      }
      result.errors.forEach((msg) => dispatch(prependError(msg)));
      result.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(prependWarning(`Exported "${banner.title}"`));
    } finally {
      dispatch(viewRequest({ completed: true }));
    }
  }, [
    courseBanners,
    courseContent,
    dispatch,
    exportInProgress,
    exportSupported,
    quizBanners,
    quizContent,
    quizId,
  ]);

  const handlePlayTutorialAudio = useCallback((id: number) => {
    setExitedTutorialAudioId(null);
    navigate(buildLibraryUrl('tutorial', { audioId: id, ldr }));
  }, [ldr, navigate]);

  const handlePlaylistFinished = useCallback(() => {
    if (quizId === null || activeTab !== 'course' || videoId === null) return;

    const nextVideo = getNextCourseVideoInLibrary(courseLibrary, videoId);
    if (!nextVideo) return;

    dispatch(resetPlayback());

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'course');
      next.set('videoId', String(nextVideo.id));
      next.set('quizId', String(quizId));
      return next;
    });
  }, [activeTab, courseLibrary, dispatch, quizId, setSearchParams, videoId]);

  const tabs = (
    <MediaPlayerTabs activeTab={activeTab} onSelect={handleTabSelect} />
  );

  const selectedTitle = activeTab === 'course'
    ? selectedCourseBanner?.title
    : selectedTutorialGroup?.[0]?.banner.title;

  if (!hasSelectedMedia) {
    const librarySubtitle = activeTab === 'course'
      ? (quizId !== null ? 'Choose a video to play from this quiz.' : 'Choose a video to play.')
      : activeTab === 'tutorial'
        ? 'Choose a tutorial audio track to play.'
        : 'Choose a quiz to browse its videos.';

    return (
      <div className={styles['container']}>
        <div className={styles['headerRow']}>
          <div>
            <h1 className={styles['title']}>Media Player</h1>
            <p className={styles['subtitle']}>{librarySubtitle}</p>
          </div>
          <div className={styles['headerActions']}>
            <MediaScreenSwitcher />
          </div>
        </div>

        {tabs}

        {activeTab === 'course' && quizId !== null && (
          <div className={styles['filterBanner']}>
            <span>Showing course videos for quiz #{quizId}</span>
            <Link to={buildLibraryUrl('quiz', { ldr })}>Back to quizzes</Link>
          </div>
        )}

        {activeTab === 'course' && (
          courseLibrary.length === 0 ? (
            <div className={styles['emptyState']}>
              {quizId !== null
                ? 'No course videos found in this quiz.'
                : 'No course videos found. Import videos from the course screen first.'}
            </div>
          ) : (
            <div className={styles['libraryList']}>
              {courseLibrary.map((video) => (
                <div key={video.id} className={styles['libraryItem']}>
                  <div>
                    <div className={styles['chunkTitle']}>{video.title}</div>
                    <div className={styles['chunkTime']}>
                      {video.chunkCount} chunks{video.quote ? ` · ${video.quote}` : ''}
                    </div>
                  </div>
                  <div className={styles['libraryItemActions']}>
                    {video.hasExportablePayload && exportSupported && (
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        title="Export video to folder"
                        aria-label="Export video to folder"
                        disabled={exportInProgress}
                        onClick={() => handleExportCourseVideo(video.id)}
                      >
                        <FaDownload />
                      </Button>
                    )}
                    {video.hasReleasablePayload && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        title="Release chunk data from memory"
                        aria-label="Release chunk data from memory"
                        onClick={() => handleReleaseCourseVideoPayload(video.id)}
                      >
                        <FaTrash />
                      </Button>
                    )}
                    <Button
                      variant={video.id === exitedCourseVideoId ? 'secondary' : 'primary'}
                      className={video.id === exitedCourseVideoId ? styles['libraryPlayExited'] : undefined}
                      onClick={() => handlePlayCourseVideo(video.id)}
                    >
                      Play
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
              No tutorial audio found. Import audio from the tutorial screen first.
            </div>
          ) : (
            <div className={styles['libraryList']}>
              {tutorialLibrary.map((audio) => (
                <div key={audio.id} className={styles['libraryItem']}>
                  <div>
                    <div className={styles['chunkTitle']}>{audio.title}</div>
                    <div className={styles['chunkTime']}>
                      {audio.chunkCount} chunks{audio.quote ? ` · ${audio.quote}` : ''}
                    </div>
                  </div>
                  <Button
                    variant={audio.id === exitedTutorialAudioId ? 'secondary' : 'primary'}
                    className={audio.id === exitedTutorialAudioId ? styles['libraryPlayExited'] : undefined}
                    onClick={() => handlePlayTutorialAudio(audio.id)}
                  >
                    Play
                  </Button>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'quiz' && (
          quizLibrary.length === 0 ? (
            <div className={styles['emptyState']}>
              No quizzes with video content found. Import videos from the quiz screen first.
            </div>
          ) : (
            <div className={styles['libraryList']}>
              {quizLibrary.map((quiz) => (
                <div key={quiz.id} className={styles['libraryItem']}>
                  <div>
                    <div className={styles['chunkTitle']}>{quiz.title}</div>
                    <div className={styles['chunkTime']}>
                      {quiz.courseCount} course video{quiz.courseCount === 1 ? '' : 's'}
                      {quiz.quote ? ` · ${quiz.quote}` : ''}
                    </div>
                  </div>
                  <Button
                    variant="outline-primary"
                    onClick={() => navigate(buildLibraryUrl('course', { quizId: quiz.id, ldr }))}
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
  }

  if (!selectedTitle || !hasValidChunkQuotes) {
    const mediaLabel = activeTab === 'tutorial' ? 'audio' : 'video';
    const mediaId = activeTab === 'tutorial' ? audioId : videoId;
    return (
      <div className={styles['container']}>
        <div className={styles['headerRow']}>
          <h1 className={styles['title']}>Media Player</h1>
          <div className={styles['headerActions']}>
            <MediaScreenSwitcher />
          </div>
        </div>
        {tabs}
        <Alert variant="warning">
          No {mediaLabel} with a valid chunk sequence found for id <strong>{mediaId}</strong>.
        </Alert>
        <Link to={buildLibraryUrl(activeTab, { quizId: quizId ?? undefined, ldr })}>Back to library</Link>
      </div>
    );
  }

  if (activeTab === 'tutorial' && selectedTutorialGroup) {
    return (
      <TutorialAudioPlayback
        title={selectedTitle}
        chunkPlaylist={chunkPlaylist}
        playlistError={playlistError}
        expectedChunkCount={expectedChunkCount}
        selectedTutorialGroup={selectedTutorialGroup}
        autoPlay={audioId !== null}
        onChangeMedia={handleChangeTutorialMedia}
        tabs={tabs}
      />
    );
  }

  if (activeTab === 'course' && selectedCourseBanner && selectedCourseSlideGroup) {
    return (
      <CourseVideoPlayback
        title={selectedTitle}
        chunkPlaylist={chunkPlaylist}
        playlistError={playlistError}
        expectedChunkCount={expectedChunkCount}
        selectedCourseBanner={selectedCourseBanner}
        selectedCourseSlideGroup={selectedCourseSlideGroup}
        autoPlay={videoId !== null}
        onChangeMedia={handleChangeCourseMedia}
        onPlaylistFinished={handlePlaylistFinished}
        tabs={tabs}
      />
    );
  }

  return (
    <div className={styles['container']}>
      <div className={styles['headerRow']}>
        <h1 className={styles['title']}>Media Player</h1>
        <div className={styles['headerActions']}>
          <MediaScreenSwitcher />
        </div>
      </div>
      {tabs}
      <Alert variant="warning">
        Playback is only available on the tutorial and course tabs.
      </Alert>
      <Link to={buildLibraryUrl(activeTab, { quizId: quizId ?? undefined, ldr })}>Back to library</Link>
    </div>
  );
};

export default MediaPlayer;
