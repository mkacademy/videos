import type { Content, FlattenResult } from "../Flattenners";
import { content as makeContent } from "../Flattenners";

function getOrDefault<T>(map: Record<string, unknown>, key: string, defaultValue: T): T {
  return Object.prototype.hasOwnProperty.call(map, key) ? (map[key] as T) : defaultValue;
}

function flatten(input: Content): FlattenResult {
  const records = input.records;
  const counts = input.counts;

  const dfCounts: Record<string, number> = { filters: 0, dashboards: 0 };

  const countsData = counts ?? {};
  const foundationDashboards = getOrDefault(countsData, "foundationDashboards", {}) as Record<
    string,
    unknown
  >;

  const countsMap = getOrDefault(foundationDashboards, "counts", {}) as Record<string, unknown>;
  let dashboardsFilters = getOrDefault(countsMap, "dashboardsFilters", null) as Record<
    string,
    unknown
  > | null;

  if (dashboardsFilters == null || Object.keys(dashboardsFilters).length === 0) {
    dashboardsFilters = getOrDefault(countsData, "dashboardsFilters", dfCounts) as Record<
      string,
      unknown
    >;
  }

  const foundation = (foundationDashboards.foundation as number) ?? 0;
  const dashboards = (foundationDashboards.dashboards as number) ?? 0;

  const dfRecords: Record<string, unknown> = { filters: [], dashboards: [] };

  const recordsData = records ?? {};
  const recordsFoundationDashboards = getOrDefault(
    recordsData,
    "foundationDashboards",
    {},
  ) as Record<string, unknown>;

  const foundationList = getOrDefault(recordsFoundationDashboards, "foundation", []) as unknown[];
  const dashboardsList = getOrDefault(recordsFoundationDashboards, "dashboards", []) as unknown[];

  const recordsMap = getOrDefault(recordsFoundationDashboards, "records", {}) as Record<
    string,
    unknown
  >;
  const recordsDashboardsFilters = getOrDefault(recordsMap, "dashboardsFilters", dfRecords) as Record<
    string,
    unknown
  >;

  const resultContent: Record<string, unknown> = {};
  const resultCounts: Record<string, unknown> = {};

  if (records && Object.keys(records).length > 0) {
    const contentFoundationDashboards: Record<string, unknown> = {
      dashboards: dashboardsList,
      foundation: foundationList,
    };

    const contentDashboardsFilters: Record<string, unknown> = {
      filters: recordsDashboardsFilters.filters,
      dashboards: recordsDashboardsFilters.dashboards,
    };

    resultContent.foundationDashboards = contentFoundationDashboards;
    resultContent.dashboardsFilters = contentDashboardsFilters;
  }

  if (counts && Object.keys(counts).length > 0) {
    const countsFoundationDashboards: Record<string, unknown> = {
      dashboards,
      foundation,
    };

    const countsDashboardsFilters: Record<string, unknown> = {
      filters: dashboardsFilters.filters,
      dashboards: dashboardsFilters.dashboards,
    };

    resultCounts.foundationDashboards = countsFoundationDashboards;
    resultCounts.dashboardsFilters = countsDashboardsFilters;
  }

  const unflattenedCounts: Record<string, unknown> = {};
  const unflattenedRecords: Record<string, unknown> = {};

  const recordsDashboardsSifters = getOrDefault(recordsMap, "dashboardsSifters", {}) as Record<
    string,
    unknown
  >;
  unflattenedRecords.dashboardsSifters = recordsDashboardsSifters;

  const dashboardsSifters = getOrDefault(countsMap, "dashboardsSifters", null) as Record<
    string,
    unknown
  > | null;
  if (dashboardsSifters != null && Object.keys(dashboardsSifters).length > 0) {
    unflattenedCounts.dashboardsSifters = dashboardsSifters;
  } else {
    if (Object.prototype.hasOwnProperty.call(countsData, "siftersInstructions")) {
      unflattenedCounts.siftersInstructions = countsData.siftersInstructions;
    }
    if (Object.prototype.hasOwnProperty.call(countsData, "siftersFilters")) {
      unflattenedCounts.siftersFilters = countsData.siftersFilters;
    }
    if (Object.prototype.hasOwnProperty.call(countsData, "filtersInstructions")) {
      unflattenedCounts.filtersInstructions = countsData.filtersInstructions;
    }
  }

  const result: FlattenResult = { content: resultContent, counts: resultCounts };
  result.content.unflattened = makeContent(unflattenedRecords, unflattenedCounts);
  return result;
}

