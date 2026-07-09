import type { Content } from "../Flattenners";
import * as SafeGet from "../../structure/utils/SafeGet";

function asRecord(value: unknown): Record<string, unknown> {
  return (value as Record<string, unknown>) ?? {};
}

function asRecordList(value: unknown): Array<Record<string, unknown>> {
  return (value as Array<Record<string, unknown>>) ?? [];
}

const statuses: Record<number, string> = {
  0: "PENDING",
  1: "APPROVED",
  2: "REJECTED",
};

interface ButtonStatus {
  disabled: boolean;
  label: string;
}

interface MessageStatus {
  communications: string;
  primary: ButtonStatus;
  danger: ButtonStatus;
}

interface FormattedMessage {
  id: number | null;
  type: string;
  title: string | null;
  text: string | null;
  sizeInBytes: number;
  isModified: boolean;
  isDismissed: boolean;
  isHighlighted: boolean;
  footer: string | undefined;
  metadata: Array<Record<string, unknown>>;
  targets: Array<number | null>;
  status: MessageStatus | null;
  imageurl: string | null | undefined;
}

function intOutgoingMsg(status: string): MessageStatus | null {
  if (status === "SENT") {
    return {
      communications: status,
      primary: { disabled: false, label: "Resend" },
      danger: { disabled: true, label: "Cancel" },
    };
  }
  if (status === "DRAFT") {
    return {
      communications: status,
      primary: { disabled: false, label: "Send" },
      danger: { disabled: false, label: "Discard" },
    };
  }
  if (status === "RESENT") {
    return {
      communications: status,
      primary: { disabled: true, label: "Resent" },
      danger: { disabled: false, label: "Scratch" },
    };
  }
  return null;
}

function getUnderbossId(mold: Record<string, unknown>): number | null {
  return SafeGet.getInteger(mold, "underbossId", null);
}

function getMinionId(mold: Record<string, unknown>): number | null {
  return SafeGet.getInteger(mold, "minionId", null);
}

function getBossId(mold: Record<string, unknown>): number | null {
  return SafeGet.getInteger(mold, "bossId", null);
}

function groupHandles(
  handles: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const byId = new Map<number, Record<string, unknown>>();
  for (const handle of handles) {
    const id = SafeGet.getInteger(handle, "id", 0) ?? 0;
    if (!byId.has(id)) {
      byId.set(id, handle);
    }
  }
  return Array.from(byId.values());
}

function extractHandlesFromRecords(
  parentMap: Record<string, unknown>,
  handlesKey: string,
): Array<Record<string, unknown>> {
  const recordsMap = asRecord(parentMap.records ?? {});
  return asRecordList(recordsMap[handlesKey]);
}

