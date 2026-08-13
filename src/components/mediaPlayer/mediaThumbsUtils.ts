import type { Banner as CourseBanner, Pennant, SlideGroup, SlideGroupItem } from '../../library/CourseUtils';
import { isSlideGroupItem } from '../../library/CourseUtils';
import type { Banner as TutorialBanner, Content as TutorialContent } from '../../library/TutorialUtils';
import type { Quiz } from '../../store/slices/quizSlice';
import {
  buildChunkBufferingLogEntries,
  resolveCourseSlideGroupForBanner,
  type ChunkBufferingEntry,
  type ChunkPartRow,
} from '../../library/videoChunkPlayback';
import {
  dataUrlToBlob,
  findContentRowsForBannerId,
  resolveExportFileName,
  resolveMarkdownExportFileName,
  resolveTextExportFileName,
  sanitizePathSegment,
  textDataUrlToBlob,
  uniqueFileName,
  writeBlobToHandle,
} from '../../library/directoryTreeUtils';
import { isImageSlotValue, isMarkdownSlotValue, isMimeOnlyMediaUrl, isPlainTextSlotValue } from '../../library/imageUtils';
import { resolveMediaPlayerTab, type MediaPlayerTab } from './mediaPlayerUtils';

export type { MediaPlayerTab };
export { resolveMediaPlayerTab };

/** Which media-slot type a thumbs/markdown/text library lists. */
export type ThumbsSlotKind = 'image' | 'markdown' | 'text';

export type DocumentMediaKind = 'markdown' | 'text';

export type ThumbsLibraryEntry = {
  id: number;
  title: string;
  quote?: string;
  imageCount: number;
  hasExportableImages: boolean;
  isHighlighted?: boolean;
};

export type ThumbsQuizLibraryEntry = {
  id: number;
  title: string;
  quote?: string;
  courseCount: number;
  isHighlighted?: boolean;
};

export type ThumbsPlaylistItem = {
  id: number;
  title: string;
  imageurl: string;
  ordinal: number;
  bannerId: number;
  content?: string;
  metadata?: ChunkPartRow['metadata'];
  sizeInBytes?: number;
  isHighlighted?: boolean;
  /** Which store lane to toggle when the title is clicked. */
  highlightSource?: 'content' | 'cover' | 'slide';
  /** Course cover rows only — coupled tutorial banner id when known. */
  coupledTutorialId?: number | null;
};

function contentRowsForBanner(
  contentGroups: readonly (readonly TutorialContent[])[],
  bannerId: number,
): TutorialContent[] {
  return [...findContentRowsForBannerId(contentGroups, bannerId)];
}

export function matchesThumbsSlotKind(imageurl: string, kind: ThumbsSlotKind): boolean {
  if (kind === 'markdown') return isMarkdownSlotValue(imageurl);
  if (kind === 'text') return isPlainTextSlotValue(imageurl);
  return isImageSlotValue(imageurl);
}

function filterRowsBySlotKind<T extends { imageurl: string }>(
  rows: readonly T[],
  kind: ThumbsSlotKind,
): T[] {
  return rows.filter((row) => matchesThumbsSlotKind(row.imageurl, kind));
}

function rowHasExportableImage(imageurl: string): boolean {
  return dataUrlToBlob(imageurl) !== null;
}

function rowHasExportableMarkdown(imageurl: string): boolean {
  return isMarkdownSlotValue(imageurl) && textDataUrlToBlob(imageurl) !== null;
}

function rowHasExportableText(imageurl: string): boolean {
  return isPlainTextSlotValue(imageurl) && textDataUrlToBlob(imageurl) !== null;
}

function rowHasExportableDocument(imageurl: string, kind: DocumentMediaKind): boolean {
  return kind === 'markdown'
    ? rowHasExportableMarkdown(imageurl)
    : rowHasExportableText(imageurl);
}

function courseCoverItems(slideGroup: SlideGroup): SlideGroupItem[] {
  return Object.keys(slideGroup)
    .filter((key) => key !== 'slides')
    .map((key) => Number(key))
    .filter((ordinal) => Number.isInteger(ordinal))
    .sort((a, b) => a - b)
    .flatMap((ordinal) => {
      const item = slideGroup[ordinal];
      return isSlideGroupItem(item) ? [item] : [];
    });
}

