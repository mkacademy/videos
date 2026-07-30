import type { Banner as CourseBanner, SlideGroup, SlideItem } from '../../library/CourseUtils';
import type { Banner as TutorialBanner, Content as TutorialContent } from '../../store/slices/tutorialSlice';
import type { Quiz } from '../../store/slices/quizSlice';
import type { UpdatePayload } from '../../library/actions';
import {
  courseHasLegacySidecarInit,
  groupTutorialVideoBannerEntries,
  resolveCourseSlideGroupForBanner,
  resolveCourseVideoInitPayload,
  tutorialHasLegacySidecarInit,
  validateCourseVideoChunkQuotes,
  validateTutorialVideoChunkQuotes,
} from '../../library/videoChunkPlayback';
import {
  FMP4_MEDIA_MIME,
  VIDEO_MP4_MIME,
  isChunkPayloadStoredLocally,
  parseVideoChunkSequence,
  stripDataUrlToMimeOnly,
  validatePennantSlideItems,
} from '../../library/directoryTreeUtils';
import { exportCourseTreesToVideoFolder, type CourseTreesVideoExportResult } from '../../library/TemplatesManagerUtils';
import { getCurAppName } from '../../utils';

/** True when an instruction imageurl is fMP4 media or init (mime-only or data URL with payload). */
export function isCourseVideoInstructionImageUrl(imageurl: string | undefined | null): boolean {
  if (!imageurl) return false;
  const trimmed = imageurl.trim();
  if (!trimmed) return false;
  if (trimmed === FMP4_MEDIA_MIME || trimmed === VIDEO_MP4_MIME) return true;
  if (trimmed === `data:${FMP4_MEDIA_MIME}` || trimmed === `data:${VIDEO_MP4_MIME}`) return true;
  return trimmed.startsWith(`data:${FMP4_MEDIA_MIME}`)
    || trimmed.startsWith(`data:${VIDEO_MP4_MIME}`)
    || trimmed.startsWith(FMP4_MEDIA_MIME)
    || trimmed.startsWith(VIDEO_MP4_MIME);
}

function courseHasVideoMimeInstruction(
  banner: CourseBanner,
  slideGroup: SlideGroup,
): boolean {
  const videoPennants = [...(banner.pennants ?? [])]
    .filter((pennant) => parseVideoChunkSequence(pennant.quote) !== null);

  return videoPennants.some((pennant) => {
    const slideRow = findSlideRowForPennant(slideGroup, pennant.id);
    if (!slideRow) return false;
    return slideRow.some((item) => isCourseVideoInstructionImageUrl(item.imageurl));
  });
}

export type MediaPlayerTab = 'course' | 'tutorial' | 'quiz';

export const UNSUPPORTED_SEGMENTATION_MESSAGE =
  'This segmentation is not supported anymore. Use Download to export the video, then re-import in studio so it is segmented correctly';

export type VideoLibraryEntry = {
  id: number;
  title: string;
  quote?: string;
  chunkCount: number;
  hasReleasablePayload: boolean;
  hasExportablePayload: boolean;
  usesUnsupportedSegmentation: boolean;
};

export type QuizLibraryEntry = {
  id: number;
  title: string;
  quote?: string;
  courseCount: number;
};

export function parseMediaPlayerTab(value: string | null): MediaPlayerTab {
  if (value === 'tutorial' || value === 'quiz') return value;
  return 'course';
}

export function resolveMediaPlayerTab(
  tabParam: string | null,
  curApp: number,
): MediaPlayerTab {
  if (tabParam === 'tutorial' || tabParam === 'course' || tabParam === 'quiz') {
    return tabParam;
  }
  const appName = getCurAppName(curApp);
  if (appName === 'tutorial' || appName === 'course' || appName === 'quiz') {
    return appName;
  }
  return 'course';
}

export function getNextCourseVideoInLibrary(
  library: readonly VideoLibraryEntry[],
  currentVideoId: number,
): VideoLibraryEntry | null {
  const currentIndex = library.findIndex((entry) => entry.id === currentVideoId);
  if (currentIndex < 0) return null;
  return library[currentIndex + 1] ?? null;
}

export function buildCourseVideoLibrary(
  banners: CourseBanner[],
  contentGroups: SlideGroup[],
  quizId?: number | null,
): VideoLibraryEntry[] {
  return [...banners].sort((a, b) => a.ordinal - b.ordinal).flatMap((banner) => {
    if (quizId !== null && quizId !== undefined && banner.bannerId !== quizId) {
      return [];
    }

    const slideGroup = resolveCourseSlideGroupForBanner(banner, contentGroups);
    if (!slideGroup) return [];

    const quoteValidation = validateCourseVideoChunkQuotes(banner);
    if (!quoteValidation.valid) return [];

    if (!courseHasVideoMimeInstruction(banner, slideGroup)) return [];

    const unsupported = courseHasLegacySidecarInit(banner, slideGroup);

    return [{
      id: banner.id,
      title: banner.title,
      quote: banner.quote,
      chunkCount: quoteValidation.chunkCount,
      hasReleasablePayload: courseVideoHasReleasablePayload(banner, contentGroups),
      hasExportablePayload: courseVideoHasExportablePayload(banner, contentGroups),
      usesUnsupportedSegmentation: unsupported,
    }];
  });
}

