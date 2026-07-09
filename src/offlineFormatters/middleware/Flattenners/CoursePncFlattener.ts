import type { Content, FlattenResult } from "../Flattenners";

export const CoursePncFlattener = {
  flatten(input: Content): FlattenResult {
    const records = input.records;
    const counts = input.counts;

    const siCounts: Record<string, unknown> = {};
    siCounts.sifters = 0.0;
    siCounts.instructions = 0.0;

    const sfCounts: Record<string, unknown> = {};
    sfCounts.filters = 0.0;
    sfCounts.sifters = 0.0;

    const filtersInstructionsCounts: Record<string, unknown> = {};
    filtersInstructionsCounts.filters = 0.0;
    filtersInstructionsCounts.instructions = 0.0;

    const sfCountsCounts: Record<string, unknown> = {};
    sfCountsCounts.filtersInstructions = filtersInstructionsCounts;
    sfCounts.counts = sfCountsCounts;

    const countsData = counts != null ? counts : {};
    const foundationSifters = asMap(
      getOrDefault(countsData, "foundationSifters", {} as Record<string, unknown>),
    );

    const foundation = getOrDefault(foundationSifters, "foundation", 0.0) as number;
    const sifters = getOrDefault(foundationSifters, "sifters", 0.0) as number;

    const countsMap = asMap(
      getOrDefault(foundationSifters, "counts", {} as Record<string, unknown>),
    );
    let siftersInstructions = getOrDefault(
      countsMap,
      "siftersInstructions",
      null as Record<string, unknown> | null,
    );
    let siftersFilters = getOrDefault(
      countsMap,
      "siftersFilters",
      null as Record<string, unknown> | null,
    );

    if (siftersInstructions == null || isEmptyObject(siftersInstructions)) {
      siftersInstructions = getOrDefault(countsData, "siftersInstructions", siCounts);
    }
    if (siftersFilters == null || isEmptyObject(siftersFilters)) {
      siftersFilters = getOrDefault(
        countsData,
        "siftersFilters",
        null as Record<string, unknown> | null,
      );
      if (siftersFilters == null || isEmptyObject(siftersFilters)) {
        siftersFilters = sfCounts;
      }
    }

    const hasRealSiftersFilters =
      (foundationSifters != null && !isEmptyObject(foundationSifters)) ||
      (siftersFilters != null &&
        !isEmptyObject(siftersFilters) &&
        siftersFilters !== sfCounts);

    if (hasRealSiftersFilters && siftersFilters != null && !isEmptyObject(siftersFilters)) {
      const siftersFiltersCounts = getOrDefault(
        siftersFilters,
        "counts",
        null as Record<string, unknown> | null,
      );
      if (siftersFiltersCounts != null) {
        const nestedFiltersInstructions = getOrDefault(
          siftersFiltersCounts,
          "filtersInstructions",
          null as Record<string, unknown> | null,
        );
        if (nestedFiltersInstructions == null || isEmptyObject(nestedFiltersInstructions)) {
          const intermediateSiftersFilters = asMap(
            getOrDefault(countsData, "siftersFilters", {} as Record<string, unknown>),
          );
          const intermediateSiftersFiltersCounts = asMap(
            getOrDefault(
              intermediateSiftersFilters,
              "counts",
              {} as Record<string, unknown>,
            ),
          );
          const intermediateFiltersInstructions = getOrDefault(
            intermediateSiftersFiltersCounts,
            "filtersInstructions",
            null as Record<string, unknown> | null,
          );
          if (
            intermediateFiltersInstructions != null &&
            !isEmptyObject(intermediateFiltersInstructions)
          ) {
            siftersFiltersCounts.filtersInstructions = intermediateFiltersInstructions;
          } else {
            const rootFiltersInstructions = getOrDefault(
              countsData,
              "filtersInstructions",
              null as Record<string, unknown> | null,
            );
            if (rootFiltersInstructions != null && !isEmptyObject(rootFiltersInstructions)) {
              siftersFiltersCounts.filtersInstructions = rootFiltersInstructions;
            }
          }
        }
      }
    }

    const siRecords: Record<string, unknown> = {};
    siRecords.sifters = [];
    siRecords.instructions = [];

    const sfRecords: Record<string, unknown> = {};
    sfRecords.filters = [];
    sfRecords.sifters = [];

    const filtersInstructionsRecords: Record<string, unknown> = {};
    filtersInstructionsRecords.filters = [];
    filtersInstructionsRecords.instructions = [];

    const sfRecordsRecords: Record<string, unknown> = {};
    sfRecordsRecords.filtersInstructions = filtersInstructionsRecords;
    sfRecords.records = sfRecordsRecords;

    const recordsData = records != null ? records : {};
    const recordsFoundationSifters = asMap(
      getOrDefault(recordsData, "foundationSifters", {} as Record<string, unknown>),
    );

    const foundationList = getOrDefault(
      recordsFoundationSifters,
      "foundation",
      [] as unknown[],
    );
    const siftersList = getOrDefault(recordsFoundationSifters, "sifters", [] as unknown[]);

    const recordsMap = asMap(
      getOrDefault(recordsFoundationSifters, "records", {} as Record<string, unknown>),
    );
    const recordsSiftersInstructions = getOrDefault(
      recordsMap,
      "siftersInstructions",
      siRecords,
    );
    const recordsSiftersFilters = getOrDefault(recordsMap, "siftersFilters", sfRecords);

    const resultContent: Record<string, unknown> = {};
    const resultCounts: Record<string, unknown> = {};

    if (records != null && !isEmptyObject(records)) {
      const contentFoundationSifters: Record<string, unknown> = {};
      contentFoundationSifters.sifters = siftersList;
      contentFoundationSifters.foundation = foundationList;

      const contentSiftersFilters: Record<string, unknown> = {};
      contentSiftersFilters.filters = recordsSiftersFilters.filters;
      contentSiftersFilters.sifters = recordsSiftersFilters.sifters;

      const contentSiftersInstructions: Record<string, unknown> = {};
      contentSiftersInstructions.sifters = recordsSiftersInstructions.sifters;
      contentSiftersInstructions.instructions = recordsSiftersInstructions.instructions;

      const contentFiltersInstructions: Record<string, unknown> = {};
      const sfRecordsRecordsMap = recordsSiftersFilters.records as
        | Record<string, unknown>
        | undefined;

      if (sfRecordsRecordsMap != null) {
        const filtersInstructionsMap = sfRecordsRecordsMap.filtersInstructions as
          | Record<string, unknown>
          | undefined;
        if (filtersInstructionsMap != null) {
          contentFiltersInstructions.filters = filtersInstructionsMap.filters;
          contentFiltersInstructions.instructions = filtersInstructionsMap.instructions;
        } else {
          contentFiltersInstructions.filters = [];
          contentFiltersInstructions.instructions = [];
        }
      } else {
        contentFiltersInstructions.filters = [];
        contentFiltersInstructions.instructions = [];
      }

      resultContent.foundationSifters = contentFoundationSifters;
      resultContent.siftersFilters = contentSiftersFilters;
      resultContent.siftersInstructions = contentSiftersInstructions;
      resultContent.filtersInstructions = contentFiltersInstructions;
    }

    if (counts != null && !isEmptyObject(counts)) {
      const countsFiltersInstructions: Record<string, unknown> = {};

      const hasRealFoundationSifters =
        foundationSifters != null && !isEmptyObject(foundationSifters);

      let countsFoundationSifters: Record<string, unknown> | null = null;
      let countsSiftersFilters: Record<string, unknown> | null = null;
      let countsSiftersInstructions: Record<string, unknown> | null = null;

      if (hasRealFoundationSifters) {
        countsFoundationSifters = {};
        countsFoundationSifters.sifters = sifters;
        countsFoundationSifters.foundation = foundation;

        countsSiftersFilters = {};
        countsSiftersFilters.filters = siftersFilters.filters;
        countsSiftersFilters.sifters = siftersFilters.sifters;

        countsSiftersInstructions = {};
        countsSiftersInstructions.sifters = siftersInstructions.sifters;
        countsSiftersInstructions.instructions = siftersInstructions.instructions;
      } else {
        const intermediateSiftersFilters = getOrDefault(
          countsData,
          "siftersFilters",
          null as Record<string, unknown> | null,
        );
        const intermediateSiftersInstructions = getOrDefault(
          countsData,
          "siftersInstructions",
          null as Record<string, unknown> | null,
        );

        if (intermediateSiftersFilters != null && !isEmptyObject(intermediateSiftersFilters)) {
          countsSiftersFilters = {};
          countsSiftersFilters.filters = getOrDefault(intermediateSiftersFilters, "filters", 0.0);
          countsSiftersFilters.sifters = getOrDefault(intermediateSiftersFilters, "sifters", 0.0);
          siftersFilters = intermediateSiftersFilters;
        }

        if (
          intermediateSiftersInstructions != null &&
          !isEmptyObject(intermediateSiftersInstructions)
        ) {
          countsSiftersInstructions = {};
          countsSiftersInstructions.sifters = getOrDefault(
            intermediateSiftersInstructions,
            "sifters",
            0.0,
          );
          countsSiftersInstructions.instructions = getOrDefault(
            intermediateSiftersInstructions,
            "instructions",
            0.0,
          );
        }
      }

      const hasRealSiftersFiltersForResult =
        hasRealFoundationSifters ||
        (siftersFilters != null && !isEmptyObject(siftersFilters) && siftersFilters !== sfCounts);

      if (hasRealSiftersFiltersForResult && siftersFilters != null) {
        const sfCountsCountsMap = siftersFilters.counts as Record<string, unknown> | undefined;

        if (sfCountsCountsMap != null && !isEmptyObject(sfCountsCountsMap)) {
          const filtersInstructionsCountsMap = sfCountsCountsMap.filtersInstructions as
            | Record<string, unknown>
            | undefined;
          if (
            filtersInstructionsCountsMap != null &&
            !isEmptyObject(filtersInstructionsCountsMap)
          ) {
            countsFiltersInstructions.filters = filtersInstructionsCountsMap.filters;
            countsFiltersInstructions.instructions = filtersInstructionsCountsMap.instructions;
          } else {
            if (hasRealFoundationSifters) {
              const intermediateSiftersFilters = asMap(
                getOrDefault(countsData, "siftersFilters", {} as Record<string, unknown>),
              );
              const intermediateSiftersFiltersCounts = asMap(
                getOrDefault(
                  intermediateSiftersFilters,
                  "counts",
                  {} as Record<string, unknown>,
                ),
              );
              const intermediateFiltersInstructions = getOrDefault(
                intermediateSiftersFiltersCounts,
                "filtersInstructions",
                null as Record<string, unknown> | null,
              );
              if (
                intermediateFiltersInstructions != null &&
                !isEmptyObject(intermediateFiltersInstructions)
              ) {
                countsFiltersInstructions.filters = getOrDefault(
                  intermediateFiltersInstructions,
                  "filters",
                  0.0,
                );
                countsFiltersInstructions.instructions = getOrDefault(
                  intermediateFiltersInstructions,
                  "instructions",
                  0.0,
                );
              } else {
                const rootFiltersInstructions = getOrDefault(
                  countsData,
                  "filtersInstructions",
                  null as Record<string, unknown> | null,
                );
                if (rootFiltersInstructions != null && !isEmptyObject(rootFiltersInstructions)) {
                  countsFiltersInstructions.filters = getOrDefault(
                    rootFiltersInstructions,
                    "filters",
                    0.0,
                  );
                  countsFiltersInstructions.instructions = getOrDefault(
                    rootFiltersInstructions,
                    "instructions",
                    0.0,
                  );
                } else {
                  countsFiltersInstructions.filters = 0.0;
                  countsFiltersInstructions.instructions = 0.0;
                }
              }
            } else {
              const rootFiltersInstructions = getOrDefault(
                countsData,
                "filtersInstructions",
                null as Record<string, unknown> | null,
              );
              if (rootFiltersInstructions != null && !isEmptyObject(rootFiltersInstructions)) {
                countsFiltersInstructions.filters = getOrDefault(
                  rootFiltersInstructions,
                  "filters",
                  0.0,
                );
                countsFiltersInstructions.instructions = getOrDefault(
                  rootFiltersInstructions,
                  "instructions",
                  0.0,
                );
              } else {
                countsFiltersInstructions.filters = 0.0;
                countsFiltersInstructions.instructions = 0.0;
              }
            }
          }
        } else {
          if (hasRealFoundationSifters) {
            const intermediateSiftersFilters = asMap(
              getOrDefault(countsData, "siftersFilters", {} as Record<string, unknown>),
            );
            const intermediateSiftersFiltersCounts = asMap(
              getOrDefault(
                intermediateSiftersFilters,
                "counts",
                {} as Record<string, unknown>,
              ),
            );
            const intermediateFiltersInstructions = getOrDefault(
              intermediateSiftersFiltersCounts,
              "filtersInstructions",
              null as Record<string, unknown> | null,
            );
            if (
              intermediateFiltersInstructions != null &&
              !isEmptyObject(intermediateFiltersInstructions)
            ) {
              countsFiltersInstructions.filters = getOrDefault(
                intermediateFiltersInstructions,
                "filters",
                0.0,
              );
              countsFiltersInstructions.instructions = getOrDefault(
                intermediateFiltersInstructions,
                "instructions",
                0.0,
              );
            } else {
              const rootFiltersInstructions = getOrDefault(
                countsData,
                "filtersInstructions",
                null as Record<string, unknown> | null,
              );
              if (rootFiltersInstructions != null && !isEmptyObject(rootFiltersInstructions)) {
                countsFiltersInstructions.filters = getOrDefault(
                  rootFiltersInstructions,
                  "filters",
                  0.0,
                );
                countsFiltersInstructions.instructions = getOrDefault(
                  rootFiltersInstructions,
                  "instructions",
                  0.0,
                );
              } else {
                countsFiltersInstructions.filters = 0.0;
                countsFiltersInstructions.instructions = 0.0;
              }
            }
          } else {
            const rootFiltersInstructions = getOrDefault(
              countsData,
              "filtersInstructions",
              null as Record<string, unknown> | null,
            );
            if (rootFiltersInstructions != null && !isEmptyObject(rootFiltersInstructions)) {
              countsFiltersInstructions.filters = getOrDefault(
                rootFiltersInstructions,
                "filters",
                0.0,
              );
              countsFiltersInstructions.instructions = getOrDefault(
                rootFiltersInstructions,
                "instructions",
                0.0,
              );
            } else {
              countsFiltersInstructions.filters = 0.0;
              countsFiltersInstructions.instructions = 0.0;
            }
          }
        }
      } else {
        const rootFiltersInstructions = getOrDefault(
          countsData,
          "filtersInstructions",
          null as Record<string, unknown> | null,
        );
        if (rootFiltersInstructions != null && !isEmptyObject(rootFiltersInstructions)) {
          countsFiltersInstructions.filters = getOrDefault(rootFiltersInstructions, "filters", 0.0);
          countsFiltersInstructions.instructions = getOrDefault(
            rootFiltersInstructions,
            "instructions",
            0.0,
          );
        } else {
          countsFiltersInstructions.filters = 0.0;
          countsFiltersInstructions.instructions = 0.0;
        }
      }

      if (countsFoundationSifters != null) {
        resultCounts.foundationSifters = countsFoundationSifters;
      }
      if (countsSiftersFilters != null) {
        resultCounts.siftersFilters = countsSiftersFilters;
      }
      if (countsSiftersInstructions != null) {
        resultCounts.siftersInstructions = countsSiftersInstructions;
      }
      resultCounts.filtersInstructions = countsFiltersInstructions;
    }

    return { content: resultContent, counts: resultCounts };
  },
};

function getOrDefault<T>(map: Record<string, unknown>, key: string, defaultValue: T): T {
  return Object.prototype.hasOwnProperty.call(map, key) ? (map[key] as T) : defaultValue;
}

function asMap(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function isEmptyObject(obj: Record<string, unknown> | null | undefined): boolean {
  if (obj == null) {
    return true;
  }
  return Object.keys(obj).length === 0;
}