export function buildTutorialThumbsLibrary(
  banners: readonly TutorialBanner[],
  contentGroups: readonly (readonly TutorialContent[])[],
  allowedIds?: ReadonlySet<number> | null,
  slotKind: ThumbsSlotKind = 'image',
): ThumbsLibraryEntry[] {
  const entries = [...banners]
    .sort((a, b) => a.ordinal - b.ordinal)
    .flatMap((banner) => {
      if (allowedIds != null && !allowedIds.has(banner.id)) return [];
      const rows = filterRowsBySlotKind(
        contentRowsForBanner(contentGroups, banner.id),
        slotKind,
      );
      if (rows.length === 0 && allowedIds == null) return [];
      const hasExportable = slotKind === 'markdown'
        ? rows.some((row) => rowHasExportableMarkdown(row.imageurl))
        : slotKind === 'text'
          ? rows.some((row) => rowHasExportableText(row.imageurl))
          : rows.some((row) => rowHasExportableImage(row.imageurl));
      return [{
        id: banner.id,
        title: banner.title,
        quote: banner.quote,
        imageCount: rows.length,
        hasExportableImages: hasExportable,
        isHighlighted: banner.isHighlighted,
      }];
    });

  if (allowedIds == null) return entries;

  const present = new Set(entries.map((entry) => entry.id));
  const stubs = [...allowedIds]
    .filter((id) => Number.isFinite(id) && id > 0 && !present.has(id))
    .map((id) => ({
      id,
      title: `Tutorial #${id}`,
      imageCount: 0,
      hasExportableImages: false,
      isHighlighted: false,
    }));

  return [...entries, ...stubs].sort((a, b) => a.id - b.id);
}

export function buildCourseThumbsLibrary(
  banners: readonly CourseBanner[],
  contentGroups: readonly SlideGroup[],
  quizId?: number | null,
  slotKind: ThumbsSlotKind = 'image',
): ThumbsLibraryEntry[] {
  return [...banners]
    .sort((a, b) => a.ordinal - b.ordinal)
    .flatMap((banner) => {
      if (quizId !== null && quizId !== undefined && banner.bannerId !== quizId) {
        return [];
      }
      const slideGroup = resolveCourseSlideGroupForBanner(banner, contentGroups);
      if (!slideGroup) return [];
      const covers = filterRowsBySlotKind(courseCoverItems(slideGroup), slotKind);
      if (covers.length === 0) return [];
      const hasExportable = slotKind === 'markdown'
        ? covers.some((cover) => rowHasExportableMarkdown(cover.imageurl))
        : slotKind === 'text'
          ? covers.some((cover) => rowHasExportableText(cover.imageurl))
          : covers.some((cover) => rowHasExportableImage(cover.imageurl));
      return [{
        id: banner.id,
        title: banner.title,
        quote: banner.quote,
        imageCount: covers.length,
        hasExportableImages: hasExportable,
        isHighlighted: banner.isHighlighted,
      }];
    });
}

export function buildQuizThumbsLibrary(
  quizzes: readonly Quiz[],
  banners: readonly CourseBanner[],
  contentGroups: readonly SlideGroup[],
  slotKind: ThumbsSlotKind = 'image',
): ThumbsQuizLibraryEntry[] {
  return quizzes.flatMap((quiz) => {
    const courseCount = buildCourseThumbsLibrary(
      banners,
      contentGroups,
      quiz.id,
      slotKind,
    ).length;
    if (courseCount === 0) return [];
    return [{
      id: quiz.id,
      title: quiz.title,
      quote: quiz.quote,
      courseCount,
      isHighlighted: quiz.isHighlighted,
    }];
  });
}

function pennantForCover(
  cover: SlideGroupItem,
  banner: CourseBanner,
  slideGroup: SlideGroup,
): Pennant | null {
  const pennants = banner.pennants ?? [];
  const slides = slideGroup.slides ?? [];
  const ordinalMatches = pennants.filter(
    (pennant) => pennant.bannerId === cover.bannerId && pennant.ordinal === cover.ordinal,
  );
  const coupled = ordinalMatches.find((pennant) => slides.some(
    (slideArray) => slideArray.length > 0 && slideArray[0].bannerId === pennant.id,
  ));
  return coupled ?? ordinalMatches[0] ?? null;
}

export function resolveTutorialIdForCourseCover(
  cover: SlideGroupItem,
  banner: CourseBanner,
  slideGroup: SlideGroup,
  tutorialContent: readonly (readonly TutorialContent[])[],
): number | null {
  const pennant = pennantForCover(cover, banner, slideGroup);
  if (pennant) {
    // filterId: 0 is a template/default placeholder, not a real coupling.
    const fromFilterId = pennant.filterId != null && pennant.filterId > 0
      ? pennant.filterId
      : null;
    const resolved = fromFilterId ?? (pennant.id > 0 ? pennant.id : null);
    if (resolved != null) return resolved;
  }

  for (const group of tutorialContent) {
    for (const row of group) {
      if (row.id === cover.id && row.bannerId > 0) {
        return row.bannerId;
      }
    }
  }
  return null;
}

