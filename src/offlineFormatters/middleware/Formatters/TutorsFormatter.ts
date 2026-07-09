import type { Content } from "../Flattenners";
import * as SafeGet from "../../structure/utils/SafeGet";

function asRecord(value: unknown): Record<string, unknown> {
  return (value as Record<string, unknown>) ?? {};
}

function asObjectList(value: unknown): unknown[] {
  return (value as unknown[]) ?? [];
}

interface Tutor {
  id: number | null;
  email: string | null;
  status: number | null;
  sizeInBytes: number | null;
  descendentsSums: Record<string, number>;
  title: string | null;
  type: string;
  isActive: Record<string, unknown>;
  isAble: Record<string, unknown>;
  checked: boolean | null;
  owner: boolean | null;
  ordinal: number | null;
  isHighlighted: boolean;
  isDismissed: boolean;
}

function getDoubleOrNull(
  map: Record<string, unknown>,
  key: string,
): number | null {
  const value = map[key];
  if (value == null) return null;
  if (typeof value === "number") return value;
  return null;
}

function getDescendentsSums(
  source: Record<string, unknown>,
): Record<string, number> {
  const value = source.descendentsSums;
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, number>;
  }
  return {};
}

function insertMinions(
  minions: unknown[],
  molds: unknown[] | null,
  tutors: Tutor[],
): void {
  const condensed =
    molds != null
      ? molds.map((mold) => {
          const m = mold as Record<string, unknown>;
          return {
            able: m.able,
            owner: m.owner,
            active: m.active,
            ordinal: m.ordinal,
            minionId: m.minionId,
          };
        })
      : [];

  for (const o of minions) {
    const minion = o as Record<string, unknown>;
    const minionId = SafeGet.getInteger(minion, "id", null);
    const state =
      condensed.find(
        (m) =>
          SafeGet.getInteger(m as Record<string, unknown>, "minionId", null) ===
          minionId,
      ) ?? {};

    const isActive: Record<string, unknown> = {
      state: (state as Record<string, unknown>).active ?? false,
      isModified: false,
    };

    const isAble: Record<string, unknown> = {
      state: (state as Record<string, unknown>).able ?? false,
      isModified: false,
    };

    const owner = SafeGet.getBoolean(
      state as Record<string, unknown>,
      "owner",
      null,
    );
    const ordinal = SafeGet.getInteger(
      state as Record<string, unknown>,
      "ordinal",
      null,
    );

    tutors.push({
      id: minionId,
      email: SafeGet.getString(minion, "email", null),
      status: SafeGet.getInteger(minion, "status", null),
      sizeInBytes: getDoubleOrNull(minion, "sizeInBytes"),
      descendentsSums: getDescendentsSums(minion),
      title: SafeGet.getString(minion, "minion", null),
      type: "m",
      isActive,
      isAble,
      checked: SafeGet.getBoolean(minion, "checked", false),
      owner,
      ordinal,
      isHighlighted: false,
      isDismissed: false,
    });
  }
}

function insertUnderbosses(
  underbosses: unknown[],
  molds: unknown[] | null,
  tutors: Tutor[],
): void {
  const condensed =
    molds != null
      ? molds.map((mold) => {
          const m = mold as Record<string, unknown>;
          return {
            able: m.able,
            owner: m.owner,
            active: m.active,
            ordinal: m.ordinal,
            underbossId: m.underbossId,
          };
        })
      : [];

  for (const o of underbosses) {
    const underboss = o as Record<string, unknown>;
    const underbossId = SafeGet.getInteger(underboss, "id", null);
    const state =
      condensed.find(
        (m) =>
          SafeGet.getInteger(
            m as Record<string, unknown>,
            "underbossId",
            null,
          ) === underbossId,
      ) ?? {};

    const isActive: Record<string, unknown> = {
      state: (state as Record<string, unknown>).active ?? false,
      isModified: false,
    };

    const isAble: Record<string, unknown> = {
      state: (state as Record<string, unknown>).able ?? false,
      isModified: false,
    };

    const owner = SafeGet.getBoolean(
      state as Record<string, unknown>,
      "owner",
      null,
    );
    const ordinal = SafeGet.getInteger(
      state as Record<string, unknown>,
      "ordinal",
      null,
    );

    tutors.push({
      id: underbossId,
      email: SafeGet.getString(underboss, "email", null),
      status: SafeGet.getInteger(underboss, "status", null),
      sizeInBytes: getDoubleOrNull(underboss, "sizeInBytes"),
      descendentsSums: getDescendentsSums(underboss),
      title: SafeGet.getString(underboss, "underboss", null),
      type: "u",
      isActive,
      isAble,
      checked: SafeGet.getBoolean(underboss, "checked", false),
      owner,
      ordinal,
      isHighlighted: false,
      isDismissed: false,
    });
  }
}

function insertBosses(
  bosses: unknown[],
  molds: unknown[] | null,
  tutors: Tutor[],
): void {
  const condensed =
    molds != null
      ? molds.map((mold) => {
          const m = mold as Record<string, unknown>;
          return {
            able: m.able,
            owner: m.owner,
            active: m.active,
            ordinal: m.ordinal,
            bossId: m.bossId,
          };
        })
      : [];

  for (const o of bosses) {
    const boss = o as Record<string, unknown>;
    const bossId = SafeGet.getInteger(boss, "id", null);
    const state =
      condensed.find(
        (m) =>
          SafeGet.getInteger(m as Record<string, unknown>, "bossId", null) ===
          bossId,
      ) ?? {};

    const isActive: Record<string, unknown> = {
      state: (state as Record<string, unknown>).active ?? false,
      isModified: false,
    };

    const isAble: Record<string, unknown> = {
      state: (state as Record<string, unknown>).able ?? false,
      isModified: false,
    };

    const owner = SafeGet.getBoolean(
      state as Record<string, unknown>,
      "owner",
      null,
    );
    const ordinal = SafeGet.getInteger(
      state as Record<string, unknown>,
      "ordinal",
      null,
    );

    tutors.push({
      id: bossId,
      email: SafeGet.getString(boss, "email", null),
      status: SafeGet.getInteger(boss, "status", null),
      sizeInBytes: getDoubleOrNull(boss, "sizeInBytes"),
      descendentsSums: getDescendentsSums(boss),
      title: SafeGet.getString(boss, "boss", null),
      type: "b",
      isActive,
      isAble,
      checked: SafeGet.getBoolean(boss, "checked", false),
      owner,
      ordinal,
      isHighlighted: false,
      isDismissed: false,
    });
  }
}

export const TutorsFormatter = {
  format(content: Content): {
    content: Tutor[];
    counts: Record<string, unknown>;
  } {
    const records = content.records;
    const counts = content.counts;

    const foundationBosses = asRecord(records.foundationBosses ?? {});
    const foundationMinions = asRecord(records.foundationMinions ?? {});
    const foundationUnderbosses = asRecord(records.foundationUnderbosses ?? {});

    const foundationB = asObjectList(foundationBosses.foundation);
    const foundationM = asObjectList(foundationMinions.foundation);
    const foundationU = asObjectList(foundationUnderbosses.foundation);

    const bosses = asObjectList(foundationBosses.bosses);
    const minions = asObjectList(foundationMinions.minions);
    const underbosses = asObjectList(foundationUnderbosses.underbosses);

    const tutors: Tutor[] = [];
    insertMinions(minions, foundationM, tutors);
    insertUnderbosses(underbosses, foundationU, tutors);
    insertBosses(bosses, foundationB, tutors);

    return { content: tutors, counts };
  },
};
