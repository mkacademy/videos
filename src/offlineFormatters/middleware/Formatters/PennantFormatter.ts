import type { Content } from "../Flattenners";
import { emptyDescendentsSumsForEntity } from "../../structure/utils/EntityUtils";

function asRecord(value: unknown): Record<string, unknown> {
  return (value as Record<string, unknown>) ?? {};
}

function asRecordList(value: unknown): Array<Record<string, unknown>> {
  return (value as Array<Record<string, unknown>>) ?? [];
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

function numberToLongOrZero(n: number | null | undefined): number {
  return n != null ? n : 0;
}

interface Banner {
  id: number | null;
  properties: Record<string, unknown>;
}

interface Sifter {
  sifterId: number | null;
  filterId: number | null;
  ordinal: number | null;
  owner: unknown;
}

interface Filter {
  id: number | null;
  filter: string;
  purpose: string;
  status: unknown;
  sizeInBytes: number | null;
  descendentsSums: unknown;
}

function toChildPennantMap(
  sifter: Sifter,
  found: Filter,
): Record<string, unknown> {
  const pennant: Record<string, unknown> = {};
  pennant.isHighlighted = false;
  pennant.isDismissed = false;
  const dSum = found.descendentsSums;
  if (dSum != null) {
    pennant.descendentsSums = dSum;
  } else {
    pennant.descendentsSums = emptyDescendentsSumsForEntity("filters");
  }
  pennant.quote = firstNonNull(found.purpose, ".");
  pennant.title = firstNonNull(found.filter, ".");
  pennant.sizeInBytes = firstNonNull(
    numberToLongOrZero(found.sizeInBytes ?? undefined),
    0,
  );
  pennant.bannerId = sifter.sifterId;
  pennant.ordinal = firstNonNull(sifter.ordinal, 0);
  pennant.status = firstNonNull(found.status, 0);
  pennant.owner = firstNonNull(sifter.owner, false);
  pennant.id = firstNonNull(found.id, 0);
  pennant.sifterId = sifter.sifterId;
  const ps = pennant.quote as string | null | undefined;
  const ts = pennant.title as string | null | undefined;
  if (ps == null || ps === "") {
    pennant.quote = ".";
  }
  if (ts == null || ts === "" || ts === "null") {
    pennant.title = ".";
  }
  return pennant;
}

function putBannerDisplayDefaults(banner: Record<string, unknown>): void {
  if (banner.descendentsSums == null) {
    banner.descendentsSums = emptyDescendentsSumsForEntity("sifters");
  }
  if (banner.quote == null) {
    banner.quote = ".";
  }
  if (banner.title == null) {
    banner.title = ".";
  }
}

export const PennantFormatter = {
  formatFromContent(content: Content): {
    handlers: { handlesFilters: Array<{ id: number | null; keyword: string }> };
    banners: Array<Record<string, unknown>>;
    content: unknown[];
  } {
    const records = content.records;

    const bannerMaps = asRecordList(records.banners);
    const banners: Banner[] = bannerMaps.map((bannerMap) => {
      const id = bannerMap.id as number | null;
      const properties = { ...bannerMap };
      delete properties.id;
      delete properties.pennants;
      return { id, properties };
    });

    const siftersFiltersRaw = records.siftersFilters;
    let contentInput: {
      records: { siftersFilters: { sifters: Sifter[]; filters: Filter[] } };
    } | null = null;

    if (siftersFiltersRaw != null) {
      const siftersFiltersMap = asRecord(siftersFiltersRaw);
      const sifterMaps = asRecordList(siftersFiltersMap.sifters);
      const sifters: Sifter[] = sifterMaps.map((sifterMap) => ({
        sifterId: sifterMap.sifterId as number | null,
        filterId: sifterMap.filterId as number | null,
        ordinal: sifterMap.ordinal as number | null,
        owner: sifterMap.owner,
      }));

      const filterMaps = asRecordList(siftersFiltersMap.filters);
      const filters: Filter[] = filterMaps.map((filterMap) => ({
        id: filterMap.id as number | null,
        filter: String(
          filterMap.filter ?? filterMap.title ?? '.',
        ),
        purpose: String(
          filterMap.purpose ?? filterMap.quote ?? '.',
        ),
        status: filterMap.status,
        sizeInBytes:
          typeof filterMap.sizeInBytes === "number"
            ? filterMap.sizeInBytes
            : null,
        descendentsSums: filterMap.descendentsSums,
      }));

      contentInput = {
        records: { siftersFilters: { sifters, filters } },
      };
    }

    if (contentInput == null) {
      contentInput = {
        records: { siftersFilters: { sifters: [], filters: [] } },
      };
    }

    return PennantFormatter.format({ banners, content: contentInput });
  },

  format(input: {
    banners: Banner[];
    content: {
      records: { siftersFilters: { sifters: Sifter[]; filters: Filter[] } };
    } | null;
  }): {
    handlers: { handlesFilters: Array<{ id: number | null; keyword: string }> };
    banners: Array<Record<string, unknown>>;
    content: unknown[];
  } {
    const banners = input.banners;
    const siftersFilters =
      input.content?.records?.siftersFilters ?? { sifters: [], filters: [] };

    const sifters = siftersFilters.sifters ?? [];
    const filters = siftersFilters.filters ?? [];

    const handlesFilters = filters.map((filter) => ({
      id: filter.id,
      keyword: filter.filter,
    }));

    const handlers = { handlesFilters };

    const bannerRows: Array<Record<string, unknown>> = [];
    for (const banner of banners) {
      const primarySifter =
        sifters.find((s) => s.sifterId === banner.id) ?? null;

      const childPennants = sifters
        .filter((sifter) => sifter.sifterId === banner.id)
        .map((sifter) => {
          const found =
            filters.find(
              (f) => f.id != null && f.id === sifter.filterId,
            ) ?? null;
          if (found == null) {
            return null;
          }
          return toChildPennantMap(sifter, found);
        })
        .filter((p): p is Record<string, unknown> => p != null);

      const properties = banner.properties
        ? { ...banner.properties }
        : {};
      delete properties.properties;
      delete properties.pennants;

      let ordinalValue = 0;
      if (primarySifter != null && primarySifter.ordinal != null) {
        ordinalValue = primarySifter.ordinal;
      } else {
        const o = properties.ordinal;
        if (typeof o === "number") {
          ordinalValue = o;
        }
      }

      const row: Record<string, unknown> = {};
      row.owner = firstNonNull(
        primarySifter != null ? primarySifter.owner : null,
        properties.owner,
        false,
      );
      row.ordinal = firstNonNull(
        primarySifter != null ? primarySifter.ordinal : null,
        properties.ordinal,
        0,
      );
      row.sifterId = firstNonNull(properties.sifterId, banner.id);
      row.bannerId = firstNonNull(properties.bannerId, banner.id);
      row.pennants = childPennants;
      row.isHighlighted = firstNonNull(properties.isHighlighted, false);
      row.isDismissed = firstNonNull(properties.isDismissed, false);
      if (properties.descendentsSums != null) {
        row.descendentsSums = properties.descendentsSums;
      } else {
        row.descendentsSums = emptyDescendentsSumsForEntity("sifters");
      }
      row.quote = firstNonNull(
        properties.quote,
        properties.purpose,
        ".",
      );
      row.title = firstNonNull(
        properties.title,
        properties.sifter,
        properties.filter,
        ".",
      );
      row.sizeInBytes = firstNonNull(properties.sizeInBytes, 0);
      row.status = firstNonNull(properties.status, 0);
      row.id = firstNonNull(properties.id, banner.id);
      row.contiguousOrdinal = ordinalValue;
      putBannerDisplayDefaults(row);
      bannerRows.push(row);
    }

    return { handlers, banners: bannerRows, content: [] };
  },
};
