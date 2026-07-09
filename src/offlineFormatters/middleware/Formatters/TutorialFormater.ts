import type { Content } from "../Flattenners";
import { emptyDescendentsSumsForEntity } from "../../structure/utils/EntityUtils";

export interface TutorialResult {
  handlers: Record<string, unknown>;
  banners: Array<Record<string, unknown>>;
  content: Array<Array<Record<string, unknown>>>;
  counts: Record<string, unknown>;
}

function mapOrEmpty(
  parent: Record<string, unknown> | null | undefined,
  key: string,
): Record<string, unknown> {
  if (parent == null) {
    return {};
  }
  const v = parent[key];
  if (v != null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

function listOfMapsOrEmpty(
  parent: Record<string, unknown> | null | undefined,
  key: string,
): Array<Record<string, unknown>> {
  if (parent == null) {
    return [];
  }
  const v = parent[key];
  if (Array.isArray(v)) {
    return v as Array<Record<string, unknown>>;
  }
  return [];
}

function firstNonNull(...values: unknown[]): unknown {
  if (values == null) {
    return null;
  }
  for (const v of values) {
    if (v != null) {
      return v;
    }
  }
  return null;
}

/** Entity id for list rows (e.g. filters). Templates may send only `filterId` when `id` is omitted. */
function childEntityId(row: Record<string, unknown> | null | undefined): unknown {
  if (row == null || Object.keys(row).length === 0) {
    return null;
  }
  return firstNonNull(row.id, row.filterId, row.foundationId);
}

/**
 * Instruction slide id: merged instruction `id`, or the mold's `instructionId` when the
 * `instructions` selection is omitted.
 */
function instructionRecordId(row: Record<string, unknown> | null | undefined): unknown {
  if (row == null || Object.keys(row).length === 0) {
    return null;
  }
  return firstNonNull(row.id, row.instructionId);
}

function groupingKey(value: unknown): string {
  if (value == null) {
    return "0";
  }
  if (typeof value === "number") {
    return String(Math.trunc(value));
  }
  return String(value);
}

function groupBy(
  objectArray: Array<Record<string, unknown>> | null | undefined,
  property: string,
): Record<string, Array<Record<string, unknown>>> {
  if (objectArray != null && objectArray.length > 0) {
    const grouped: Record<string, Array<Record<string, unknown>>> = {};
    for (const obj of objectArray) {
      const key = groupingKey(obj[property]);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(obj);
    }
    return grouped;
  }
  return {};
}

function tutorialFoundationMoldWithDefaults(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const f: Record<string, unknown> = { ...raw };
  if (f.owner == null) {
    f.owner = false;
  }
  if (f.ordinal == null) {
    f.ordinal = 0;
  }
  const filterId = firstNonNull(f.filterId, f.id, f.foundationId, 0);
  f.filterId = filterId != null ? filterId : 0;
  return f;
}

function putTutorialBannerPlaceholders(
  banner: Record<string, unknown>,
  filterRow: Record<string, unknown>,
): void {
  if (banner.owner == null) {
    banner.owner = false;
  }
  if (banner.ordinal == null) {
    banner.ordinal = 0;
  }
  if (banner.isHighlighted == null) {
    banner.isHighlighted = false;
  }
  if (banner.isDismissed == null) {
    banner.isDismissed = false;
  }
  if (banner.descendentsSums == null) {
    banner.descendentsSums = emptyDescendentsSumsForEntity("filters");
  }
  if (banner.quote == null) {
    banner.quote = ".";
  }
  if (banner.title == null) {
    banner.title = ".";
  }
  if (banner.sizeInBytes == null) {
    banner.sizeInBytes = 0;
  }
  if (banner.status == null) {
    banner.status = 0;
  }
  if (banner.id == null) {
    banner.id = firstNonNull(childEntityId(filterRow), 0);
  }
}

function putTutorialSlidePlaceholders(
  slide: Record<string, unknown>,
  instructionSource: Record<string, unknown>,
): void {
  if (slide.id == null) {
    slide.id = firstNonNull(instructionRecordId(instructionSource), 0);
  }
  if (slide.owner == null) {
    slide.owner = false;
  }
  if (slide.status == null) {
    slide.status = 0;
  }
  if (slide.ordinal == null) {
    slide.ordinal = 0;
  }
  if (slide.sizeInBytes == null) {
    slide.sizeInBytes = 0;
  }
  if (slide.title == null) {
    slide.title = ".";
  }
  if (slide.bannerId == null) {
    slide.bannerId = firstNonNull(
      instructionSource.sifterId,
      instructionSource.dashboardId,
      instructionSource.filterId,
      0,
    );
  }
  if (slide.isHighlighted == null) {
    slide.isHighlighted = false;
  }
  if (slide.isDismissed == null) {
    slide.isDismissed = false;
  }
  if (slide.content == null) {
    slide.content = ".";
  }
  if (slide.imageurl == null) {
    slide.imageurl = "data:image";
  }
}

function withMissingFoundationBanners(
  banners: Array<Record<string, unknown>> | null | undefined,
  foundationMolds: Array<Record<string, unknown>> | null | undefined,
): Array<Record<string, unknown>> {
  const output =
    banners != null ? [...banners] : ([] as Array<Record<string, unknown>>);
  const seenBannerIds = new Set<unknown>();
  for (const banner of output) {
    const id = childEntityId(banner);
    if (id != null) {
      seenBannerIds.add(id);
    }
  }

  if (foundationMolds == null || foundationMolds.length === 0) {
    return output;
  }

  for (const mold of foundationMolds) {
    if (mold == null) {
      continue;
    }
    const filterId = firstNonNull(mold.filterId, mold.id, mold.foundationId);
    if (filterId == null || seenBannerIds.has(filterId)) {
      continue;
    }
    const synthesized: Record<string, unknown> = {};
    synthesized.id = filterId;
    synthesized.filterId = filterId;
    synthesized.owner = mold.owner;
    synthesized.ordinal = mold.ordinal;
    putTutorialBannerPlaceholders(
      synthesized,
      { id: filterId, filterId },
    );
    output.push(synthesized);
    seenBannerIds.add(filterId);
  }
  return output;
}

export const TutorialFormater = {
  format(content: Content): TutorialResult {
    const records = content.records ?? {};
    const counts = content.counts ?? {};

    const foundationFilters = mapOrEmpty(records, "foundationFilters");
    const filters = listOfMapsOrEmpty(foundationFilters, "filters");
    const foundation = listOfMapsOrEmpty(foundationFilters, "foundation");

    const filtersInstructions = mapOrEmpty(records, "filtersInstructions");
    const instructions = listOfMapsOrEmpty(filtersInstructions, "instructions");
    const molds = listOfMapsOrEmpty(filtersInstructions, "filters");

    const groupId =
      molds != null && molds.some((m) => "filterId" in m)
        ? "filterId"
        : molds != null && molds.some((m) => "foundationId" in m)
          ? "foundationId"
          : "filterId";

    const params: [string, Array<Record<string, unknown>>, Array<Record<string, unknown>>] = [
      groupId,
      molds,
      instructions,
    ];

    const fmolds = foundation.map(tutorialFoundationMoldWithDefaults);

    const handlers: Record<string, unknown> = {};
    handlers.handlesFilters = filters.map((f) => ({
      id: childEntityId(f),
      keyword: f.filter,
    }));

    let banners: Array<Record<string, unknown>>;
    if (filters == null || filters.length === 0) {
      const bannerIds = new Set<unknown>();
      for (const mold of molds ?? []) {
        if (mold == null) {
          continue;
        }
        let id: unknown = mold[groupId];
        if (id == null) {
          id = firstNonNull(mold.id, mold.filterId, mold.foundationId);
        }
        if (id != null) {
          bannerIds.add(id);
        }
      }

      banners = [...bannerIds].map((id) => {
        const result: Record<string, unknown> = {};
        const match = fmolds.find((m) => m.filterId === id);
        if (match != null) {
          result.owner = match.owner;
          result.ordinal = match.ordinal;
        }
        result.isHighlighted = false;
        result.isDismissed = false;
        result.descendentsSums = emptyDescendentsSumsForEntity("filters");
        result.quote = ".";
        result.title = ".";
        result.sizeInBytes = 0;
        result.status = 0;
        result.id = id;
        putTutorialBannerPlaceholders(result, {
          id,
          filterId: id,
          foundationId: id,
        });
        return result;
      });
    } else {
      banners = filters.map((f) => {
        const result: Record<string, unknown> = {};
        const match = fmolds.find(
          (m) => m.filterId === childEntityId(f),
        );
        if (match != null) {
          result.owner = match.owner;
          result.ordinal = match.ordinal;
        }
        result.isHighlighted = false;
        result.isDismissed = false;
        result.descendentsSums = f.descendentsSums;
        result.quote = f.purpose;
        result.title = f.filter;
        result.sizeInBytes = f.sizeInBytes;
        result.status = f.status;
        result.id = childEntityId(f);
        putTutorialBannerPlaceholders(result, f);
        return result;
      });
    }

    const safeBanners = withMissingFoundationBanners(banners, fmolds);

    return {
      handlers,
      banners: safeBanners,
      content: TutorialFormater.groupInstructions(
        params[0],
        params[1],
        params[2],
      ),
      counts,
    };
  },

  groupInstructions(
    groupId: string,
    molds: Array<Record<string, unknown>> | null | undefined,
    instructions: Array<Record<string, unknown>> | null | undefined,
  ): Array<Array<Record<string, unknown>>> {
    const safeMolds = molds ?? [];
    const safeInstructions = instructions ?? [];
    return Object.values(groupBy(safeMolds, groupId)).map((entry) =>
      entry.map((row) => {
        const result: Record<string, unknown> = { ...row };
        const instr = safeInstructions.find(
          (i) => childEntityId(i) === row.instructionId,
        );
        if (instr != null) {
          Object.assign(result, instr);
        }

        const finalResult: Record<string, unknown> = {};
        finalResult.id = firstNonNull(instructionRecordId(result), 0);
        finalResult.owner = result.owner;
        finalResult.status = result.status;
        finalResult.ordinal = result.ordinal;
        finalResult.sizeInBytes = result.sizeInBytes;
        finalResult.title = firstNonNull(result.instruction, result.title);
        finalResult.bannerId = firstNonNull(
          result.sifterId,
          result.dashboardId,
          result[groupId],
          0,
        );
        finalResult.isHighlighted = false;
        finalResult.isDismissed = false;
        finalResult.content = firstNonNull(result.details, result.content);
        finalResult.imageurl = result.imageurl;
        putTutorialSlidePlaceholders(finalResult, result);
        return finalResult;
      }),
    );
  },
};
