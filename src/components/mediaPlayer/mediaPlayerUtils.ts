import type { Banner as CourseBanner, SlideGroup, SlideItem } from '../../library/CourseUtils';
import type { Banner as TutorialBanner, Content as TutorialContent } from '../../store/slices/tutorialSlice';
import type { Quiz } from '../../store/slices/quizSlice';
import type { UpdatePayload } from '../../library/actions';
import {
  groupTutorialVideoBannerEntries,
  resolveCourseSlideGroupForBanner,
  validateCourseVideoChunkQuotes,
  validateTutorialVideoChunkQuotes,
} from '../../library/videoChunkPlayback';
import {
  isChunkPayloadStoredLocally,
  isFmp4InitContentLabel,
  normalizeBase64Payload,
  parseVideoChunkSequence,
  stripDataUrlToMimeOnly,
  validatePennantSlideItems,
} from '../../library/directoryTreeUtils';
import { exportCourseTreesToVideoFolder, type CourseTreesVideoExportResult } from '../../library/TemplatesManagerUtils';
import { getCurAppName, isPncUserApp } from '../../utils';

export type MediaPlayerTab = 'course' | 'tutorial' | 'quiz';

export type VideoLibraryEntry = {
  id: number;
  title: string;
  quote?: string;
  chunkCount: number;
  hasReleasablePayload: boolean;
  hasExportablePayload: boolean;
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
  if (isPncUserApp(curApp)) {
    const appName = getCurAppName(curApp);
    if (appName === 'tutorial' || appName === 'course' || appName === 'quiz') {
      return appName;
    }
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

    return [{
      id: banner.id,
      title: banner.title,
      quote: banner.quote,
      chunkCount: quoteValidation.chunkCount,
      hasReleasablePayload: courseVideoHasReleasablePayload(banner, contentGroups),
      hasExportablePayload: courseVideoHasExportablePayload(banner, contentGroups),
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
    ) ?? group[0];

    return [{
      id: anchor.banner.id,
      title: anchor.banner.title,
      quote: anchor.banner.quote,
      chunkCount: quoteValidation.chunkCount,
      hasReleasablePayload: false,
      hasExportablePayload: false,
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

function slideRowInitPayloadStored(slideRow: readonly SlideItem[]): boolean {
  const initRow = slideRow.find((row) => isFmp4InitContentLabel(row.content));
  if (!initRow) return true;
  return normalizeBase64Payload(initRow.imageurl ?? '').length > 0;
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

export function validateCoursePennantExportable(
  slideGroup: SlideGroup,
  pennantId: number,
): { valid: true } | { valid: false; error: string } {
  const slideRow = findSlideRowForPennant(slideGroup, pennantId);
  if (!slideRow || slideRow.length === 0) {
    return { valid: false, error: 'missing slide items' };
  }
  const slideValidation = validatePennantSlideItems(slideRow);
  if (!slideValidation.valid) {
    return slideValidation;
  }
  if (!isChunkPayloadStoredLocally(slideRow)) {
    return { valid: false, error: 'chunk payload not stored locally' };
  }
  if (!slideRowInitPayloadStored(slideRow)) {
    return { valid: false, error: 'missing fMP4 init segment' };
  }
  return { valid: true };
}

/** True when every split part (and fMP4 init row, if present) has full base64 — not mime-only placeholders. */
export function courseVideoHasExportablePayload(
  banner: CourseBanner,
  contentGroups: readonly SlideGroup[],
): boolean {
  const slideGroup = resolveCourseSlideGroupForBanner(banner, contentGroups);
  if (!slideGroup) return false;

  const videoPennants = [...(banner.pennants ?? [])]
    .sort((a, b) => a.ordinal - b.ordinal)
    .filter((pennant) => parseVideoChunkSequence(pennant.quote) !== null);

  if (videoPennants.length === 0) return false;

  return videoPennants.every((pennant) => {
    const slideRow = findSlideRowForPennant(slideGroup, pennant.id);
    if (!slideRow || slideRow.length === 0) return false;
    if (!validatePennantSlideItems(slideRow).valid) return false;
    if (!isChunkPayloadStoredLocally(slideRow)) return false;
    return slideRowInitPayloadStored(slideRow);
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
