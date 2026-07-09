import type { Content, FlattenResult } from "../Flattenners";
import { CoursePncFlattener } from "../Flattenners/CoursePncFlattener";
import { QuizPncFlattener } from "../Flattenners/QuizPncFlattener";
import { TutorialPncFlattener } from "../Flattenners/TutorialPncFlattener";
import { OutgoingFormatter } from "./OutgoingFormatter";

function asRecord(value: unknown): Record<string, unknown> {
  return (value as Record<string, unknown>) ?? {};
}

function asRecordList(value: unknown): Array<Record<string, unknown>> {
  return (value as Array<Record<string, unknown>>) ?? [];
}

function handleEntry(
  item: Record<string, unknown>,
  keywordKey: string,
): Record<string, unknown> {
  return { id: item.id, keyword: item[keywordKey] };
}

export const CpanelFormatter = {
  handlers(
    webapp: string,
    cpanelResult: FlattenResult,
  ): Record<string, unknown> {
    switch (webapp) {
      case "tutorial": {
        const records = cpanelResult.content;
        const foundationFilters = asRecord(records.foundationFilters);
        const filters = asRecordList(foundationFilters.filters);
        return {
          handlesFilters: filters.map((f) => handleEntry(f, "filter")),
        };
      }
      case "course": {
        const records = cpanelResult.content;
        const foundationSifters = asRecord(records.foundationSifters);
        const sifters = asRecordList(foundationSifters.sifters);
        const siftersFilters = asRecord(records.siftersFilters);
        const silters = asRecordList(siftersFilters.filters);
        return {
          handlesSifters: sifters.map((s) => handleEntry(s, "sifter")),
          handlesFilters: silters.map((s) => handleEntry(s, "filter")),
        };
      }
      case "quiz": {
        const records = cpanelResult.content;
        const foundationDashboards = asRecord(records.foundationDashboards);
        const dashboardsList = asRecordList(foundationDashboards.dashboards);
        const foundationSifters = asRecord(records.dashboardsSifters);
        const sifters = asRecordList(foundationSifters.sifters);
        const siftersFilters = asRecord(records.siftersFilters);
        const silters = asRecordList(siftersFilters.filters);
        return {
          handlesDashboards: dashboardsList.map((d) =>
            handleEntry(d, "dashboard"),
          ),
          handlesSifters: sifters.map((s) => handleEntry(s, "sifter")),
          handlesFilters: silters.map((s) => handleEntry(s, "filter")),
        };
      }
      case "outgoing": {
        const records = cpanelResult.content;
        const bossesInstructionsMap = asRecord(records.bossesInstructions);
        const minionsInstructionsMap = asRecord(records.minionsInstructions);
        const underbossesInstructionsMap = asRecord(
          records.underbossesInstructions,
        );
        const bossesDashboardsMap = asRecord(records.bossesDashboards);
        const minionsDashboardsMap = asRecord(records.minionsDashboards);
        const underbossesDashboardsMap = asRecord(
          records.underbossesDashboards,
        );
        const bossesFiltersMap = asRecord(records.bossesFilters);
        const minionsFiltersMap = asRecord(records.minionsFilters);
        const underbossesFiltersMap = asRecord(records.underbossesFilters);
        const bossesSiftersMap = asRecord(records.bossesSifters);
        const minionsSiftersMap = asRecord(records.minionsSifters);
        const underbossesSiftersMap = asRecord(records.underbossesSifters);

        const groupedHandles: Record<string, Array<Record<string, unknown>>> =
          {};
        OutgoingFormatter.populateHandleGroups(
          groupedHandles,
          underbossesInstructionsMap,
          underbossesDashboardsMap,
          underbossesSiftersMap,
          underbossesFiltersMap,
          minionsInstructionsMap,
          minionsDashboardsMap,
          minionsSiftersMap,
          minionsFiltersMap,
          bossesInstructionsMap,
          bossesDashboardsMap,
          bossesSiftersMap,
          bossesFiltersMap,
        );
        delete underbossesDashboardsMap.records;
        delete minionsDashboardsMap.records;
        delete bossesDashboardsMap.records;
        delete underbossesSiftersMap.records;
        delete minionsSiftersMap.records;
        delete bossesSiftersMap.records;
        delete underbossesFiltersMap.records;
        delete minionsFiltersMap.records;
        delete bossesFiltersMap.records;
        delete underbossesInstructionsMap.records;
        delete minionsInstructionsMap.records;
        delete bossesInstructionsMap.records;
        return { ...groupedHandles };
      }
      default:
        return {};
    }
  },

  format(webapp: string, content: Content): FlattenResult {
    switch (webapp) {
      case "course":
        return CoursePncFlattener.flatten(content);
      case "tutorial":
        return TutorialPncFlattener.flatten(content);
      case "quiz": {
        const quiz = QuizPncFlattener.flatten(content);
        const unflattened = quiz.content.unflattened as Content;
        delete quiz.content.unflattened;
        const response = QuizPncFlattener.preFlatten(unflattened);
        const course = QuizPncFlattener.postFlatten(
          CoursePncFlattener.flatten(response),
        );
        return {
          content: { ...course.content, ...quiz.content },
          counts: { ...course.counts, ...quiz.counts },
        };
      }
      default: {
        const records = content.records;
        const counts = content.counts;
        return {
          content: records ?? {},
          counts: counts ?? {},
        };
      }
    }
  },
};
