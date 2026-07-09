import type { Content, FlattenResult } from "../Flattenners";

export const TutorialPncFlattener = {
  flatten(input: Content): FlattenResult {
    const records = input.records;
    const counts = input.counts;

    const fiCounts: Record<string, number> = { instructions: 0, filters: 0 };
    const countsData = counts ?? {};
    const foundationFilters = (countsData.foundationFilters as Record<string, unknown>) ?? {};
    const countsMap = (foundationFilters.counts as Record<string, unknown>) ?? {};
    let filtersInstructions = countsMap.filtersInstructions as Record<string, unknown> | undefined;
    if (!filtersInstructions || Object.keys(filtersInstructions).length === 0) {
      filtersInstructions = (countsData.filtersInstructions as Record<string, unknown>) ?? fiCounts;
    }

    const foundation = (foundationFilters.foundation as number) ?? 0;
    const filters = (foundationFilters.filters as number) ?? 0;

    const fiRecords: Record<string, unknown> = { instructions: [], filters: [] };
    const recordsData = records ?? {};
    const recordsMap = (recordsData.foundationFilters as Record<string, unknown>) ?? {};
    const recordsNested = (recordsMap.records as Record<string, unknown>) ?? {};
    const recordsFiltersInstructions =
      (recordsNested.filtersInstructions as Record<string, unknown>) ?? fiRecords;

    const foundationList = (recordsMap.foundation as unknown[]) ?? [];
    const filtersList = (recordsMap.filters as unknown[]) ?? [];

    const resultContent: Record<string, unknown> = {};
    const resultCounts: Record<string, unknown> = {};

    if (records && Object.keys(records).length > 0) {
      resultContent.foundationFilters = {
        filters: filtersList,
        foundation: foundationList,
      };
      resultContent.filtersInstructions = {
        instructions: recordsFiltersInstructions.instructions,
        filters: recordsFiltersInstructions.filters,
      };
    }

    if (counts && Object.keys(counts).length > 0) {
      resultCounts.foundationFilters = { filters, foundation };
      resultCounts.filtersInstructions = {
        instructions: filtersInstructions.instructions,
        filters: filtersInstructions.filters,
      };
    }

    return { content: resultContent, counts: resultCounts };
  },
};