/** Tutorial banner ids coupled to a course’s covers (pennant filterId/id, with content fallback). */
export function collectCoupledTutorialIdsForCourse(
  banner: CourseBanner,
  slideGroup: SlideGroup,
  tutorialContent: readonly (readonly TutorialContent[])[] = [],
): Set<number> {
  const ids = new Set<number>();
  for (const cover of courseCoverItems(slideGroup)) {
    const tutorialId = resolveTutorialIdForCourseCover(
      cover,
      banner,
      slideGroup,
      tutorialContent,
    );
    if (tutorialId != null) ids.add(tutorialId);
  }
  return ids;
}

export function buildThumbsPlaylistFromTutorial(
  bannerId: number,
  contentGroups: readonly (readonly TutorialContent[])[],
  slotKind: ThumbsSlotKind = 'image',
): ThumbsPlaylistItem[] {
  return filterRowsBySlotKind(contentRowsForBanner(contentGroups, bannerId), slotKind)
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((row) => ({
      id: row.id,
      title: row.title,
      imageurl: row.imageurl,
      ordinal: row.ordinal,
      bannerId: row.bannerId,
      content: row.content,
      sizeInBytes: row.sizeInBytes,
      isHighlighted: row.isHighlighted,
      highlightSource: 'content' as const,
    }));
}

/** Course chapter slides (`filtersinstructions`) for a pennant / coupled tutorial id. */
export function buildThumbsPlaylistFromCourseChapter(
  slideGroup: SlideGroup,
  chapterId: number,
  slotKind: ThumbsSlotKind = 'image',
): ThumbsPlaylistItem[] {
  const row = (slideGroup.slides ?? []).find(
    (r) => r.length > 0 && r[0].bannerId === chapterId,
  );
  if (!row) return [];
  const seenIds = new Set<number>();
  return filterRowsBySlotKind(row, slotKind)
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
    .filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    })
    .map((item) => ({
      id: item.id,
      title: item.title,
      imageurl: item.imageurl,
      ordinal: item.ordinal,
      bannerId: item.bannerId,
      content: item.content,
      metadata: item.metadata,
      sizeInBytes: item.sizeInBytes,
      isHighlighted: item.isHighlighted,
      highlightSource: 'slide' as const,
    }));
}

/** Single mime-only image slot so the viewer can render placeholders while buffering. */
export function buildMimePlaceholderPlaylistItem(
  bannerId: number,
  title?: string,
): ThumbsPlaylistItem {
  return {
    id: bannerId,
    title: title || `Tutorial #${bannerId}`,
    imageurl: 'data:image',
    ordinal: 0,
    bannerId,
  };
}

export function buildThumbsPlaylistFromCourseCovers(
  banner: CourseBanner,
  slideGroup: SlideGroup,
  tutorialContent: readonly (readonly TutorialContent[])[] = [],
  slotKind: ThumbsSlotKind = 'image',
): ThumbsPlaylistItem[] {
  return filterRowsBySlotKind(courseCoverItems(slideGroup), slotKind).map((cover) => ({
    id: cover.id,
    title: cover.title,
    imageurl: cover.imageurl,
    ordinal: cover.ordinal,
    bannerId: cover.bannerId,
    content: cover.content,
    metadata: cover.metadata,
    sizeInBytes: cover.sizeInBytes,
    isHighlighted: cover.isHighlighted,
    highlightSource: 'cover' as const,
    coupledTutorialId: resolveTutorialIdForCourseCover(
      cover,
      banner,
      slideGroup,
      tutorialContent,
    ),
  }));
}

/** Decode a markdown data-URL slot to UTF-8 source text. */
export async function decodeMarkdownSlotText(imageurl: string): Promise<string | null> {
  const blob = textDataUrlToBlob(imageurl);
  if (!blob) return null;
  try {
    return await blob.text();
  } catch {
    return null;
  }
}

function toChunkPartRow(item: ThumbsPlaylistItem): ChunkPartRow {
  return {
    id: item.id,
    bannerId: item.bannerId,
    content: item.content ?? '',
    imageurl: item.imageurl,
    ordinal: item.ordinal,
    metadata: item.metadata,
    sizeInBytes: item.sizeInBytes,
  };
}

function needsRemoteFetch(imageurl: string): boolean {
  return isMimeOnlyMediaUrl(imageurl);
}

