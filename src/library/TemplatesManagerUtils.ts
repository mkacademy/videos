import { incrementID } from "../utils";
import {
  Banner as TutorialBanner,
  Content as TutorialContent,
} from "../store/slices/tutorialSlice";
import {
  Banner as CourseBanner,
  SlideGroup,
  SlideGroupItem,
  SlideItem,
} from "./CourseUtils";
import { Quiz } from "../store/slices/quizSlice";
import { TutorialTrees } from "./controlPanelUtils";
import { flushTutorialTrees } from "./controlPanelUtilz";
import { Metadata } from "../components/Core/types";
import {
  dataUrlByteLength,
  dataUrlToBlob,
  formatBannerCharacterQuote,
  formatBannerQuote,
  formatContentDescription,
  formatSizeLabel,
  isImageFileName,
  isTextFileName,
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
  splitTextIntoChunks,
  END_OF_FILE_MARKER,
  TEXT_CHUNK_SIZE,
  uniqueFileName,
  areFmp4VideoChunks,
  writeBlobToHandle,
  writeBase64ChunksToHandle,
} from "./directoryTreeUtils";
import { imageFileToDataUrl } from "./imageCompression";
import { VideoSegmentUtils } from "./videoSegmentUtils";
import {
  buildPlaylistFromTutorialVideoGroup,
  getPlaylistFmp4InitPayload,
  groupTutorialVideoBannerEntries,
  joinChunkPartPayloads,
  resolveCourseVideoInitPayload,
  validateCourseVideoPennants,
  validateTutorialVideoChunkBanners,
} from "./videoChunkPlayback";
import { withTruncatedSaveTitle } from "./DeletionManagerUtils";

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

      if (!isTextFileName(name)) continue;

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

export type TutorialTreesVideoExportResult = {
  exportedBanners: number;
  exportedFiles: number;
  errors: string[];
  skipped: string[];
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
      const segmentUtils = new VideoSegmentUtils();
      try {
        await segmentUtils.load();
        const blob = await segmentUtils.concatSegments(segmentPayloads, undefined, initPayload);
        await writeBlobToHandle(root, fileName, blob);
      } finally {
        segmentUtils.terminate();
      }
      exportedBanners += entries.length;
      exportedFiles += 1;
    } catch (error) {
      errors.push(`Failed to write "${fileName}" for "${title}": ${error}`);
    }
  }

  return { exportedBanners, exportedFiles, errors, skipped };
};

export type TutorialTreesAudioExportResult = {
  exportedBanners: number;
  exportedFiles: number;
  errors: string[];
  skipped: string[];
};

const contentRowsToBase64Payload = (
  rows: readonly TutorialContent[],
): { payload: string } | { error: string } => joinSplitPayloadRows(rows);

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

export type QuizTreesVideoExportResult = {
  exportedQuizzes: number;
  exportedBanners: number;
  exportedFiles: number;
  errors: string[];
  skipped: string[];
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

    const videoPennants = [...(banner.pennants ?? [])]
      .flatMap((pennant) => {
        const seq = parseVideoChunkSequence(pennant.quote);
        return seq ? [{ pennant, seq }] : [];
      })
      .sort((a, b) => a.seq.index - b.seq.index);

    if (videoPennants.length === 0) {
      skipped.push(`Skipped course "${banner.title}": no video chunk pennants`);
      continue;
    }

    const pennantValidation = validateCourseVideoPennants(banner, slideGroup);
    if (!pennantValidation.valid) {
      skipped.push(`Skipped course "${banner.title}": ${pennantValidation.error}`);
      continue;
    }

    const pennantPayloads: string[] = [];
    let pennantError: string | null = null;

    for (const { pennant } of videoPennants) {
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

    const initPayload = resolveCourseVideoInitPayload(banner, slideGroup);

    try {
      if (!areFmp4VideoChunks(pennantPayloads, initPayload)) {
        errors.push(`Skipped course "${banner.title}": not fMP4 video chunks`);
        continue;
      }
      const segmentUtils = new VideoSegmentUtils();
      try {
        await segmentUtils.load();
        const blob = await segmentUtils.concatSegments(pennantPayloads, undefined, initPayload);
        await writeBlobToHandle(root, fileName, blob);
      } finally {
        segmentUtils.terminate();
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
