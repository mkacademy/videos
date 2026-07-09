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
  status?: string | null;
}

interface MessageStatus {
  source: string;
  initial: string | null;
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
  status: MessageStatus | null;
  imageurl: string | null | undefined;
  molds: Array<Record<string, unknown>>;
  mailer: number | null;
}

function initIncomingMsg(status: string | null | undefined): MessageStatus {
  switch (status) {
    case "FROMUSER":
    case "FROMADMIN":
    case "FROMMOD":
      return {
        source: status,
        initial: status,
        primary: { disabled: false, label: "MarkAsRead", status },
        danger: { disabled: false, label: "Discard", status },
      };
    case "READFROMADMIN":
    case "READFROMUSER":
    case "READFROMMOD":
    case "UNKNOWN":
      return {
        source: status,
        initial: status,
        primary: { disabled: false, label: "Cancel", status },
        danger: { disabled: true, label: "MarkedAsRead" },
      };
    case "CREATED":
    default: {
      const finalStatus = status != null ? status : "CREATED";
      return {
        source: finalStatus,
        initial: status ?? null,
        primary: { disabled: true, label: "Cancel" },
        danger: { disabled: true, label: "MarkedAsRead" },
      };
    }
  }
}

function processInstructions(
  instructions: Array<Record<string, unknown>>,
  molds: Array<Record<string, unknown>>,
  type: string,
  mailer: number | null,
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

    const messageStatus =
      molds
        .filter((mold) => id === mold.instructionId)
        .map((mold) => {
          const source = (mold.source as string | undefined) ?? "CREATED";
          return initIncomingMsg(source);
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
      status: messageStatus,
      imageurl,
      molds,
      mailer,
    };
  });
}

function processFilters(
  filters: Array<Record<string, unknown>>,
  molds: Array<Record<string, unknown>>,
  type: string,
  mailer: number | null,
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

    const messageStatus =
      molds
        .filter((mold) => id === mold.filterId)
        .map((mold) => {
          const source = (mold.source as string | undefined) ?? "CREATED";
          return initIncomingMsg(source);
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
      status: messageStatus,
      imageurl: null,
      molds,
      mailer,
    };
  });
}

function processSifters(
  sifters: Array<Record<string, unknown>>,
  molds: Array<Record<string, unknown>>,
  type: string,
  mailer: number | null,
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

    const messageStatus =
      molds
        .filter((mold) => id === mold.sifterId)
        .map((mold) => {
          const source = (mold.source as string | undefined) ?? "CREATED";
          return initIncomingMsg(source);
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
      status: messageStatus,
      imageurl: null,
      molds,
      mailer,
    };
  });
}

function processDashboards(
  dashboards: Array<Record<string, unknown>>,
  molds: Array<Record<string, unknown>>,
  type: string,
  mailer: number | null,
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

    const messageStatus =
      molds
        .filter((mold) => id === mold.dashboardId)
        .map((mold) => {
          const source = (mold.source as string | undefined) ?? "CREATED";
          return initIncomingMsg(source);
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
      status: messageStatus,
      imageurl: null,
      molds,
      mailer,
    };
  });
}

export const IncoimngFormatter = {
  FF: "ff",
  FI: "fi",
  FS: "fs",
  FD: "fd",

  toggleIncomingMsg(
    btnLabel: string,
    source: string,
  ): { isModified: boolean; status: MessageStatus } {
    if (btnLabel === "MarkAsRead") {
      return {
        isModified: true,
        status: {
          source: "READ" + source,
          initial: null,
          primary: { disabled: false, label: "Cancel" },
          danger: { disabled: true, label: "MarkedAsRead" },
        },
      };
    }
    if (btnLabel === "Discard") {
      return {
        isModified: true,
        status: {
          source,
          initial: null,
          primary: { disabled: false, label: "Cancel" },
          danger: { disabled: true, label: "Discarded" },
        },
      };
    }
    return {
      isModified: false,
      status: {
        source: source.replace("READ", ""),
        initial: null,
        primary: { disabled: false, label: "MarkAsRead" },
        danger: { disabled: false, label: "Discard" },
      },
    };
  },

  format(
    content: Content,
    mailer: number | null,
  ): {
    content: FormattedMessage[];
    counts: Record<string, unknown>;
  } {
    const records = content.records;
    const counts = content.counts;

    const formattedMessages: FormattedMessage[] = [];

    const foundationInstructionsMap = asRecord(
      records.foundationInstructions ?? {},
    );
    const fInstructions = asRecordList(
      foundationInstructionsMap.instructions,
    );
    const iFoundation = asRecordList(foundationInstructionsMap.foundation);

    const foundationFiltersMap = asRecord(records.foundationFilters ?? {});
    const fFilters = asRecordList(foundationFiltersMap.filters);
    const fFoundation = asRecordList(foundationFiltersMap.foundation);

    const foundationSiftersMap = asRecord(records.foundationSifters ?? {});
    const fSifters = asRecordList(foundationSiftersMap.sifters);
    const sFoundation = asRecordList(foundationSiftersMap.foundation);

    const foundationDashboardsMap = asRecord(
      records.foundationDashboards ?? {},
    );
    const fDashboards = asRecordList(foundationDashboardsMap.dashboards);
    const dFoundation = asRecordList(foundationDashboardsMap.foundation);

    formattedMessages.push(
      ...processInstructions(fInstructions, iFoundation, IncoimngFormatter.FI, mailer),
    );
    formattedMessages.push(
      ...processFilters(fFilters, fFoundation, IncoimngFormatter.FF, mailer),
    );
    formattedMessages.push(
      ...processSifters(fSifters, sFoundation, IncoimngFormatter.FS, mailer),
    );
    formattedMessages.push(
      ...processDashboards(
        fDashboards,
        dFoundation,
        IncoimngFormatter.FD,
        mailer,
      ),
    );

    return { content: formattedMessages, counts };
  },
};
