import type { Content } from "../Flattenners";
import { emptyDescendentsSumsForEntity } from "../../structure/utils/EntityUtils";

export interface QuizResult {
  handlers: Record<string, unknown>;
  quizzes: Array<Record<string, unknown>>;
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
  return firstNonNull(row.id, row.dashboardId, row.filterId, row.foundationId);
}

function objectsEquals(a: unknown, b: unknown): boolean {
  return a === b;
}

function putIfAbsent(
  map: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (!(key in map)) {
    map[key] = value;
  }
}

function quizFoundationMoldWithDefaults(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const f: Record<string, unknown> = { ...raw };
  putIfAbsent(f, "owner", false);
  putIfAbsent(f, "ordinal", 0);
  const dashboardId = firstNonNull(
    f.dashboardId,
    f.id,
    f.foundationId,
    0,
  );
  f.dashboardId = dashboardId != null ? dashboardId : 0;
  return f;
}

function putQuizRowPlaceholders(
  quiz: Record<string, unknown>,
  dashboardRow: Record<string, unknown>,
): void {
  if (quiz.owner == null) {
    quiz.owner = false;
  }
  if (quiz.ordinal == null) {
    quiz.ordinal = 0;
  }
  if (quiz.title == null) {
    quiz.title =
      "dashboard" in dashboardRow ? dashboardRow.dashboard : ".";
  }
  if (quiz.descendentsSums == null) {
    quiz.descendentsSums = emptyDescendentsSumsForEntity("dashboards");
  }
  if (quiz.quote == null) {
    quiz.quote = "purpose" in dashboardRow ? dashboardRow.purpose : ".";
  }
  if (quiz.sizeInBytes == null) {
    quiz.sizeInBytes = 0;
  }
  if (quiz.status == null) {
    quiz.status = 0;
  }
  if (quiz.id == null) {
    quiz.id = firstNonNull(childEntityId(dashboardRow), 0);
  }
}

function putQuizPennantPlaceholders(
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

function withMissingFoundationDashboards(
  dashboards: Array<Record<string, unknown>> | null | undefined,
  foundation: Array<Record<string, unknown>> | null | undefined,
): Array<Record<string, unknown>> {
  const output = dashboards != null ? [...dashboards] : [];
  const seenDashboardIds = new Set<unknown>();
  for (const row of output) {
    const id = childEntityId(row);
    if (id != null) {
      seenDashboardIds.add(id);
    }
  }

  if (foundation == null || foundation.length === 0) {
    return output;
  }

  for (const foundationRow of foundation) {
    if (foundationRow == null) {
      continue;
    }
    const dashboardId = firstNonNull(
      foundationRow.dashboardId,
      foundationRow.id,
      foundationRow.foundationId,
    );
    if (dashboardId == null || seenDashboardIds.has(dashboardId)) {
      continue;
    }
    const synthesizedDashboard: Record<string, unknown> = {
      dashboardId,
      id: dashboardId,
    };
    output.push(synthesizedDashboard);
    seenDashboardIds.add(dashboardId);
  }
  return output;
}

export const QuizFormatter = {
  format(content: Content): QuizResult {
    const records = content.records ?? {};
    const counts = content.counts ?? {};

    const foundationDashboards = mapOrEmpty(records, "foundationDashboards");
    const dashboardsFilters = mapOrEmpty(records, "dashboardsFilters");

    const dashboards = listOfMapsOrEmpty(foundationDashboards, "dashboards");
    const foundation = listOfMapsOrEmpty(foundationDashboards, "foundation");
    const filters = listOfMapsOrEmpty(dashboardsFilters, "filters");
    const molds = listOfMapsOrEmpty(dashboardsFilters, "dashboards");

    const rootMolds = foundation.map(quizFoundationMoldWithDefaults);

    let effectiveDashboards = dashboards;
    if (
      (effectiveDashboards == null || effectiveDashboards.length === 0) &&
      molds != null &&
      molds.length > 0
    ) {
      const dashboardIds = new Set<unknown>();
      for (const mold of molds) {
        if (mold == null) {
          continue;
        }
        const id = firstNonNull(
          mold.dashboardId,
          mold.id,
          mold.foundationId,
        );
        if (id != null) {
          dashboardIds.add(id);
        }
      }
      effectiveDashboards = [...dashboardIds].map((id) => ({
        dashboardId: id,
        id,
      }));
    } else if (
      (effectiveDashboards == null || effectiveDashboards.length === 0) &&
      foundation != null &&
      foundation.length > 0
    ) {
      const dashboardIds = new Set<unknown>();
      for (const f of foundation) {
        if (f == null) {
          continue;
        }
        const id = firstNonNull(f.dashboardId, f.id, f.foundationId);
        if (id != null) {
          dashboardIds.add(id);
        }
      }
      effectiveDashboards = [...dashboardIds].map((id) => ({
        dashboardId: id,
        id,
      }));
    }

    const safeEffectiveDashboards = withMissingFoundationDashboards(
      effectiveDashboards,
      foundation,
    );
    const safeMolds = molds ?? [];

    const handlers: Record<string, unknown> = {
      handlesDashboards: safeEffectiveDashboards.map((d) => ({
        id: childEntityId(d),
        keyword: d.dashboard,
      })),
    };

    const quizzes = safeEffectiveDashboards.map((d) => {
      const quiz: Record<string, unknown> = {};
      const rootMold =
        rootMolds.find((r) =>
          objectsEquals(r.dashboardId, childEntityId(d)),
        ) ?? {};

      Object.assign(quiz, rootMold);
      quiz.isHighlighted = false;
      quiz.isDismissed = false;
      if (d.dashboard != null) {
        quiz.title = d.dashboard;
      }
      if (d.descendentsSums != null) {
        quiz.descendentsSums = d.descendentsSums;
      }
      if (d.purpose != null) {
        quiz.quote = d.purpose;
      }
      if (d.sizeInBytes != null) {
        quiz.sizeInBytes = d.sizeInBytes;
      }
      if (d.status != null) {
        quiz.status = d.status;
      }
      const id = childEntityId(d);
      if (id != null) {
        quiz.id = id;
      }
      putQuizRowPlaceholders(quiz, d);

      const pennants = safeMolds
        .filter((m) => objectsEquals(m.dashboardId, childEntityId(d)))
        .map((m) => {
          const filterMatchId = firstNonNull(m.filterId, m.foundationId);
          const filter =
            filters.find((f) =>
              objectsEquals(childEntityId(f), filterMatchId),
            ) ?? {};

          const pennant: Record<string, unknown> = {
            isHighlighted: false,
            isDismissed: false,
            descendentsSums: filter.descendentsSums,
            quote: filter.purpose,
            title: filter.filter,
            sizeInBytes: filter.sizeInBytes,
            bannerId: firstNonNull(m.dashboardId, m.foundationId),
            ordinal: m.ordinal,
            status: filter.status,
            owner: m.owner,
            id: childEntityId(filter),
          };
          putQuizPennantPlaceholders(pennant, filter);
          return pennant;
        });

      quiz.pennants = pennants;
      return quiz;
    });

    return { handlers, quizzes, counts };
  },
};
