import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/types';
import {
  isDirectoryExportSupported,
  isDirectoryPickerSupported,
  pickDirectoryHandle,
  pickWritableDirectoryHandle,
} from '../library/directoryTreeUtils';
import {
  buildCourseTreesFromAudioFolder,
  exportCourseTreesToAudioFolder,
} from '../library/TemplatesManagerUtils';
import { fetchedHandles, prependError, prependWarning } from '../store/slices/errorSlice';
import { viewRequest } from '../store/slices/viewSlice';
import { setCourses } from '../store/slices/courseSlice';

const AUDIO_IMPORT_MESSAGE = 'Processing audio... please wait';

export const useAudioCourseImportExport = () => {
  const dispatch = useDispatch();
  const inProgress = useSelector((state: RootState) => state.view.requestIsProcessing);
  const courseBanners = useSelector((state: RootState) => state.course.banners);
  const courseContent = useSelector((state: RootState) => state.course.content);

  const withProcessing = useCallback(async (task: () => Promise<void>) => {
    dispatch(viewRequest({ message: AUDIO_IMPORT_MESSAGE, completed: false }));
    try {
      await task();
    } finally {
      dispatch(viewRequest({ completed: true }));
    }
  }, [dispatch]);

  const handleImportAudio = useCallback(async () => {
    const root = await pickDirectoryHandle();
    if (!root) return;

    await withProcessing(async () => {
      const built = await buildCourseTreesFromAudioFolder(root);
      if (!built || built.banners.length === 0) {
        dispatch(prependError(built?.errors[0] ?? 'No course banners could be created from audio'));
        return;
      }
      built.errors.forEach((msg) => dispatch(prependError(msg)));
      built.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(fetchedHandles(built.handles));
      dispatch(setCourses({ banners: built.banners, content: built.content }));
      dispatch(prependWarning(`Created ${built.banners.length} courses from audio`));
    });
  }, [dispatch, withProcessing]);

  const handleExportAudio = useCallback(async () => {
    const root = await pickWritableDirectoryHandle();
    if (!root) return;

    await withProcessing(async () => {
      const result = await exportCourseTreesToAudioFolder(root, courseBanners, courseContent);
      if (result.exportedBanners === 0) {
        dispatch(prependError(
          result.errors[0]
          ?? result.skipped[0]
          ?? 'No highlighted course banners with audio content to export',
        ));
        return;
      }
      result.errors.forEach((msg) => dispatch(prependError(msg)));
      result.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(prependWarning(
        `Exported ${result.exportedFiles} audio files from ${result.exportedBanners} course banners`,
      ));
    });
  }, [dispatch, courseBanners, courseContent, withProcessing]);

  return {
    inProgress,
    importSupported: isDirectoryPickerSupported(),
    exportSupported: isDirectoryExportSupported(),
    handleImportAudio,
    handleExportAudio,
  };
};
