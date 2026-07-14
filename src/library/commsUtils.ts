import { Metadata } from "../components/Core/types";
import { contiguousOrdinalPred, orderPredicate } from "./sliceUtils";

const underbossImg = new URL("../Images/UnderBosses.png", import.meta.url).href;
const minionImg = new URL("../Images/Minions.png", import.meta.url).href;
const bossImg = new URL("../Images/Bosses.png", import.meta.url).href;

export const M = "m";
export const U = "u";
export const B = "b";
export const FF = "ff";
export const FI = "fi";
export const FS = "fs";
export const FD = "fd";
export const MF = "mf";
export const UF = "uf";
export const BF = "bf";
export const MI = "mi";
export const UI = "ui";
export const BI = "bi";
export const MS = "ms";
export const US = "us";
export const BS = "bs";
export const MD = "md";
export const UD = "ud";
export const BD = "bd";

export const filterTypes = [MF, BF, UF];
export const sifterTypes = [MS, BS, US];
export const dashboardTypes = [MD, BD, UD];

export type TutorType = typeof U | typeof B | typeof M;

export interface TutorStatus {
  isModified: boolean;
  state: boolean;
}

export interface Tutor {
  id: number;
  type: TutorType;
  email: string;
  title: string;
  status: number;
  ordinal: number;
  isAble: TutorStatus;
  isActive: TutorStatus;
  isDismissed: boolean;
  isHighlighted: boolean;
  isModified: boolean;
  contiguousOrdinal?: number;
  checked?: boolean;
  motion?: {
    prev: TutorType;
    cur: TutorType;
    token: string;
  };
}

export type IncomingType = typeof FF | typeof FI | typeof FS | typeof FD;

export type OutgoingType = typeof MF | typeof UF | typeof BF | typeof MI | typeof UI | typeof BI |
  typeof MS | typeof US | typeof BS | typeof UD | typeof MD | typeof BD;

export interface IncommingMessageStatus {
  isModified: boolean;
  status: {
    source: string;
    primary: { disabled: boolean; label: string };
    danger: { disabled: boolean; label: string };
  };
}

/** Footer keys aligned with `statuses` in RowMockingUtils. */
export type CommsMessageFooterKey = "PENDING" | "APPROVED" | "REJECTED";

export interface IncomingMessage {
  id: number;
  type: IncomingType;
  isDismissed: boolean;
  isHighlighted: boolean;
  isModified: boolean;
  targets?: string[];
  metadata?: Metadata[];
  title: string;
  text: string;
  mailer: number;
  mailers?: number[];
  contiguousOrdinal?: number;
  footer: CommsMessageFooterKey;
  status: IncommingMessageStatus["status"];
  ordinal: number;
}

export interface OutgoingMessage {
  id: number;
  type: OutgoingType;
  isDismissed: boolean;
  isHighlighted: boolean;
  isModified: boolean;
  targets?: (string | number)[];
  metadata?: Metadata[];
  title: string;
  text: string;
  footer: CommsMessageFooterKey;
  contiguousOrdinal?: number;
  reciepients?: string[];
  ordinal: number;
  status: {
    communications?: string;
    primary: { disabled: boolean; label: string };
    danger: { disabled: boolean; label: string };
  };
}

/** Per-outline-lane anchor for Shift+single-id outline tracking (see `RangeSelectionOrReorderManger`). */
export interface CommsStartId {
  tutorOutline: string | null;
  outgoingOutline: string | null;
  incomingOutline: string | null;
}

export const createCommsStartIdInitial = (): CommsStartId => ({
  tutorOutline: null,
  outgoingOutline: null,
  incomingOutline: null,
});

/** One batch: composite row key (`id`+`type`) → new `ordinal`. */
export type CommsModifiedOrdinalBatch = Record<string, number>;

/**
 * Tracks ordinal edits from comms reorder reducers: lane → row `type` within that lane →
 * append-only batches of { compositeKey → new ordinal }.
 */
export interface CommsModifiedOrdinals {
  tutor?: Record<string, CommsModifiedOrdinalBatch[]>;
  outgoing?: Record<string, CommsModifiedOrdinalBatch[]>;
  incoming?: Record<string, CommsModifiedOrdinalBatch[]>;
}

export interface CommsState {
  tutors: Tutor[];
  outgoing: OutgoingMessage[];
  incoming: IncomingMessage[];
  startId: CommsStartId;
  modifiedOrdinals: CommsModifiedOrdinals;
}

export const mergeOutgoingMessages = (
  existing: OutgoingMessage[],
  payload: OutgoingMessage[],
): OutgoingMessage[] =>
  Object.values(
    [...existing, ...payload].reduce((prev: Record<string, OutgoingMessage>, cur: OutgoingMessage) => {
      const identifier = cur.id + cur.type;
      if (prev[identifier]) {
        const { targets: oTargets, metadata: oMetadata } = cur;
        const {
          isDismissed,
          isHighlighted,
          targets: nTargets,
          metadata: nMetadata,
        } = prev[identifier];
        const duplicates = nTargets?.map((newTarget: string | number) =>
          oTargets?.findIndex((curTarget: string | number) => curTarget === newTarget)
        );
        const pred = (_: Metadata | string | number, i: number) =>
          duplicates?.find((index: number | undefined) => index === i) === undefined;
        prev[identifier] = {
          ...cur,
          isDismissed,
          isHighlighted,
          targets: [...(oTargets?.filter(pred) ?? []), ...nTargets ?? []],
          metadata: [...(oMetadata?.filter(pred) ?? []), ...nMetadata ?? []],
        };
      } else prev[identifier] = cur;
      return prev;
    }, {})
  ).sort(orderPredicate).map((row, index, array) => contiguousOrdinalPred(row, index, array));

export const outRoutes: Record<OutgoingType, string> = {
  [BF]: "bossesFilters",
  [BS]: "bossesSifters",
  [MS]: "minionsSifters",
  [MF]: "minionsFilters",
  [BD]: "bossesDashboards",
  [MD]: "minionsDashboards",
  [US]: "underbossesSifters",
  [BI]: "bossesInstructions",
  [UF]: "underbossesFilters",
  [MI]: "minionsInstructions",
  [UD]: "underbossesDashboards",
  [UI]: "underbossesInstructions",
};

export const avatars: Record<TutorType, string> = { [B]: bossImg, [M]: minionImg, [U]: underbossImg };
