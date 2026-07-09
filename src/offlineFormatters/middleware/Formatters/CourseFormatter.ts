import type { Content } from "../Flattenners";
import { emptyDescendentsSumsForEntity } from "../../structure/utils/EntityUtils";
import { TutorialFormater } from "./TutorialFormater";

export interface CourseResult {
  handlers: Record<string, unknown>;
  banners: Array<Record<string, unknown>>;
  content: Array<Record<string, unknown>>;
  counts: Record<string, unknown>;
}

export interface FormatOptions {
  content: Content;
  node: string;
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
  for (const v of values) {
    if (v != null) {
      return v;
    }
  }
  return null;
}

function childEntityId(row: Record<string, unknown> | null | undefined): unknown {
  if (row == null || Object.keys(row).length === 0) {
    return null;
  }
  return firstNonNull(row.id, row.sifterId, row.filterId, row.foundationId);
}

function coerceNumber(o: unknown): number {
  if (typeof o === "number") {
    return Math.trunc(o);
  }
  if (typeof o === "string" && o.length > 0) {
    const n = parseInt(o, 10);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function courseFoundationMoldWithDefaults(
  raw: Record<string, unknown>,
  node: string,
): Record<string, unknown> {
  const f: Record<string, unknown> = { ...raw };
  if (f.owner == null) {
    f.owner = false;
  }
  if (f.ordinal == null) {
    f.ordinal = 0;
  }
  const sifterId = firstNonNull(f.sifterId, f.id, 0);
  f.sifterId = sifterId != null ? sifterId : 0;
  const banner = firstNonNull(f[node], f.sifterId);
  f[node] = banner != null ? banner : 0;
  return f;
}

function putPennantPlaceholders(
  pennant: Record<string, unknown>,
  filterRow: Record<string, unknown>,
): void {
  if (pennant.isHighlighted == null) {
    pennant.isHighlighted = false;
  }
  if (pennant.isDismissed == null) {
    pennant.isDismissed = false;
  }
  if (pennant.descendentsSums == null) {
    pennant.descendentsSums = emptyDescendentsSumsForEntity("filters");
  }
  if (pennant.quote == null) {
    pennant.quote = ".";
  }
  if (pennant.title == null) {
    pennant.title = ".";
  }
  if (pennant.sizeInBytes == null) {
    pennant.sizeInBytes = 0;
  }
  if (pennant.bannerId == null) {
    pennant.bannerId = 0;
  }
  if (pennant.ordinal == null) {
    pennant.ordinal = 0;
  }
  if (pennant.status == null) {
    pennant.status = 0;
  }
  if (pennant.owner == null) {
    pennant.owner = false;
  }
  if (pennant.id == null) {
    pennant.id = firstNonNull(childEntityId(filterRow), 0);
  }
}

function putBannerPlaceholders(
  banner: Record<string, unknown>,
  found: Record<string, unknown>,
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
  if (!("descendentsSums" in banner) || banner.descendentsSums == null) {
    banner.descendentsSums =
      found.descendentsSums ?? emptyDescendentsSumsForEntity("sifters");
  }
  if (!("quote" in banner) || banner.quote == null) {
    banner.quote = found.purpose ?? ".";
  }
  if (!("title" in banner) || banner.title == null) {
    banner.title = found.sifter ?? ".";
  }
  if (!("sizeInBytes" in banner) || banner.sizeInBytes == null) {
    banner.sizeInBytes = found.sizeInBytes ?? 0;
  }
  if (!("status" in banner) || banner.status == null) {
    banner.status = found.status ?? 0;
  }
  if (!("id" in banner) || banner.id == null) {
    banner.id = firstNonNull(childEntityId(found), 0);
  }
}

function firstGroupBannerId(group: Array<Record<string, unknown>> | null): number {
  if (group == null || group.length === 0) {
    return 0;
  }
  const row = group[0];
  const bid = firstNonNull(row.bannerId, row.sifterId);
  return coerceNumber(bid);
}

function groupSlides(
  group: Array<Record<string, unknown>>,
  sifterFilter: Array<Record<string, unknown>> | null,
  filterInstructions: Array<Record<string, unknown>> | null,
  instructions: Array<Record<string, unknown>> | null,
): Record<string, unknown> {
  const bannerId = firstGroupBannerId(group);
  const safeSifterFilter = sifterFilter ?? [];
  const safeFilterInstructions = filterInstructions ?? [];
  const safeInstructions = instructions ?? [];
  const siftermolds = safeSifterFilter.filter(
    (m) => coerceNumber(m.sifterId) === bannerId,
  );
  const localmolds = safeFilterInstructions.filter((m0) =>
    siftermolds.some((m1) => m1.filterId === m0.filterId),
  );
  const slides = TutorialFormater.groupInstructions(
    "filterId",
    localmolds,
    safeInstructions,
  );
  const result: Record<string, unknown> = {};
  for (let i = 0; i < group.length; i++) {
    result[String(i)] = group[i];
  }
  result.slides = slides;
  return result;
}

function format(options: FormatOptions): CourseResult {
  const content = options.content;
  const node = options.node;

  const records = content.records ?? {};
  const counts = content.counts ?? {};
  const foundationSifters = mapOrEmpty(records, "foundationSifters");
  const sifters = listOfMapsOrEmpty(foundationSifters, "sifters");
  const foundation = listOfMapsOrEmpty(foundationSifters, "foundation");

  const siftersFilters = mapOrEmpty(records, "siftersFilters");
  const sifterFMolds = listOfMapsOrEmpty(siftersFilters, "sifters");
  const silters = listOfMapsOrEmpty(siftersFilters, "filters");

  const filtersInstructions = mapOrEmpty(records, "filtersInstructions");
  const filterMolds = listOfMapsOrEmpty(filtersInstructions, "filters");
  const filtructions = listOfMapsOrEmpty(filtersInstructions, "instructions");

  const siftersInstructions = mapOrEmpty(records, "siftersInstructions");
  const sifterMolds = listOfMapsOrEmpty(siftersInstructions, "sifters");
  const siftructions = listOfMapsOrEmpty(siftersInstructions, "instructions");

  const fmolds = foundation.map((raw) => {
    const f = courseFoundationMoldWithDefaults(raw, node);
    const result: Record<string, unknown> = {};
    result.owner = f.owner;
    result.ordinal = f.ordinal;
    result.sifterId = f.sifterId;
    result.bannerId = f[node];
    result.pennants = sifterFMolds
      .filter((sf) => sf.sifterId === f.sifterId)
      .map((sf) => {
        let found = silters.find(
          (s) => childEntityId(s) === sf.filterId,
        );
        if (found == null) {
          const filterId = firstNonNull(
            sf.filterId,
            sf.id,
            sf.foundationId,
          );
          const sifterId = firstNonNull(sf.sifterId, sf.bannerId);
          found = {
            id: filterId,
            filterId,
            foundationId: filterId,
            sifterId,
          };
        }
        const pennant: Record<string, unknown> = {};
        pennant.isHighlighted = false;
        pennant.isDismissed = false;
        pennant.descendentsSums = found.descendentsSums;
        pennant.quote = found.purpose;
        pennant.title = found.filter;
        pennant.sizeInBytes = found.sizeInBytes;
        pennant.bannerId = sf.sifterId;
        pennant.ordinal = sf.ordinal;
        pennant.status = found.status;
        pennant.owner = sf.owner;
        pennant.id = childEntityId(found);
        putPennantPlaceholders(pennant, found);
        return pennant;
      });
    return result;
  });

  const handlers: Record<string, unknown> = {};
  handlers.handlesSifters = sifters.map((s) => ({
    id: childEntityId(s),
    keyword: s.sifter,
  }));
  handlers.handlesFilters = silters.map((s) => ({
    id: childEntityId(s),
    keyword: s.filter,
  }));

  const banners = fmolds.map((f) => {
    let found = sifters.find((s) => childEntityId(s) === f.sifterId);
    if (found == null) {
      const sifterId = firstNonNull(f.sifterId, f.bannerId, f.id);
      found = {
        id: sifterId,
        sifterId,
        bannerId: sifterId,
      };
    }
    const result: Record<string, unknown> = {};
    result.owner = f.owner;
    result.ordinal = f.ordinal;
    result.sifterId = f.sifterId;
    result.bannerId = f.bannerId;
    result.pennants = f.pennants;
    result.isHighlighted = false;
    result.isDismissed = false;
    result.descendentsSums = found.descendentsSums;
    result.quote = found.purpose;
    result.title = found.sifter;
    result.sizeInBytes = found.sizeInBytes;
    result.status = found.status;
    result.id = childEntityId(found);
    putBannerPlaceholders(result, found);
    return result;
  });

  const formattedContent: Array<Record<string, unknown>> = [];
  const groups = TutorialFormater.groupInstructions(
    "sifterId",
    sifterMolds,
    siftructions,
  );
  for (const group of groups) {
    formattedContent.push(
      groupSlides(group, sifterFMolds, filterMolds, filtructions),
    );
  }

  return {
    handlers,
    banners,
    content: formattedContent,
    counts,
  };
}

export const CourseFormatter = {
  format,
  FormatOptions: {
    of(content: Content): FormatOptions {
      return { content, node: "dashboardId" };
    },
    withNode(options: FormatOptions, newNode: string | null | undefined): FormatOptions {
      return {
        content: options.content,
        node: newNode != null ? newNode : options.node,
      };
    },
  },
};