function preFlatten(input: Content): Content {
  const counts = input.counts;
  const records = input.records;

  const resultCounts: Record<string, unknown> = {};
  const resultRecords: Record<string, unknown> = {};

  if (counts != null && Object.keys(counts).length > 0) {
    const dashboardsSifters = getOrDefault(counts, "dashboardsSifters", null) as Record<
      string,
      unknown
    > | null;
    const foundationSifters: Record<string, unknown> = {};

    if (dashboardsSifters == null || Object.keys(dashboardsSifters).length === 0) {
      const constructedCounts: Record<string, unknown> = {};

      if (Object.prototype.hasOwnProperty.call(counts, "siftersInstructions")) {
        constructedCounts.siftersInstructions = counts.siftersInstructions;
      }

      let siftersFilters: Record<string, unknown> | null = null;
      if (Object.prototype.hasOwnProperty.call(counts, "siftersFilters")) {
        siftersFilters = { ...(counts.siftersFilters as Record<string, unknown>) };
        constructedCounts.siftersFilters = siftersFilters;
      }

      if (Object.prototype.hasOwnProperty.call(counts, "filtersInstructions")) {
        if (siftersFilters == null) {
          siftersFilters = { sifters: 0, filters: 0 };
          constructedCounts.siftersFilters = siftersFilters;
        }
        const siftersFiltersCounts = getOrDefault(siftersFilters, "counts", {}) as Record<
          string,
          unknown
        >;
        siftersFiltersCounts.filtersInstructions = counts.filtersInstructions;
        siftersFilters.counts = siftersFiltersCounts;
        constructedCounts.siftersFilters = siftersFilters;
      }

      foundationSifters.foundation = 0;
      foundationSifters.sifters = 0;
      foundationSifters.counts = constructedCounts;
    } else {
      foundationSifters.foundation = getOrDefault(dashboardsSifters, "dashboards", 0);
      foundationSifters.sifters = getOrDefault(dashboardsSifters, "sifters", 0);
      foundationSifters.counts = getOrDefault(dashboardsSifters, "counts", {});
    }

    resultCounts.foundationSifters = foundationSifters;
  }

  if (records != null && Object.keys(records).length > 0) {
    const dashboardsSifters = getOrDefault(records, "dashboardsSifters", {}) as Record<
      string,
      unknown
    >;
    const foundationSifters: Record<string, unknown> = {
      foundation: getOrDefault(dashboardsSifters, "dashboards", []),
      sifters: getOrDefault(dashboardsSifters, "sifters", []),
      records: getOrDefault(dashboardsSifters, "records", {}),
    };
    resultRecords.foundationSifters = foundationSifters;
  }

  return makeContent(resultRecords, resultCounts);
}

function postFlatten(flattenedCourse: FlattenResult): FlattenResult {
  const counts = { ...flattenedCourse.counts };
  const contentMap = { ...flattenedCourse.content };

  const resultCounts: Record<string, unknown> = {};
  const resultContent: Record<string, unknown> = {};

  if (Object.keys(counts).length > 0) {
    const foundationSifters = getOrDefault(counts, "foundationSifters", {}) as Record<string, unknown>;
    const dashboardsSifters: Record<string, unknown> = {
      dashboards: getOrDefault(foundationSifters, "foundation", 0),
      sifters: getOrDefault(foundationSifters, "sifters", 0),
    };

    delete counts.foundationSifters;
    Object.assign(resultCounts, counts);
    resultCounts.dashboardsSifters = dashboardsSifters;
  }

  if (Object.keys(contentMap).length > 0) {
    const foundationSifters = getOrDefault(contentMap, "foundationSifters", {}) as Record<
      string,
      unknown
    >;
    const dashboardsSifters: Record<string, unknown> = {
      dashboards: getOrDefault(foundationSifters, "foundation", []),
      sifters: getOrDefault(foundationSifters, "sifters", []),
    };

    delete contentMap.foundationSifters;
    Object.assign(resultContent, contentMap);
    resultContent.dashboardsSifters = dashboardsSifters;
  }

  return { content: resultContent, counts: resultCounts };
}

export const QuizPncFlattener = { flatten, preFlatten, postFlatten };
