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
  sanitizePathSegment,
  uniqueFileName,
  writeBlobToHandle,
} from '../../library/directoryTreeUtils';
import { isMimeOnlyMediaUrl } from '../../library/imageUtils';
import { resolveMediaPlayerTab, type MediaPlayerTab } from './mediaPlayerUtils';

export type { MediaPlayerTab };
export { resolveMediaPlayerTab };

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

function rowHasExportableImage(imageurl: string): boolean {
  return dataUrlToBlob(imageurl) !== null;
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
): ThumbsLibraryEntry[] {
  const entries = [...banners]
    .sort((a, b) => a.ordinal - b.ordinal)
    .flatMap((banner) => {
      if (allowedIds != null && !allowedIds.has(banner.id)) return [];
      const rows = contentRowsForBanner(contentGroups, banner.id);
      if (rows.length === 0 && allowedIds == null) return [];
      return [{
        id: banner.id,
        title: banner.title,
        quote: banner.quote,
        imageCount: rows.length,
        hasExportableImages: rows.some((row) => rowHasExportableImage(row.imageurl)),
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
): ThumbsLibraryEntry[] {
  return [...banners]
    .sort((a, b) => a.ordinal - b.ordinal)
    .flatMap((banner) => {
      if (quizId !== null && quizId !== undefined && banner.bannerId !== quizId) {
        return [];
      }
      const slideGroup = resolveCourseSlideGroupForBanner(banner, contentGroups);
      if (!slideGroup) return [];
      const covers = courseCoverItems(slideGroup);
      if (covers.length === 0) return [];
      return [{
        id: banner.id,
        title: banner.title,
        quote: banner.quote,
        imageCount: covers.length,
        hasExportableImages: covers.some((cover) => rowHasExportableImage(cover.imageurl)),
        isHighlighted: banner.isHighlighted,
      }];
    });
}

export function buildQuizThumbsLibrary(
  quizzes: readonly Quiz[],
  banners: readonly CourseBanner[],
  contentGroups: readonly SlideGroup[],
): ThumbsQuizLibraryEntry[] {
  return quizzes.flatMap((quiz) => {
    const courseCount = buildCourseThumbsLibrary(banners, contentGroups, quiz.id).length;
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
): ThumbsPlaylistItem[] {
  return contentRowsForBanner(contentGroups, bannerId)
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
): ThumbsPlaylistItem[] {
  return (slideGroup.slides ?? [])
    .filter((row) => row.length > 0 && row[0].bannerId === chapterId)
    .flatMap((row) => row)
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((row) => ({
      id: row.id,
      title: row.title,
      imageurl: row.imageurl,
      ordinal: row.ordinal,
      bannerId: row.bannerId,
      content: row.content,
      metadata: row.metadata,
      sizeInBytes: row.sizeInBytes,
      isHighlighted: row.isHighlighted,
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
): ThumbsPlaylistItem[] {
  return courseCoverItems(slideGroup).map((cover) => ({
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
): T[] {
  const highlighted = rows.filter((row) => row.isHighlighted && rowHasExportableImage(row.imageurl));
  if (highlighted.length > 0) return highlighted;
  return rows.filter((row) => rowHasExportableImage(row.imageurl));
}

/** ColFour Export Directory behavior, scoped to one tutorial banner. */
export async function exportTutorialBannerImagesToDirectory(
  root: FileSystemDirectoryHandle,
  banner: TutorialBanner,
  contentGroups: readonly (readonly TutorialContent[])[],
): Promise<ThumbsImageExportResult> {
  const rows = pickExportRows(contentRowsForBanner(contentGroups, banner.id));
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
  const covers = pickExportRows(courseCoverItems(slideGroup));
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