/** Queue bytesFetcher entries for thumbs playlist rows (course covers = thumb/sifters; tutorial = part/filters). */
export function collectThumbsBufferingEntries(
  items: readonly ThumbsPlaylistItem[],
  kind: 'tutorial' | 'course',
): ChunkBufferingEntry[] {
  const thumbEntries: ChunkBufferingEntry[] = [];
  const partEntries: ChunkBufferingEntry[] = [];

  items.forEach((item, index) => {
    if (!needsRemoteFetch(item.imageurl)) return;
    const row = toChunkPartRow(item);
    if (kind === 'course') {
      thumbEntries.push(...buildChunkBufferingLogEntries(index, [], [row]));
    } else {
      partEntries.push(...buildChunkBufferingLogEntries(index, [row]));
    }
  });

  return [...thumbEntries, ...partEntries];
}

export type ThumbsImageExportResult = {
  exportedBanners: number;
  exportedImages: number;
  errors: string[];
  skipped: string[];
};

async function writeImageRowsToBannerDir(
  root: FileSystemDirectoryHandle,
  folderTitle: string,
  rows: readonly { title: string; imageurl: string }[],
  usedBannerDirs: Set<string>,
): Promise<{ written: number; errors: string[]; skipped: string[] }> {
  const errors: string[] = [];
  const skipped: string[] = [];
  const dirBase = uniqueFileName(sanitizePathSegment(folderTitle), usedBannerDirs);
  let bannerDir: FileSystemDirectoryHandle;
  try {
    bannerDir = await root.getDirectoryHandle(dirBase, { create: true });
  } catch (error) {
    errors.push(`Failed to create directory for "${folderTitle}": ${error}`);
    return { written: 0, errors, skipped };
  }

  const usedFileNames = new Set<string>();
  let written = 0;
  for (const row of rows) {
    const blob = dataUrlToBlob(row.imageurl);
    if (!blob) {
      skipped.push(`Skipped "${row.title}" in "${folderTitle}": no exportable image`);
      continue;
    }
    const fileName = uniqueFileName(resolveExportFileName(row.title, blob.type), usedFileNames);
    try {
      await writeBlobToHandle(bannerDir, fileName, blob);
      written += 1;
    } catch (error) {
      errors.push(`Failed to write "${fileName}" in "${folderTitle}": ${error}`);
    }
  }
  return { written, errors, skipped };
}

function pickExportRows<T extends { isHighlighted?: boolean; imageurl: string; title: string }>(
  rows: readonly T[],
  isExportable: (imageurl: string) => boolean,
): T[] {
  const highlighted = rows.filter((row) => row.isHighlighted && isExportable(row.imageurl));
  if (highlighted.length > 0) return highlighted;
  return rows.filter((row) => isExportable(row.imageurl));
}

async function writeTextSlotRowsToBannerDir(
  root: FileSystemDirectoryHandle,
  folderTitle: string,
  rows: readonly { title: string; imageurl: string }[],
  usedBannerDirs: Set<string>,
  resolveFileName: (title: string) => string,
  skipLabel: string,
): Promise<{ written: number; errors: string[]; skipped: string[] }> {
  const errors: string[] = [];
  const skipped: string[] = [];
  const dirBase = uniqueFileName(sanitizePathSegment(folderTitle), usedBannerDirs);
  let bannerDir: FileSystemDirectoryHandle;
  try {
    bannerDir = await root.getDirectoryHandle(dirBase, { create: true });
  } catch (error) {
    errors.push(`Failed to create directory for "${folderTitle}": ${error}`);
    return { written: 0, errors, skipped };
  }

  const usedFileNames = new Set<string>();
  let written = 0;
  for (const row of rows) {
    const blob = textDataUrlToBlob(row.imageurl);
    if (!blob) {
      skipped.push(`Skipped "${row.title}" in "${folderTitle}": no exportable ${skipLabel}`);
      continue;
    }
    const fileName = uniqueFileName(resolveFileName(row.title), usedFileNames);
    try {
      await writeBlobToHandle(bannerDir, fileName, blob);
      written += 1;
    } catch (error) {
      errors.push(`Failed to write "${fileName}" in "${folderTitle}": ${error}`);
    }
  }
  return { written, errors, skipped };
}

async function writeMarkdownRowsToBannerDir(
  root: FileSystemDirectoryHandle,
  folderTitle: string,
  rows: readonly { title: string; imageurl: string }[],
  usedBannerDirs: Set<string>,
): Promise<{ written: number; errors: string[]; skipped: string[] }> {
  return writeTextSlotRowsToBannerDir(
    root,
    folderTitle,
    rows,
    usedBannerDirs,
    resolveMarkdownExportFileName,
    'markdown',
  );
}

