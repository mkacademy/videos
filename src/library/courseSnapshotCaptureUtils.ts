import { incrementID } from '../utils';
import type {
  Banner as CourseBanner,
  Pennant,
  SlideGroup,
  SlideGroupItem,
  SlideItem,
} from './CourseUtils';
import type { CourseTrees } from './controlPanelUtils';
import {
  findSlideRowForPennant,
  validateCoursePennantExportable,
} from '../components/mediaPlayer/mediaPlayerUtils';
import {
  resolveCourseSlideGroupForBanner,
  validateCourseVideoChunkQuotes,
} from './videoChunkPlayback';
import {
  base64PayloadToBlob,
  dataUrlByteLength,
  dataUrlToBlob,
  extractFmp4InitPayloadFromRows,
  formatContentDescription,
  FMP4_MEDIA_MIME,
  getFmp4ChunkAssemblyFailure,
  joinSplitPayloadRows,
  parseVideoChunkSequence,
} from './directoryTreeUtils';
import { extractChunkThumbnailFromBlob } from './videoSegmentImport';

export const SNAPSHOT_INTERVAL_SEC_OPTIONS = [5, 3, 1, 0.5, 0.25] as const;

export type SnapshotIntervalSec = typeof SNAPSHOT_INTERVAL_SEC_OPTIONS[number];

export type CourseSnapshotCaptureResult = {
  banners: CourseBanner[];
  content: SlideGroup[];
  Trees: CourseTrees;
  errors: string[];
  skipped: string[];
};

export type CourseSnapshotCaptureProgress = {
  courseTitle: string;
  pennantTitle: string;
  courseIndex: number;
  courseTotal: number;
  pennantIndex: number;
  pennantTotal: number;
};

const defaultCourseBannerFields = {
  sender: '',
  owner: false,
  ordinal: 0,
  sifterId: 0,
  bannerId: 0,
  sizeInBytes: 0,
  isDismissed: false,
  isHighlighted: false,
  status: 0,
  contiguousOrdinal: 0,
  descendentsSums: { instructions: 0, filters: 0 },
  pennants: [] as Pennant[],
  modified: false,
  edited: false,
};