export function populateHandleGroups(
  handlers: Record<string, Array<Record<string, unknown>>>,
  underbossesInstructionsMap: Record<string, unknown>,
  underbossesDashboardsMap: Record<string, unknown>,
  underbossesSiftersMap: Record<string, unknown>,
  underbossesFiltersMap: Record<string, unknown>,
  minionsInstructionsMap: Record<string, unknown>,
  minionsDashboardsMap: Record<string, unknown>,
  minionsSiftersMap: Record<string, unknown>,
  minionsFiltersMap: Record<string, unknown>,
  bossesInstructionsMap: Record<string, unknown>,
  bossesDashboardsMap: Record<string, unknown>,
  bossesSiftersMap: Record<string, unknown>,
  bossesFiltersMap: Record<string, unknown>,
): void {
  const underbossesInstructions = extractHandlesFromRecords(
    underbossesInstructionsMap,
    "handlesUnderbosses",
  );
  const underbossesDashboards = extractHandlesFromRecords(
    underbossesDashboardsMap,
    "handlesUnderbosses",
  );
  const underbossesSifters = extractHandlesFromRecords(
    underbossesSiftersMap,
    "handlesUnderbosses",
  );
  const underbossesFilters = extractHandlesFromRecords(
    underbossesFiltersMap,
    "handlesUnderbosses",
  );

  const minionsInstructions = extractHandlesFromRecords(
    minionsInstructionsMap,
    "handlesMinions",
  );
  const minionsDashboards = extractHandlesFromRecords(
    minionsDashboardsMap,
    "handlesMinions",
  );
  const minionsSifters = extractHandlesFromRecords(
    minionsSiftersMap,
    "handlesMinions",
  );
  const minionsFilters = extractHandlesFromRecords(
    minionsFiltersMap,
    "handlesMinions",
  );

  const bossesInstructions = extractHandlesFromRecords(
    bossesInstructionsMap,
    "handlesBosses",
  );
  const bossesDashboards = extractHandlesFromRecords(
    bossesDashboardsMap,
    "handlesBosses",
  );
  const bossesSifters = extractHandlesFromRecords(
    bossesSiftersMap,
    "handlesBosses",
  );
  const bossesFilters = extractHandlesFromRecords(
    bossesFiltersMap,
    "handlesBosses",
  );

  const underbossesHandles = [
    ...underbossesInstructions,
    ...underbossesDashboards,
    ...underbossesSifters,
    ...underbossesFilters,
  ];
  const minionsHandles = [
    ...minionsInstructions,
    ...minionsDashboards,
    ...minionsSifters,
    ...minionsFilters,
  ];
  const bossesHandles = [
    ...bossesInstructions,
    ...bossesDashboards,
    ...bossesFilters,
    ...bossesSifters,
  ];

  handlers.handlesUnderbosses = groupHandles(underbossesHandles);
  handlers.handlesMinions = groupHandles(minionsHandles);
  handlers.handlesBosses = groupHandles(bossesHandles);
}

function processInstructions(
  instructions: Array<Record<string, unknown>>,
  molds: Array<Record<string, unknown>>,
  type: string,
  mapper: (mold: Record<string, unknown>) => number | null,
): FormattedMessage[] {
  return instructions.map((instruction) => {
    const id = SafeGet.getInteger(instruction, "id", null);
    const title = instruction.instruction as string | null;
    const status = SafeGet.getInteger(instruction, "status", null);
    const details = instruction.details as string | null;
    const imageurl = instruction.imageurl as string | null;
    const sizeInBytes = SafeGet.getDouble(instruction, "sizeInBytes", 0);

    const metadata = molds
      .filter((mold) => id === mold.instructionId)
      .map((mold) => ({
        owner: mold.owner,
        ordinal: mold.ordinal,
      }));

    const targets = molds
      .filter((mold) => id === mold.instructionId)
      .map(mapper);

    const messageStatus =
      molds
        .filter((mold) => id === mold.instructionId)
        .map((mold) => {
          const communications =
            (mold.communications as string | undefined) ?? "DRAFT";
          return intOutgoingMsg(communications);
        })[0] ?? null;

    return {
      id,
      type,
      title,
      text: details,
      sizeInBytes,
      isModified: false,
      isDismissed: false,
      isHighlighted: false,
      footer: status != null ? statuses[status] : undefined,
      metadata,
      targets,
      status: messageStatus,
      imageurl,
    };
  });
}

function processDashboards(
  dashboards: Array<Record<string, unknown>>,
  molds: Array<Record<string, unknown>>,
  type: string,
  mapper: (mold: Record<string, unknown>) => number | null,
): FormattedMessage[] {
  return dashboards.map((dashboard) => {
    const id = SafeGet.getInteger(dashboard, "id", null);
    const title = dashboard.dashboard as string | null;
    const status = SafeGet.getInteger(dashboard, "status", null);
    const purpose = dashboard.purpose as string | null;
    const sizeInBytes = SafeGet.getDouble(dashboard, "sizeInBytes", 0);

    const metadata = molds
      .filter((mold) => id === mold.dashboardId)
      .map((mold) => ({
        owner: mold.owner,
        ordinal: mold.ordinal,
      }));

    const targets = molds
      .filter((mold) => id === mold.dashboardId)
      .map(mapper);

    const messageStatus =
      molds
        .filter((mold) => id === mold.dashboardId)
        .map((mold) => {
          const communications =
            (mold.communications as string | undefined) ?? "DRAFT";
          return intOutgoingMsg(communications);
        })[0] ?? null;

    return {
      id,
      type,
      title,
      text: purpose,
      sizeInBytes,
      isModified: false,
      isDismissed: false,
      isHighlighted: false,
      footer: status != null ? statuses[status] : undefined,
      metadata,
      targets,
      status: messageStatus,
      imageurl: null,
    };
  });
}

