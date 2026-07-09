import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/types';
import {
  isDirectoryExportSupported,
  isDirectoryPickerSupported,
  pickDirectoryHandle,
  pickWritableDirectoryHandle,
  formatVideoImportProgressMessage,
} from '../library/directoryTreeUtils';
import {
  buildTutorialTreesFromVideoFolder,
  exportTutorialTreesToVideoFolder,
} from '../library/TemplatesManagerUtils';
import { fetchedHandles, prependError, prependWarning } from '../store/slices/errorSlice';
import { viewRequest } from '../store/slices/viewSlice';
import { setTutorials } from '../store/slices/tutorialSlice';

const VIDEO_IMPORT_MESSAGE = 'Segmenting and processing videos... please wait';

export const useVideoTutorialImportExport = () => {
  const dispatch = useDispatch();
  const inProgress = useSelector((state: RootState) => state.view.requestIsProcessing);
  const tutorialBanners = useSelector((state: RootState) => state.tutorial.banners);
  const tutorialContent = useSelector((state: RootState) => state.tutorial.content);

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

  const handleImportVideos = useCallback(async () => {
    const root = await pickDirectoryHandle();
    if (!root) return;

    await withProcessing(VIDEO_IMPORT_MESSAGE, async () => {
      const built = await buildTutorialTreesFromVideoFolder(root, {
        onProgress: ({ current, total }) => {
          dispatch(viewRequest({
            message: formatVideoImportProgressMessage(current, total),
            completed: false,
          }));
        },
      });
      if (!built || built.banners.length === 0) {
        dispatch(prependError(built?.errors[0] ?? 'No tutorial banners could be created from videos'));
        return;
      }
      built.errors.forEach((msg) => dispatch(prependError(msg)));
      built.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(fetchedHandles(built.handles));
      dispatch(setTutorials({ banners: built.banners, content: built.content }));
      dispatch(prependWarning(`Created ${built.banners.length} tutorials from videos`));
    });
  }, [dispatch, withProcessing]);

  const handleExportVideos = useCallback(async () => {
    const root = await pickWritableDirectoryHandle();
    if (!root) return;

    await withProcessing('Exporting videos... please wait', async () => {
      const result = await exportTutorialTreesToVideoFolder(root, tutorialBanners, tutorialContent);
      if (result.exportedBanners === 0) {
        dispatch(prependError(
          result.errors[0]
          ?? result.skipped[0]
          ?? 'No highlighted tutorial banners with video content to export',
        ));
        return;
      }
      result.errors.forEach((msg) => dispatch(prependError(msg)));
      result.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(prependWarning(
        `Exported ${result.exportedFiles} videos from ${result.exportedBanners} tutorial banners`,
      ));
    });
  }, [dispatch, tutorialBanners, tutorialContent, withProcessing]);

  return {
    inProgress,
    importSupported: isDirectoryPickerSupported(),
    exportSupported: isDirectoryExportSupported(),
    handleImportVideos,
    handleExportVideos,
  };
};
