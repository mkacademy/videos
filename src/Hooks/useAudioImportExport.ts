import { useCallback, useState, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/types';
import { getCurAppName, isPncUserApp } from '../utils';
import {
  isDirectoryExportSupported,
  isDirectoryPickerSupported,
  pickDirectoryHandle,
  pickWritableDirectoryHandle,
  DEFAULT_AUDIO_CHUNK_SIZE_MB,
  type AudioChunkSizeMb,
  audioChunkSizeMbToBytes,
} from '../library/directoryTreeUtils';
import {
  buildTutorialTreesFromAudioFolder,
  exportTutorialTreesToAudioFolder,
} from '../library/TemplatesManagerUtils';
import { fetchedHandles, prependError, prependWarning } from '../store/slices/errorSlice';
import { viewRequest } from '../store/slices/viewSlice';
import { setTutorials } from '../store/slices/tutorialSlice';

const AUDIO_IMPORT_MESSAGE = 'Processing audio... please wait';

export const useAudioImportExport = () => {
  const dispatch = useDispatch();
  const [chunkSizeMb, setChunkSizeMb] = useState<AudioChunkSizeMb>(DEFAULT_AUDIO_CHUNK_SIZE_MB);
  const inProgress = useSelector((state: RootState) => state.view.requestIsProcessing);
  const source = useSelector((state: RootState) => state.settings.source);
  const curAppName = getCurAppName(source ?? 0);

  const tutorialBanners = useSelector((state: RootState) => state.tutorial.banners);
  const tutorialContent = useSelector((state: RootState) => state.tutorial.content);

  const isPncApp = isPncUserApp(source ?? 0);
  const isTutorialApp = curAppName === 'tutorial';

  const withProcessing = useCallback(async (task: () => Promise<void>) => {
    dispatch(viewRequest({ message: AUDIO_IMPORT_MESSAGE, completed: false }));
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

  const handleImportAudio = useCallback(async () => {
    if (!isTutorialApp) return;
    const root = await pickDirectoryHandle();
    if (!root) return;

    const targetChunkBytes = audioChunkSizeMbToBytes(chunkSizeMb);

    await withProcessing(async () => {
      const built = await buildTutorialTreesFromAudioFolder(root, { targetChunkBytes });
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
  }, [chunkSizeMb, dispatch, isTutorialApp, withProcessing]);

  const handleExportAudio = useCallback(async () => {
    if (!isTutorialApp) return;
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
  }, [dispatch, isTutorialApp, tutorialBanners, tutorialContent, withProcessing]);

  return {
    inProgress,
    isPncApp,
    isTutorialApp,
    importSupported: isPncApp && isTutorialApp && isDirectoryPickerSupported(),
    exportSupported: isPncApp && isTutorialApp && isDirectoryExportSupported(),
    chunkSizeMb,
    handleChunkSizeChange,
    handleImportAudio,
    handleExportAudio,
  };
};