function processFilters(
  filters: Array<Record<string, unknown>>,
  molds: Array<Record<string, unknown>>,
  type: string,
  mapper: (mold: Record<string, unknown>) => number | null,
): FormattedMessage[] {
  return filters.map((filter) => {
    const id = SafeGet.getInteger(filter, "id", null);
    const title = filter.filter as string | null;
    const status = SafeGet.getInteger(filter, "status", null);
    const purpose = filter.purpose as string | null;
    const sizeInBytes = SafeGet.getDouble(filter, "sizeInBytes", 0);

    const metadata = molds
      .filter((mold) => id === mold.filterId)
      .map((mold) => ({
        owner: mold.owner,
        ordinal: mold.ordinal,
      }));

    const targets = molds
      .filter((mold) => id === mold.filterId)
      .map(mapper);

    const messageStatus =
      molds
        .filter((mold) => id === mold.filterId)
        .map((mold) => {
          const communications =
            (mold.communications as string | undefined) ?? "DRAFT";
          return intOutgoingMsg(communications);
        })[0] ?? null;

    return {
      id,
      type,
      title,
      text: purpose,
      sizeInBytes,
      isModified: false,
      isDismissed: false,
      isHighlighted: false,
      footer: status != null ? statuses[status] : undefined,
      metadata,
      targets,
      status: messageStatus,
      imageurl: null,
    };
  });
}

function processSifters(
  sifters: Array<Record<string, unknown>>,
  molds: Array<Record<string, unknown>>,
  type: string,
  mapper: (mold: Record<string, unknown>) => number | null,
): FormattedMessage[] {
  return sifters.map((sifter) => {
    const id = SafeGet.getInteger(sifter, "id", null);
    const title = sifter.sifter as string | null;
    const status = SafeGet.getInteger(sifter, "status", null);
    const purpose = sifter.purpose as string | null;
    const sizeInBytes = SafeGet.getDouble(sifter, "sizeInBytes", 0);

    const metadata = molds
      .filter((mold) => id === mold.sifterId)
      .map((mold) => ({
        owner: mold.owner,
        ordinal: mold.ordinal,
      }));

    const targets = molds
      .filter((mold) => id === mold.sifterId)
      .map(mapper);

    const messageStatus =
      molds
        .filter((mold) => id === mold.sifterId)
        .map((mold) => {
          const communications =
            (mold.communications as string | undefined) ?? "DRAFT";
          return intOutgoingMsg(communications);
        })[0] ?? null;

    return {
      id,
      type,
      title,
      text: purpose,
      sizeInBytes,
      isModified: false,
      isDismissed: false,
      isHighlighted: false,
      footer: status != null ? statuses[status] : undefined,
      metadata,
      targets,
      status: messageStatus,
      imageurl: null,
    };
  });
}

