import { useCallback, useState, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/types';
import { getCurAppName, isPncUserApp } from '../utils';
import {
  isDirectoryExportSupported,
  isDirectoryPickerSupported,
  pickDirectoryHandle,
  pickWritableDirectoryHandle,
  formatVideoImportProgressMessage,
} from '../library/directoryTreeUtils';
import {
  buildCourseTreesFromVideoFolder,
  buildQuizTreesFromVideoFolder,
  exportCourseTreesToVideoFolder,
  exportQuizTreesToVideoFolder,
} from '../library/TemplatesManagerUtils';
import {
  DEFAULT_VIDEO_CHUNK_SIZE_MB,
  type VideoChunkSizeMb,
  videoChunkSizeMbToBytes,
} from '../library/videoSegmentImport';
import { fetchedHandles, prependError, prependWarning } from '../store/slices/errorSlice';
import { viewRequest } from '../store/slices/viewSlice';
import { setCourses } from '../store/slices/courseSlice';
import { setQuizzes } from '../store/slices/quizSlice';

const VIDEO_IMPORT_MESSAGE = 'Segmenting and processing videos... please wait';

export const useVideoImportExport = () => {
  const dispatch = useDispatch();
  const [chunkSizeMb, setChunkSizeMb] = useState<VideoChunkSizeMb>(DEFAULT_VIDEO_CHUNK_SIZE_MB);
  const inProgress = useSelector((state: RootState) => state.view.requestIsProcessing);
  const source = useSelector((state: RootState) => state.settings.source);
  const curAppName = getCurAppName(source ?? 0);

  const courseBanners = useSelector((state: RootState) => state.course.banners);
  const courseContent = useSelector((state: RootState) => state.course.content);
  const quizQuizzes = useSelector((state: RootState) => state.quiz.quizzes);
  const quizBanners = useSelector((state: RootState) => state.quiz.banners);
  const quizContent = useSelector((state: RootState) => state.quiz.content);

  const isPncApp = isPncUserApp(source ?? 0);
  const isVideoApp = curAppName === 'course' || curAppName === 'quiz';

  const withProcessing = useCallback(async (
    message: string,
    task: () => Promise<void>,
  ) => {
    dispatch(viewRequest({ message, completed: false }));
    try {
      await task();
    } finally {
      dispatch(viewRequest({ completed: true }));
    }
  }, [dispatch]);

  const handleChunkSizeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const next = Number(event.target.value);
    if (next === 3 || next === 6 || next === 9 || next === 12) {
      setChunkSizeMb(next);
    }
  }, []);

  const handleImportVideos = useCallback(async () => {
    if (!isVideoApp) return;
    const root = await pickDirectoryHandle();
    if (!root) return;

    const targetChunkBytes = videoChunkSizeMbToBytes(chunkSizeMb);

    await withProcessing(VIDEO_IMPORT_MESSAGE, async () => {
      if (curAppName === 'quiz') {
        const built = await buildQuizTreesFromVideoFolder(root, {
          targetChunkBytes,
          onProgress: ({ current, total }) => {
            dispatch(viewRequest({
              message: formatVideoImportProgressMessage(current, total),
              completed: false,
            }));
          },
        });
        if (!built || built.quizzes.length === 0) {
          dispatch(prependError(built?.errors[0] ?? 'No quizzes could be created from videos'));
          return;
        }
        built.errors.forEach((msg) => dispatch(prependError(msg)));
        built.skipped.forEach((msg) => dispatch(prependWarning(msg)));
        dispatch(fetchedHandles(built.handles));
        dispatch(setQuizzes({
          quizzes: built.quizzes,
          banners: built.banners,
          content: built.content,
          Trees: built.Trees,
        }));
        dispatch(prependWarning(`Created ${built.quizzes.length} quizzes from videos`));
        return;
      }

      const built = await buildCourseTreesFromVideoFolder(root, {
        targetChunkBytes,
        onProgress: ({ current, total }) => {
          dispatch(viewRequest({
            message: formatVideoImportProgressMessage(current, total),
            completed: false,
          }));
        },
      });
      if (!built || built.banners.length === 0) {
        dispatch(prependError(built?.errors[0] ?? 'No course banners could be created from videos'));
        return;
      }
      built.errors.forEach((msg) => dispatch(prependError(msg)));
      built.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(fetchedHandles(built.handles));
      dispatch(setCourses({ banners: built.banners, content: built.content }));
      dispatch(prependWarning(`Created ${built.banners.length} courses from videos`));
    });
  }, [chunkSizeMb, curAppName, dispatch, isVideoApp, withProcessing]);

  const handleExportVideos = useCallback(async () => {
    if (!isVideoApp) return;
    const root = await pickWritableDirectoryHandle();
    if (!root) return;

    await withProcessing('Exporting videos... please wait', async () => {
      if (curAppName === 'quiz') {
        const result = await exportQuizTreesToVideoFolder(root, quizQuizzes, quizBanners, quizContent);
        if (result.exportedBanners === 0) {
          dispatch(prependError(
            result.errors[0]
            ?? result.skipped[0]
            ?? 'No highlighted quiz banners with video content to export',
          ));
          return;
        }
        result.errors.forEach((msg) => dispatch(prependError(msg)));
        result.skipped.forEach((msg) => dispatch(prependWarning(msg)));
        dispatch(prependWarning(
          `Exported ${result.exportedFiles} videos from ${result.exportedBanners} course banners in ${result.exportedQuizzes} quizzes`,
        ));
        return;
      }

      const result = await exportCourseTreesToVideoFolder(root, courseBanners, courseContent);
      if (result.exportedBanners === 0) {
        dispatch(prependError(
          result.errors[0]
          ?? result.skipped[0]
          ?? 'No highlighted course banners with video content to export',
        ));
        return;
      }
      result.errors.forEach((msg) => dispatch(prependError(msg)));
      result.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(prependWarning(
        `Exported ${result.exportedFiles} videos from ${result.exportedBanners} course banners`,
      ));
    });
  }, [
    curAppName,
    dispatch,
    courseBanners,
    courseContent,
    quizQuizzes,
    quizBanners,
    quizContent,
    isVideoApp,
    withProcessing,
  ]);

  return {
    inProgress,
    isPncApp,
    isVideoApp,
    importSupported: isPncApp && isVideoApp && isDirectoryPickerSupported(),
    exportSupported: isPncApp && isVideoApp && isDirectoryExportSupported(),
    chunkSizeMb,
    handleChunkSizeChange,
    handleImportVideos,
    handleExportVideos,
  };
};