const defaultPennantFields = {
  sender: '',
  owner: false,
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

const defaultCoverFields = {
  sender: '',
  owner: false,
  ordinal: 0,
  imageurl: '',
  sizeInBytes: 0,
  isHighlighted: false,
  status: 0,
  contiguousOrdinal: 0,
  descendentsSums: {},
  isDismissed: false,
  modified: false,
  edited: false,
};

const defaultSlideFields = {
  sender: '',
  owner: false,
  ordinal: 0,
  imageurl: '',
  sizeInBytes: 0,
  isHighlighted: false,
  status: 0,
  contiguousOrdinal: 0,
  descendentsSums: {},
  isDismissed: false,
  modified: false,
  edited: false,
};

export function formatSnapshotIntervalLabel(intervalSec: number): string {
  if (Number.isInteger(intervalSec)) {
    return `${intervalSec}s`;
  }
  return `${intervalSec}s`;
}

export function formatSnapshotOffsetLabel(offsetSec: number): string {
  if (Number.isInteger(offsetSec)) {
    return `${offsetSec}s`;
  }
  const rounded = Math.round(offsetSec * 100) / 100;
  return `${rounded}s`;
}

function chunkTimingFromPennantQuote(quote: string): { startSec: number; durationSec: number } {
  const seq = parseVideoChunkSequence(quote);
  if (!seq) return { startSec: 0, durationSec: 0 };
  const startMs = seq.startMs ?? 0;
  const endMs = seq.endMs ?? (
    seq.durationMs !== undefined ? startMs + seq.durationMs : startMs
  );
  return {
    startSec: startMs / 1000,
    durationSec: Math.max(0, (endMs - startMs) / 1000),
  };
}

function buildSnapshotOffsetSeconds(durationSec: number, intervalSec: number): number[] {
  if (durationSec <= 0 || intervalSec <= 0) return [];
  const offsets: number[] = [];
  const epsilon = 1e-6;
  for (let offsetSec = 0; offsetSec < durationSec + epsilon; offsetSec += intervalSec) {
    offsets.push(Math.round(offsetSec * 1000) / 1000);
  }
  return offsets;
}

async function yieldToMain(): Promise<void> {
  await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
}

function coverFromThumbnail(
  coverId: number,
  bannerId: number,
  fileName: string,
  ordinal: number,
  thumbnailDataUrl?: string,
): SlideGroupItem {
  const coverImageUrl = thumbnailDataUrl ?? '';
  let coverContent = '';
  let coverSizeBytes = 0;
  if (coverImageUrl) {
    const thumbBlob = dataUrlToBlob(coverImageUrl);
    coverSizeBytes = thumbBlob?.size ?? 0;
    coverContent = formatContentDescription(
      coverSizeBytes,
      dataUrlByteLength(coverImageUrl),
      Date.now(),
    );
  }

  return {
    ...defaultCoverFields,
    id: coverId,
    bannerId,
    title: fileName,
    content: coverContent,
    imageurl: coverImageUrl,
    ordinal,
  };
}

function resolveCourseInitPayload(
  banner: CourseBanner,
  slideGroup: SlideGroup,
): string | null {
  for (const pennant of [...(banner.pennants ?? [])].sort((a, b) => a.ordinal - b.ordinal)) {
    if (parseVideoChunkSequence(pennant.quote) === null) continue;
    const slideRow = findSlideRowForPennant(slideGroup, pennant.id);
    if (!slideRow) continue;
    const initPayload = extractFmp4InitPayloadFromRows(slideRow);
    if (initPayload) return initPayload;
  }
  return null;
}

type SnapshotPennantCapture = {
  pennantTitle: string;
  snapshots: { offsetSec: number; dataUrl: string }[];
};

async function captureSnapshotsForPennant(
  slideGroup: SlideGroup,
  pennant: Pennant,
  initPayload: string,
  intervalSec: number,
  signal?: AbortSignal,
): Promise<SnapshotPennantCapture | { error: string }> {
  const slideRow = findSlideRowForPennant(slideGroup, pennant.id);
  if (!slideRow) {
    return { error: `missing slides for "${pennant.title}"` };
  }

  const assemblyFailure = getFmp4ChunkAssemblyFailure(slideRow);
  if (assemblyFailure) {
    return { error: `"${pennant.title}": ${assemblyFailure}` };
  }

  const assembled = joinSplitPayloadRows(slideRow);
  if ('error' in assembled) {
    return { error: `"${pennant.title}": ${assembled.error}` };
  }

  const chunkBlob = base64PayloadToBlob(assembled.payload, FMP4_MEDIA_MIME);
  if (!chunkBlob) {
    return { error: `"${pennant.title}": failed to decode chunk payload` };
  }

  const { startSec: chunkStartSec, durationSec } = chunkTimingFromPennantQuote(pennant.quote);
  const offsets = buildSnapshotOffsetSeconds(durationSec, intervalSec);
  const snapshots: { offsetSec: number; dataUrl: string }[] = [];

  for (const offsetSec of offsets) {
    // fMP4 fragments keep absolute decode timestamps in moof; chunk 2+ starts at
    // startMs (e.g. 10s), so seek on init+fragment must use chunkStart + offset.
    const seekSeconds = chunkStartSec + offsetSec;
    const dataUrl = await extractChunkThumbnailFromBlob(
      chunkBlob,
      signal,
      initPayload,
      seekSeconds,
    );
    if (!dataUrl) {
      return { error: `"${pennant.title}": failed to capture snapshot at ${formatSnapshotOffsetLabel(offsetSec)}` };
    }
    snapshots.push({ offsetSec, dataUrl });
    await yieldToMain();
  }

  if (snapshots.length === 0) {
    return { error: `"${pennant.title}": no snapshots captured (zero duration)` };
  }

  return { pennantTitle: pennant.title, snapshots };
}

function buildSnapshotCourseFromCaptures(
  sourceBanner: CourseBanner,
  captures: readonly { sourcePennant: Pennant; snapshots: { offsetSec: number; dataUrl: string }[] }[],
  bannerOrdinal: number,
): { banner: CourseBanner; slideGroup: SlideGroup; tree: CourseTrees[number] } {
  const bannerId = incrementID();
  const pennants: Pennant[] = [];
  const slideGroup: SlideGroup = { slides: [] };
  const tree: CourseTrees[number] = { slideGroupItems: [] as number[] };

  captures.forEach(({ sourcePennant, snapshots }, pennantIndex) => {
    const pennantId = incrementID();
    const coverId = incrementID();
    const pennantTitle = sourcePennant.title;

    pennants.push({
      ...defaultPennantFields,
      id: pennantId,
      bannerId,
      title: pennantTitle,
      quote: sourcePennant.quote,
      ordinal: sourcePennant.ordinal,
      sizeInBytes: sourcePennant.sizeInBytes,
    });

    const cover = coverFromThumbnail(
      coverId,
      bannerId,
      pennantTitle,
      pennantIndex,
      snapshots[0]?.dataUrl,
    );
    slideGroup[pennantIndex] = cover;
    tree.slideGroupItems!.push(coverId);

    const slideRow: SlideItem[] = snapshots.map(({ offsetSec, dataUrl }, slideOrdinal) => {
      const offsetLabel = formatSnapshotOffsetLabel(offsetSec);
      const imageurl = dataUrl;
      return {
        ...defaultSlideFields,
        id: incrementID(),
        bannerId: pennantId,
        title: `${pennantTitle} @ ${offsetLabel}`,
        content: offsetLabel,
        imageurl,
        ordinal: slideOrdinal,
        sizeInBytes: new Blob([imageurl]).size,
      };
    });

    slideGroup.slides.push(slideRow);
    tree[pennantId] = slideRow.map((slide) => slide.id);
  });

  const banner: CourseBanner = {
    ...defaultCourseBannerFields,
    id: bannerId,
    title: sourceBanner.title,
    quote: sourceBanner.quote ?? '',
    pennants,
    sizeInBytes: sourceBanner.sizeInBytes,
    ordinal: bannerOrdinal,
  };

  return { banner, slideGroup, tree };
}

export async function buildSnapshotCoursesFromSelection(
  banners: readonly CourseBanner[],
  contentGroups: readonly SlideGroup[],
  intervalSec: number,
  signal?: AbortSignal,
  onProgress?: (progress: CourseSnapshotCaptureProgress) => void,
): Promise<CourseSnapshotCaptureResult> {
  const errors: string[] = [];
  const skipped: string[] = [];
  const outputBanners: CourseBanner[] = [];
  const outputContent: SlideGroup[] = [];
  const Trees: CourseTrees = {};

  const highlightedBanners = banners.filter((banner) => banner.isHighlighted);
  if (highlightedBanners.length === 0) {
    errors.push('Select at least one highlighted course.');
    return { banners: [], content: [], Trees, errors, skipped };
  }

  const qualifyingBanners = highlightedBanners.flatMap((banner) => {
    const highlightedPennants = [...(banner.pennants ?? [])]
      .filter((pennant) => pennant.isHighlighted && parseVideoChunkSequence(pennant.quote) !== null)
      .sort((a, b) => a.ordinal - b.ordinal);

    if (highlightedPennants.length < 2) {
      skipped.push(`Skipped "${banner.title}": need at least two highlighted video chapters`);
      return [];
    }

    const quoteValidation = validateCourseVideoChunkQuotes(banner);
    if (!quoteValidation.valid) {
      skipped.push(`Skipped "${banner.title}": ${quoteValidation.error}`);
      return [];
    }

    const slideGroup = resolveCourseSlideGroupForBanner(banner, contentGroups);
    if (!slideGroup) {
      skipped.push(`Skipped "${banner.title}": no slide group found`);
      return [];
    }

    for (const pennant of highlightedPennants) {
      const pennantValidation = validateCoursePennantExportable(slideGroup, pennant.id);
      if (!pennantValidation.valid) {
        skipped.push(`Skipped "${banner.title}" / "${pennant.title}": ${pennantValidation.error}`);
        return [];
      }
    }

    const initPayload = resolveCourseInitPayload(banner, slideGroup);
    if (!initPayload) {
      skipped.push(`Skipped "${banner.title}": missing fMP4 initialization segment`);
      return [];
    }

    return [{ banner, slideGroup, highlightedPennants, initPayload }];
  });

  if (qualifyingBanners.length === 0) {
    if (errors.length === 0 && skipped.length === 0) {
      errors.push('No qualifying courses to capture snapshots from.');
    }
    return { banners: [], content: [], Trees, errors, skipped };
  }

  let bannerOrdinal = banners.length;

  for (let courseIndex = 0; courseIndex < qualifyingBanners.length; courseIndex += 1) {
    const { banner, slideGroup, highlightedPennants, initPayload } = qualifyingBanners[courseIndex];
    const captures: { sourcePennant: Pennant; snapshots: { offsetSec: number; dataUrl: string }[] }[] = [];

    for (let pennantIndex = 0; pennantIndex < highlightedPennants.length; pennantIndex += 1) {
      const pennant = highlightedPennants[pennantIndex];
      onProgress?.({
        courseTitle: banner.title,
        pennantTitle: pennant.title,
        courseIndex: courseIndex + 1,
        courseTotal: qualifyingBanners.length,
        pennantIndex: pennantIndex + 1,
        pennantTotal: highlightedPennants.length,
      });

      const result = await captureSnapshotsForPennant(
        slideGroup,
        pennant,
        initPayload,
        intervalSec,
        signal,
      );

      if ('error' in result) {
        skipped.push(`Skipped "${banner.title}": ${result.error}`);
        captures.length = 0;
        break;
      }

      captures.push({ sourcePennant: pennant, snapshots: result.snapshots });
      await yieldToMain();
    }

    if (captures.length === 0) continue;

    const built = buildSnapshotCourseFromCaptures(banner, captures, bannerOrdinal++);
    outputBanners.push(built.banner);
    outputContent.push(built.slideGroup);
    Trees[built.banner.id] = built.tree;
  }

  if (outputBanners.length === 0 && errors.length === 0) {
    errors.push('No snapshot courses were created.');
  }

  return {
    banners: outputBanners,
    content: outputContent,
    Trees,
    errors,
    skipped,
  };
}
