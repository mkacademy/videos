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
  buildTutorialTreesFromAudioFolder,
  exportTutorialTreesToAudioFolder,
} from '../library/TemplatesManagerUtils';
import { fetchedHandles, prependError, prependWarning } from '../store/slices/errorSlice';
import { viewRequest } from '../store/slices/viewSlice';
import { setTutorials } from '../store/slices/tutorialSlice';

const AUDIO_IMPORT_MESSAGE = 'Processing audio... please wait';

export const useAudioTutorialImportExport = () => {
  const dispatch = useDispatch();
  const inProgress = useSelector((state: RootState) => state.view.requestIsProcessing);
  const tutorialBanners = useSelector((state: RootState) => state.tutorial.banners);
  const tutorialContent = useSelector((state: RootState) => state.tutorial.content);

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
      const built = await buildTutorialTreesFromAudioFolder(root);
      if (!built || built.banners.length === 0) {
        dispatch(prependError(built?.errors[0] ?? 'No tutorial banners could be created from audio'));
        return;
      }
      built.errors.forEach((msg) => dispatch(prependError(msg)));
      built.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(fetchedHandles(built.handles));
      dispatch(setTutorials({ banners: built.banners, content: built.content }));
      dispatch(prependWarning(`Created ${built.banners.length} tutorials from audio`));
    });
  }, [dispatch, withProcessing]);

  const handleExportAudio = useCallback(async () => {
    const root = await pickWritableDirectoryHandle();
    if (!root) return;

    await withProcessing(async () => {
      const result = await exportTutorialTreesToAudioFolder(root, tutorialBanners, tutorialContent);
      if (result.exportedBanners === 0) {
        dispatch(prependError(
          result.errors[0]
          ?? result.skipped[0]
          ?? 'No highlighted tutorial banners with audio content to export',
        ));
        return;
      }
      result.errors.forEach((msg) => dispatch(prependError(msg)));
      result.skipped.forEach((msg) => dispatch(prependWarning(msg)));
      dispatch(prependWarning(
        `Exported ${result.exportedFiles} audio files from ${result.exportedBanners} tutorial banners`,
      ));
    });
  }, [dispatch, tutorialBanners, tutorialContent, withProcessing]);

  return {
    inProgress,
    importSupported: isDirectoryPickerSupported(),
    exportSupported: isDirectoryExportSupported(),
    handleImportAudio,
    handleExportAudio,
  };
};