export function buildTutorialVideoLibrary(
  banners: TutorialBanner[],
  contentGroups: TutorialContent[][],
): VideoLibraryEntry[] {
  const seenTitles = new Set<string>();

  return groupTutorialVideoBannerEntries(banners, contentGroups).flatMap((group) => {
    const title = group[0]?.banner.title;
    if (!title || seenTitles.has(title)) return [];
    seenTitles.add(title);

    const chunkBanners = group.map((entry) => entry.banner);
    const quoteValidation = validateTutorialVideoChunkQuotes(chunkBanners);
    if (!quoteValidation.valid) return [];

    const anchor = group.find(
      (entry) => parseVideoChunkSequence(entry.banner.quote)?.index === 1,
    ) ?? group.find(
      (entry) => parseVideoChunkSequence(entry.banner.quote) !== null,
    ) ?? group[0];

    const unsupported = tutorialHasLegacySidecarInit(group);

    return [{
      id: anchor.banner.id,
      title: anchor.banner.title,
      quote: anchor.banner.quote,
      chunkCount: quoteValidation.chunkCount,
      hasReleasablePayload: false,
      hasExportablePayload: false,
      usesUnsupportedSegmentation: unsupported,
    }];
  });
}

export function buildQuizVideoLibrary(
  quizzes: Quiz[],
  banners: CourseBanner[],
  contentGroups: SlideGroup[],
): QuizLibraryEntry[] {
  return quizzes.flatMap((quiz) => {
    const courseCount = buildCourseVideoLibrary(banners, contentGroups, quiz.id).length;
    if (courseCount === 0) return [];

    return [{
      id: quiz.id,
      title: quiz.title,
      quote: quiz.quote,
      courseCount,
    }];
  });
}

function getCourseFilterInstructionRows(
  banner: CourseBanner,
  contentGroups: readonly SlideGroup[],
): SlideItem[] {
  const slideGroup = resolveCourseSlideGroupForBanner(banner, contentGroups);
  if (!slideGroup) return [];

  const pennantIds = new Set((banner.pennants ?? []).map((pennant) => pennant.id));
  const items: SlideItem[] = [];

  for (const slideRow of slideGroup.slides ?? []) {
    const pennantId = slideRow[0]?.bannerId;
    if (pennantId == null || !pennantIds.has(pennantId)) continue;
    items.push(...slideRow);
  }

  return items;
}

function hasReleasableBase64DataUrl(value: string | undefined): boolean {
  return value != null && stripDataUrlToMimeOnly(value) !== null;
}

function slideItemHasReleasablePayload(item: SlideItem): boolean {
  return hasReleasableBase64DataUrl(item.imageurl) || hasReleasableBase64DataUrl(item.content);
}

export function courseVideoHasReleasablePayload(
  banner: CourseBanner,
  contentGroups: readonly SlideGroup[],
): boolean {
  return getCourseFilterInstructionRows(banner, contentGroups).some(slideItemHasReleasablePayload);
}

export function findSlideRowForPennant(
  slideGroup: SlideGroup,
  pennantId: number,
): SlideItem[] | null {
  for (const row of slideGroup.slides ?? []) {
    if (row.length > 0 && row[0].bannerId === pennantId) {
      return row;
    }
  }
  return null;
}

/**
 * True when sparse video chunks + init are locally stored and exportable.
 * Legacy sidecar init is allowed here so users can Download → re-import
 * (playback remains blocked via usesUnsupportedSegmentation).
 */
export function courseVideoHasExportablePayload(
  banner: CourseBanner,
  contentGroups: readonly SlideGroup[],
): boolean {
  const slideGroup = resolveCourseSlideGroupForBanner(banner, contentGroups);
  if (!slideGroup) return false;
  if (!validateCourseVideoChunkQuotes(banner).valid) return false;
  if (!resolveCourseVideoInitPayload(banner, slideGroup, { allowLegacySidecar: true })) return false;

  const videoPennants = [...(banner.pennants ?? [])]
    .sort((a, b) => a.ordinal - b.ordinal)
    .filter((pennant) => parseVideoChunkSequence(pennant.quote) !== null);

  if (videoPennants.length === 0) return false;

  return videoPennants.every((pennant) => {
    const slideRow = findSlideRowForPennant(slideGroup, pennant.id);
    if (!slideRow || slideRow.length === 0) return false;
    if (!validatePennantSlideItems(slideRow).valid) return false;
    return isChunkPayloadStoredLocally(slideRow);
  });
}

function buildFilterInstructionPayloadReleaseUpdate(item: SlideItem): UpdatePayload | null {
  const imageurl = item.imageurl ? stripDataUrlToMimeOnly(item.imageurl) : null;
  const content = item.content ? stripDataUrlToMimeOnly(item.content) : null;
  if (!imageurl && !content) return null;
  return {
    id: item.id,
    title: item.title,
    ...(imageurl ? { imageurl } : {}),
    ...(content ? { content } : {}),
  };
}

export function buildCourseVideoPayloadReleaseUpdates(
  banner: CourseBanner,
  contentGroups: readonly SlideGroup[],
): UpdatePayload[] {
  return getCourseFilterInstructionRows(banner, contentGroups).flatMap((item) => {
    const update = buildFilterInstructionPayloadReleaseUpdate(item);
    return update ? [update] : [];
  });
}

export function exportCourseVideoBanner(
  root: FileSystemDirectoryHandle,
  banner: CourseBanner,
  contentGroups: readonly SlideGroup[],
): Promise<CourseTreesVideoExportResult> {
  return exportCourseTreesToVideoFolder(
    root,
    [{ ...banner, isHighlighted: true }],
    [...contentGroups],
  );
}