export const OutgoingFormatter = {
  MF: "mf",
  UF: "uf",
  BF: "bf",
  MI: "mi",
  UI: "ui",
  BI: "bi",
  MS: "ms",
  US: "us",
  BS: "bs",
  MD: "md",
  UD: "ud",
  BD: "bd",

  populateHandleGroups,

  format(content: Content): {
    content: FormattedMessage[];
    handlers: Record<string, Array<Record<string, unknown>>>;
    counts: Record<string, unknown>;
  } {
    const records = content.records;
    const counts = content.counts;

    const formattedMessages: FormattedMessage[] = [];
    const handlers: Record<string, Array<Record<string, unknown>>> = {};

    const bossesInstructionsMap = asRecord(records.bossesInstructions ?? {});
    const bInstructions = asRecordList(bossesInstructionsMap.instructions);
    const iBosses = asRecordList(bossesInstructionsMap.bosses);

    const minionsInstructionsMap = asRecord(records.minionsInstructions ?? {});
    const mInstructions = asRecordList(minionsInstructionsMap.instructions);
    const iMinions = asRecordList(minionsInstructionsMap.minions);

    const underbossesInstructionsMap = asRecord(
      records.underbossesInstructions ?? {},
    );
    const uInstructions = asRecordList(
      underbossesInstructionsMap.instructions,
    );
    const iUnderbosses = asRecordList(
      underbossesInstructionsMap.underbosses,
    );

    formattedMessages.push(
      ...processInstructions(uInstructions, iUnderbosses, OutgoingFormatter.UI, getUnderbossId),
    );
    formattedMessages.push(
      ...processInstructions(mInstructions, iMinions, OutgoingFormatter.MI, getMinionId),
    );
    formattedMessages.push(
      ...processInstructions(bInstructions, iBosses, OutgoingFormatter.BI, getBossId),
    );

    const bossesDashboardsMap = asRecord(records.bossesDashboards ?? {});
    const bDashboards = asRecordList(bossesDashboardsMap.dashboards);
    const dBosses = asRecordList(bossesDashboardsMap.bosses);

    const minionsDashboardsMap = asRecord(records.minionsDashboards ?? {});
    const mDashboards = asRecordList(minionsDashboardsMap.dashboards);
    const dMinions = asRecordList(minionsDashboardsMap.minions);

    const underbossesDashboardsMap = asRecord(
      records.underbossesDashboards ?? {},
    );
    const uDashboards = asRecordList(underbossesDashboardsMap.dashboards);
    const dUnderbosses = asRecordList(underbossesDashboardsMap.underbosses);

    formattedMessages.push(
      ...processDashboards(uDashboards, dUnderbosses, OutgoingFormatter.UD, getUnderbossId),
    );
    formattedMessages.push(
      ...processDashboards(mDashboards, dMinions, OutgoingFormatter.MD, getMinionId),
    );
    formattedMessages.push(
      ...processDashboards(bDashboards, dBosses, OutgoingFormatter.BD, getBossId),
    );

    const bossesFiltersMap = asRecord(records.bossesFilters ?? {});
    const bFilters = asRecordList(bossesFiltersMap.filters);
    const fBosses = asRecordList(bossesFiltersMap.bosses);

    const minionsFiltersMap = asRecord(records.minionsFilters ?? {});
    const mFilters = asRecordList(minionsFiltersMap.filters);
    const fMinions = asRecordList(minionsFiltersMap.minions);

    const underbossesFiltersMap = asRecord(records.underbossesFilters ?? {});
    const uFilters = asRecordList(underbossesFiltersMap.filters);
    const fUnderbosses = asRecordList(underbossesFiltersMap.underbosses);

    formattedMessages.push(
      ...processFilters(uFilters, fUnderbosses, OutgoingFormatter.UF, getUnderbossId),
    );
    formattedMessages.push(
      ...processFilters(mFilters, fMinions, OutgoingFormatter.MF, getMinionId),
    );
    formattedMessages.push(
      ...processFilters(bFilters, fBosses, OutgoingFormatter.BF, getBossId),
    );

    const bossesSiftersMap = asRecord(records.bossesSifters ?? {});
    const bSifters = asRecordList(bossesSiftersMap.sifters);
    const sBosses = asRecordList(bossesSiftersMap.bosses);

    const minionsSiftersMap = asRecord(records.minionsSifters ?? {});
    const mSifters = asRecordList(minionsSiftersMap.sifters);
    const sMinions = asRecordList(minionsSiftersMap.minions);

    const underbossesSiftersMap = asRecord(records.underbossesSifters ?? {});
    const uSifters = asRecordList(underbossesSiftersMap.sifters);
    const sUnderbosses = asRecordList(underbossesSiftersMap.underbosses);

    formattedMessages.push(
      ...processSifters(uSifters, sUnderbosses, OutgoingFormatter.US, getUnderbossId),
    );
    formattedMessages.push(
      ...processSifters(mSifters, sMinions, OutgoingFormatter.MS, getMinionId),
    );
    formattedMessages.push(
      ...processSifters(bSifters, sBosses, OutgoingFormatter.BS, getBossId),
    );

    populateHandleGroups(
      handlers,
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

    return {
      content: formattedMessages.filter((msg) => msg.targets.length > 0),
      handlers,
      counts,
    };
  },
};