/** ColFour Export Albums behavior, scoped to one tutorial banner. */
export async function exportTutorialBannerImagesToDirectory(
  root: FileSystemDirectoryHandle,
  banner: TutorialBanner,
  contentGroups: readonly (readonly TutorialContent[])[],
): Promise<ThumbsImageExportResult> {
  const rows = pickExportRows(
    filterRowsBySlotKind(contentRowsForBanner(contentGroups, banner.id), 'image'),
    rowHasExportableImage,
  );
  if (rows.length === 0) {
    return {
      exportedBanners: 0,
      exportedImages: 0,
      errors: [],
      skipped: [`Skipped banner "${banner.title}": no exportable images`],
    };
  }
  const usedBannerDirs = new Set<string>();
  const result = await writeImageRowsToBannerDir(root, banner.title, rows, usedBannerDirs);
  return {
    exportedBanners: result.written > 0 ? 1 : 0,
    exportedImages: result.written,
    errors: result.errors,
    skipped: result.skipped,
  };
}

/** Same as image export, but only markdown slots → `.md` files. */
export async function exportTutorialBannerMarkdownToDirectory(
  root: FileSystemDirectoryHandle,
  banner: TutorialBanner,
  contentGroups: readonly (readonly TutorialContent[])[],
): Promise<ThumbsImageExportResult> {
  return exportTutorialBannerDocumentsToDirectory(root, banner, contentGroups, 'markdown');
}

/** Same as image export, but only plain-text slots → `.txt` files. */
export async function exportTutorialBannerTextToDirectory(
  root: FileSystemDirectoryHandle,
  banner: TutorialBanner,
  contentGroups: readonly (readonly TutorialContent[])[],
): Promise<ThumbsImageExportResult> {
  return exportTutorialBannerDocumentsToDirectory(root, banner, contentGroups, 'text');
}

async function exportTutorialBannerDocumentsToDirectory(
  root: FileSystemDirectoryHandle,
  banner: TutorialBanner,
  contentGroups: readonly (readonly TutorialContent[])[],
  kind: DocumentMediaKind,
): Promise<ThumbsImageExportResult> {
  const label = kind === 'markdown' ? 'markdown' : 'text';
  const rows = pickExportRows(
    filterRowsBySlotKind(contentRowsForBanner(contentGroups, banner.id), kind),
    (imageurl) => rowHasExportableDocument(imageurl, kind),
  );
  if (rows.length === 0) {
    return {
      exportedBanners: 0,
      exportedImages: 0,
      errors: [],
      skipped: [`Skipped banner "${banner.title}": no exportable ${label}`],
    };
  }
  const usedBannerDirs = new Set<string>();
  const result = kind === 'markdown'
    ? await writeMarkdownRowsToBannerDir(root, banner.title, rows, usedBannerDirs)
    : await writeTextSlotRowsToBannerDir(
      root,
      banner.title,
      rows,
      usedBannerDirs,
      resolveTextExportFileName,
      'text',
    );
  return {
    exportedBanners: result.written > 0 ? 1 : 0,
    exportedImages: result.written,
    errors: result.errors,
    skipped: result.skipped,
  };
}

/** Same directory-write pattern for a course banner's siftersinstructions covers. */
export async function exportCourseCoverImagesToDirectory(
  root: FileSystemDirectoryHandle,
  banner: CourseBanner,
  contentGroups: readonly SlideGroup[],
): Promise<ThumbsImageExportResult> {
  const slideGroup = resolveCourseSlideGroupForBanner(banner, contentGroups);
  if (!slideGroup) {
    return {
      exportedBanners: 0,
      exportedImages: 0,
      errors: [],
      skipped: [`Skipped banner "${banner.title}": no covers found`],
    };
  }
  const covers = pickExportRows(
    filterRowsBySlotKind(courseCoverItems(slideGroup), 'image'),
    rowHasExportableImage,
  );
  if (covers.length === 0) {
    return {
      exportedBanners: 0,
      exportedImages: 0,
      errors: [],
      skipped: [`Skipped banner "${banner.title}": no exportable cover images`],
    };
  }
  const usedBannerDirs = new Set<string>();
  const result = await writeImageRowsToBannerDir(root, banner.title, covers, usedBannerDirs);
  return {
    exportedBanners: result.written > 0 ? 1 : 0,
    exportedImages: result.written,
    errors: result.errors,
    skipped: result.skipped,
  };
}
