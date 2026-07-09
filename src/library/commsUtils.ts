import { isPersistableOrdinal, sanitizeStringKeyOrdinalBatch, type OwnershipPayload } from "./actions";
import { Metadata } from "../components/Core/types";
import { contiguousOrdinalPred, getToken, orderPredicate, toOwnershipIdSet } from "./sliceUtils";
import {
  altGroupRangeReorderSegment,
  assignDenseOrdinalsZeroBased,
  findContiguousSortedRange,
  mergeGloballySortedWithAltGroupSegment,
  ordinalForReorder,
} from "./TutorialUtils";

const underbossImg = new URL("../Images/UnderBosses.png", import.meta.url).href;
const minionImg = new URL("../Images/Minions.png", import.meta.url).href;
const bossImg = new URL("../Images/Bosses.png", import.meta.url).href;
// Constants for different user types and sections
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

export const typesToRoutes: Record<string, string> = {
  [B]: "foundationbosses",
  [BS]: "bossessifters",
  [BF]: "bossesfilters",
  [MS]: "minionssifters",
  [MF]: "minionsfilters",
  [M]: "foundationminions",
  [FS]: "foundationsifters",
  [FF]: "foundationfilters",
  [US]: "underbossessifters",
  [UF]: "underbossesfilters",
  [BI]: "bossesinstructions",
  [MI]: "minionsinstructions",
  [U]: "foundationunderbosses",
  [FD]: "foundationdashboards",
  [FI]: "foundationinstructions",
  [UI]: "underbossesinstructions",
  [BD]: "bossesdashboards",
  [MD]: "minionsdashboards",
  [UD]: "underbossesdashboards",
};

export const ranks = [M, U, B];
export const filterTypes = [MF, BF, UF];
export const sifterTypes = [MS, BS, US];
export const dashboardTypes = [MD, BD, UD];
export const instructionTypes = [MI, BI, UI];

export type TutorType = typeof U | typeof B | typeof M;

export interface TutorStatus {
  isModified: boolean;
  state: boolean;
}

export interface TutorSelectedPayload {
  id: number;
  isActive?: { state: boolean; isModified: boolean };
  isAble?: { state: boolean; isModified: boolean };
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

interface DataItem {
  id: string | number;
}

export type RouteType =
  | "foundationdashboards"
  | "foundationinstructions"
  | "foundationsifters"
  | "foundationfilters"
  | "foundationbosses"
  | "foundationunderbosses"
  | "foundationminions"
  | "minionsfilters"
  | "minionsinstructions"
  | "minionsdashboards"
  | "minionssifters"
  | "underbossessifters"
  | "underbossesinstructions"
  | "underbossesdashboards"
  | "underbossesfilters"
  | "bossesfilters"
  | "bossessifters"
  | "bossesinstructions"
  | "bossesdashboards"
  | undefined;

export const getCommIds = (fetchedData: DataItem[] = [], route: RouteType): string[] | number[] => {
  const matches = window?.location?.pathname?.match(
    /(\/tutors|\/incoming|\/outgoing)$/
  );
  const isMessenger = matches !== null && matches.length > 0;
  const usecase = isMessenger === true ? route : undefined;
  return getCommIdsByRoute(fetchedData, usecase);
};

export const getCommIdsByRoute = (fetchedData: DataItem[] = [], route: RouteType): string[] | number[] => {
  switch (route) {
    case "foundationdashboards":
      return fetchedData.map(({ id }) => String(id) + FD);
    case "foundationinstructions":
      return fetchedData.map(({ id }) => String(id) + FI);
    case "foundationsifters":
      return fetchedData.map(({ id }) => String(id) + FS);
    case "foundationfilters":
      return fetchedData.map(({ id }) => String(id) + FF);
    case "foundationbosses":
      return fetchedData.map(({ id }) => String(id) + B);
    case "foundationunderbosses":
      return fetchedData.map(({ id }) => String(id) + U);
    case "foundationminions":
      return fetchedData.map(({ id }) => String(id) + M);
    case "minionsfilters":
      return fetchedData.map(({ id }) => String(id) + MF);
    case "minionsinstructions":
      return fetchedData.map(({ id }) => String(id) + MI);
    case "minionsdashboards":
      return fetchedData.map(({ id }) => String(id) + MD);
    case "minionssifters":
      return fetchedData.map(({ id }) => String(id) + MS);
    case "underbossessifters":
      return fetchedData.map(({ id }) => String(id) + US);
    case "underbossesinstructions":
      return fetchedData.map(({ id }) => String(id) + UI);
    case "underbossesdashboards":
      return fetchedData.map(({ id }) => String(id) + UD);
    case "underbossesfilters":
      return fetchedData.map(({ id }) => String(id) + UF);
    case "bossesfilters":
      return fetchedData.map(({ id }) => String(id) + BF);
    case "bossessifters":
      return fetchedData.map(({ id }) => String(id) + BS);
    case "bossesinstructions":
      return fetchedData.map(({ id }) => String(id) + BI);
    case "bossesdashboards":
      return fetchedData.map(({ id }) => String(id) + BD);
    default:
      return fetchedData.map(({ id }) => Number(id));
  }
};

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

export type CommsModifiedOrdinalLane = keyof CommsModifiedOrdinals;

export interface CommsState {
  tutors: Tutor[];
  outgoing: OutgoingMessage[];
  incoming: IncomingMessage[];
  startId: CommsStartId;
  modifiedOrdinals: CommsModifiedOrdinals;
}

/** Matches `commsKeyNodes` / `expandCommsOutlineRange` composite keys. */
export const commsOutlineKey = (r: { id: number; type: string }) => `${r.id}${r.type}`;

/**
 * Alt+ordinal-range group reorder for a comms lane (tutors / outgoing / incoming).
 * See `RangeSelectionOrReorderManger` comment examples; uses `ordinalForReorder` then dense `ordinal` reassignment.
 */
export function applyCommsAltGroupLaneReorder<
  T extends { id: number; type: string; ordinal: number; isHighlighted?: boolean; contiguousOrdinal?: number },
>(rows: T[], expandedKeys: string[]): T[] | null {
  if (expandedKeys.length < 2) return null;
  const keySet = new Set(expandedKeys);
  const mergeKey = (r: T) => commsOutlineKey(r);
  const byKey = new Map(rows.map((r) => [mergeKey(r), r]));
  if (!expandedKeys.every((k) => byKey.has(k))) return null;
  const type0 = byKey.get(expandedKeys[0])!.type;
  const sameTypeSorted = rows
    .filter((r) => r.type === type0)
    .sort((a, b) => ordinalForReorder(a) - ordinalForReorder(b));
  const range = findContiguousSortedRange(sameTypeSorted, (r) => keySet.has(mergeKey(r)), expandedKeys.length);
  if (!range) return null;
  const segment = sameTypeSorted.slice(range.lo, range.hi + 1);
  const newSeg = altGroupRangeReorderSegment(segment, (r) => !!r.isHighlighted);
  if (!newSeg) return null;
  const globalSorted = [...rows].sort((a, b) => ordinalForReorder(a) - ordinalForReorder(b));
  const merged = mergeGloballySortedWithAltGroupSegment(globalSorted, keySet, mergeKey, newSeg);
  if (!merged) return null;
  assignDenseOrdinalsZeroBased(merged);
  return [...merged]
    .sort(orderPredicate)
    .map((row, index, array) => contiguousOrdinalPred(row, index, array));
}

export function appendCommsReorderOrdinalBatches(
  modifiedOrdinals: CommsModifiedOrdinals,
  lane: CommsModifiedOrdinalLane,
  rows: Array<{ id: number; type: string; ordinal: number }>,
  beforeOrdinals: Map<string, number>,
): void {
  const batchesByType = new Map<string, CommsModifiedOrdinalBatch>();
  for (const row of rows) {
    const key = commsOutlineKey(row);
    const prev = beforeOrdinals.get(key);
    if (prev !== undefined && prev !== row.ordinal && isPersistableOrdinal(row.ordinal)) {
      const typeKey = row.type;
      const batch = batchesByType.get(typeKey) ?? {};
      batch[key] = row.ordinal;
      batchesByType.set(typeKey, batch);
    }
  }
  if (batchesByType.size === 0) return;
  const branch = modifiedOrdinals[lane] ?? (modifiedOrdinals[lane] = {});
  for (const [typeKey, batch] of batchesByType) {
    const sanitized = sanitizeStringKeyOrdinalBatch(batch);
    if (Object.keys(sanitized).length === 0) continue;
    const list = branch[typeKey] ?? (branch[typeKey] = []);
    list.push(sanitized);
  }
}

export const applyTutorsModified = (
  tutors: Tutor[],
  agreements: string[] | undefined,
  abilities: string[] | undefined,
): Tutor[] =>
  tutors
    .map((tutor) =>
      tutor.isAble.isModified === true &&
        abilities?.find((id) => id === tutor.id.toString())
        ? {
          ...tutor,
          isAble: {
            isModified: false,
            state: tutor.isAble.state,
          },
        }
        : tutor
    )
    .map((tutor) =>
      tutor.isActive.isModified === true &&
        agreements?.find((id) => id === tutor.id.toString())
        ? {
          ...tutor,
          isActive: {
            isModified: false,
            state: tutor.isActive.state,
          },
        }
        : tutor
    );

export const applySetSelectedTutors = (
  tutors: Tutor[],
  payload: TutorSelectedPayload,
): Tutor[] => {
  const { id, isActive, isAble } = payload;
  if (isActive === undefined && isAble === undefined) {
    return tutors.map((tutor) =>
      tutor.id === id
        ? { ...tutor, checked: !tutor.checked }
        : { ...tutor, checked: false }
    );
  }
  if (isActive && isActive.state !== null) {
    const { state: status, isModified } = isActive;
    return tutors.map((tutor) =>
      tutor.id === id
        ? {
          ...tutor,
          isActive: {
            state: !status,
            isModified: !isModified,
          },
        }
        : tutor
    );
  }
  if (isAble && isAble.state !== null) {
    const { state: status, isModified } = isAble;
    return tutors.map((tutor) =>
      tutor.id === id
        ? {
          ...tutor,
          isAble: {
            state: !status,
            isModified: !isModified,
          },
        }
        : tutor
    );
  }
  return tutors;
};

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

export const applyHierarchyMutationToTutors = (
  tutors: Tutor[],
  tokens: string[],
  selector: string,
): Tutor[] => {
  const candidates = tokens.map((t) => getToken(t));
  const isPromotion = selector === "promotions";
  return tutors.map((tutor) => {
    const { id, type } = tutor;
    const predicate = ({ userid }: { userid: number }) => userid === id;
    const tokenObj = candidates.find(predicate);
    if (tokenObj === undefined) return tutor;
    const { token } = tokenObj;
    if (!token) return tutor;
    const rank = ranks.indexOf(type);
    if (rank === -1) return tutor;
    if (isPromotion && rank + 1 < ranks.length)
      return {
        ...tutor,
        type: ranks[rank + 1] as TutorType,
        motion: { prev: type, cur: ranks[rank + 1] as TutorType, token },
      };
    if (rank - 1 > -1 && !isPromotion)
      return {
        ...tutor,
        type: ranks[rank - 1] as TutorType,
        motion: { prev: type, cur: ranks[rank - 1] as TutorType, token },
      };
    return tutor;
  });
};

export function applyOrdinalRangeReorderByKeys<T extends { ordinal: number }>(
  allItems: readonly T[],
  keys: string[],
  direction: boolean,
  readOrd: (item: T) => number,
  itemKey: (item: T) => string,
): void {
  if (keys.length < 2 || allItems.length < 2) return;
  const byKey = new Map(allItems.map((item) => [itemKey(item), item]));
  const presentKeys = keys.filter((key) => byKey.has(key));
  if (presentKeys.length < 2) return;

  const firstKey = presentKeys[0];
  const lastKey = presentKeys[presentKeys.length - 1];
  const orig = new Map<string, number>();
  for (const key of presentKeys) {
    orig.set(key, readOrd(byKey.get(key)!));
  }
  const firstItem = byKey.get(firstKey);
  const lastItem = byKey.get(lastKey);
  if (firstItem === undefined || lastItem === undefined) return;

  if (direction) {
    const lastOrd = orig.get(lastKey)!;
    firstItem.ordinal = lastOrd + 1;
    for (let i = 1; i < presentKeys.length; i++) {
      const item = byKey.get(presentKeys[i]);
      if (item !== undefined) item.ordinal = orig.get(presentKeys[i])! - 1;
    }
  } else {
    const firstOrd = orig.get(firstKey)!;
    lastItem.ordinal = firstOrd - 1;
    for (let i = 0; i < presentKeys.length - 1; i++) {
      const item = byKey.get(presentKeys[i]);
      if (item !== undefined) item.ordinal = orig.get(presentKeys[i])! + 1;
    }
  }

  const sorted = [...allItems].sort((a, b) => readOrd(a) - readOrd(b));
  assignDenseOrdinalsZeroBased(sorted);
}

export const outIntrPred = (row: OutgoingMessage | IncomingMessage | Tutor) => instructionTypes.includes(row.type ?? "");
export const outDashPred = (row: OutgoingMessage | IncomingMessage | Tutor) => dashboardTypes.includes(row.type ?? "");
export const outFilPred = (row: OutgoingMessage | IncomingMessage | Tutor) => filterTypes.includes(row.type ?? "");
export const outSiftPred = (row: OutgoingMessage | IncomingMessage | Tutor) => sifterTypes.includes(row.type ?? "");
export const inIntrPred = (row: OutgoingMessage | IncomingMessage | Tutor) => FI === row.type;
export const inSiftPred = (row: OutgoingMessage | IncomingMessage | Tutor) => FS === row.type;
export const inFilPred = (row: OutgoingMessage | IncomingMessage | Tutor) => FF === row.type;
export const inDashPred = (row: OutgoingMessage | IncomingMessage | Tutor) => FD === row.type;
export const underbossPred = (row: Tutor | OutgoingMessage | IncomingMessage) => U === row.type;
export const minionPred = (row: Tutor | OutgoingMessage | IncomingMessage) => M === row.type;
export const bossPred = (row: Tutor | OutgoingMessage | IncomingMessage) => B === row.type;

export type IncommingButtonLabel = "MarkAsRead" | "Discard" | "Cancel" | "MarkedAsRead" | "Discarded";

export const toggleIncomingMsg = (btnLabel: IncommingButtonLabel, source: string): IncommingMessageStatus => {
  if (btnLabel === "MarkAsRead")
    return {
      isModified: true,
      status: {
        source: "READ" + source,
        primary: { disabled: false, label: "Cancel" },
        danger: { disabled: true, label: "MarkedAsRead" },
      },
    };
  else if (btnLabel === "Discard")
    return {
      isModified: true,
      status: {
        source,
        primary: { disabled: false, label: "Cancel" },
        danger: { disabled: true, label: "Discarded" },
      },
    };
  else
    return {
      isModified: false,
      status: {
        source: source.replace("READ", ""),
        primary: { disabled: false, label: "MarkAsRead" },
        danger: { disabled: false, label: "Discard" },
      },
    };
};
export type OutgoingButtonLabel = "Send" | "Resend" | "Discard" | "Scratch" | "Discarded" | "Sent" | "Resent";
export interface OutgoingMessageStatus {
  isModified: boolean;
  status: {
    communications?: string;
    primary: { disabled: boolean; label: string };
    danger: { disabled: boolean; label: string };
  };
}


export const toggleOutgoingMsg = (btnLabel: OutgoingButtonLabel): OutgoingMessageStatus => {
  if (btnLabel === "Send")
    return {
      isModified: true,
      status: {
        communications: "SENT",
        primary: { disabled: true, label: "Sent" },
        danger: { disabled: false, label: "Cancel" },
      },
    };
  else if (btnLabel === "Resend")
    return {
      isModified: true,
      status: {
        communications: "RESENT",
        primary: { disabled: true, label: "Resent" },
        danger: { disabled: false, label: "Scratch" },
      },
    };
  else if (btnLabel === "Discard")
    return {
      isModified: true,
      status: {
        primary: { disabled: false, label: "Cancel" },
        danger: { disabled: true, label: "Discarded" },
      },
    };
  else if (btnLabel === "Scratch")
    return {
      isModified: false,
      status: {
        communications: "SENT",
        primary: { disabled: false, label: "Resend" },
        danger: { disabled: false, label: "Discard" },
      },
    };
  else
    return {
      isModified: false,
      status: {
        communications: "DRAFT",
        primary: { disabled: false, label: "Send" },
        danger: { disabled: false, label: "Discard" },
      },
    };
};

export const deletedPred = ({
  status: {
    danger: { label },
  },
}: IncommingMessageStatus | OutgoingMessageStatus) => label === "Discarded";

export const appIndeces: Record<string, number> = { outgoing: 5, tutors: 3, incoming: 4 };
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

export const outVariants: Record<OutgoingType, string> = {
  [MF]: "primary",
  [UF]: "danger",
  [BF]: "light",
  [MI]: "secondary",
  [UI]: "warning",
  [BI]: "dark",
  [MS]: "success",
  [US]: "info",
  [BS]: "dark",
  [MD]: "success",
  [UD]: "info",
  [BD]: "dark",
};

export type IncommingStates = "USER" | "MOD" | "ADMIN" | "CREATED";

export const inVariants: Record<IncomingType & IncommingStates, string> = {
  [FF + "USER"]: "primary",
  [FF + "MOD"]: "danger",
  [FF + "ADMIN"]: "light",
  [FF + "CREATED"]: "light",
  [FI + "USER"]: "secondary",
  [FI + "MOD"]: "warning",
  [FI + "ADMIN"]: "dark",
  [FI + "CREATED"]: "dark",
  [FS + "USER"]: "success",
  [FS + "MOD"]: "info",
  [FS + "ADMIN"]: "dark",
  [FS + "CREATED"]: "dark",
  [FD + "USER"]: "success",
  [FD + "MOD"]: "info",
  [FD + "ADMIN"]: "dark",
  [FD + "CREATED"]: "dark",
};

export const btnVariants: Record<IncommingButtonLabel | OutgoingButtonLabel, string> = {
  MarkedAsRead: "outline-secondary",
  Discarded: "outline-secondary",
  MarkAsRead: "outline-primary",
  Sent: "outline-secondary",
  Resent: "outline-secondary",
  Resend: "outline-primary",
  Cancel: "outline-warning",
  Discard: "outline-danger",
  Scratch: "outline-danger",
  Send: "outline-primary",
};

export const outBanners: Record<OutgoingType, string> = {
  [MF]: "Filter sent to Member",
  [UF]: "Filter sent to Moderator",
  [BF]: "Filter sent to Administrator",
  [MI]: "Step sent to Member",
  [UI]: "Step sent to Moderator",
  [BI]: "Step sent to Administrator",
  [MS]: "Sifter sent to Member",
  [US]: "Sifter sent to Moderator",
  [BS]: "Sifter sent to Administrator",
  [MD]: "Dashboard sent to Member",
  [UD]: "Dashboard sent to Moderator",
  [BD]: "Dashboard sent to Administrator",
};

export const inBanners: Record<IncomingType & IncommingStates, string> = {
  [FF + "USER"]: "Filter from Member",
  [FF + "MOD"]: "Filter from Moderator",
  [FF + "ADMIN"]: "Filter from Administrator",
  [FF + "CREATED"]: "Filter from Myself",
  [FI + "USER"]: "Step from Member",
  [FI + "MOD"]: "Step from Moderator",
  [FI + "ADMIN"]: "Step from Administrator",
  [FI + "CREATED"]: "Step from Myself",
  [FS + "USER"]: "Sifter from Member",
  [FS + "MOD"]: "Sifter from Moderator",
  [FS + "ADMIN"]: "Sifter from Administrator",
  [FS + "CREATED"]: "Sifter from Myself",
  [FD + "USER"]: "Dashboard from Member",
  [FD + "MOD"]: "Dashboard from Moderator",
  [FD + "ADMIN"]: "Dashboard from Administrator",
  [FD + "CREATED"]: "Dashboard from Myself",
};

export const avatars: Record<TutorType, string> = { [B]: bossImg, [M]: minionImg, [U]: underbossImg };

const INCOMING_MESSAGE_TYPES = new Set<string>([FF, FI, FS, FD]);

const updateCommsMessageOwnership = <T extends IncomingMessage | OutgoingMessage>(
  message: T,
  idSet: Set<number>,
  messageType: string,
  owner: boolean,
): T => {
  if (message.type !== messageType || !idSet.has(message.id)) return message;
  const metadata: Metadata[] = message.metadata?.length
    ? message.metadata.map((entry) => ({ ...entry, owner }))
    : [{ owner, ordinal: 0 }];
  return { ...message, metadata };
};

export const applyUpdateCommsOwnership = (state: CommsState, { ids, owner, route }: OwnershipPayload): void => {
  const messageType = Object.entries(typesToRoutes).find(([, approute]) => approute === route.toLowerCase())?.[0];
  if (!messageType) return;

  const idSet = toOwnershipIdSet(ids);
  if (idSet.size === 0) return;

  if (INCOMING_MESSAGE_TYPES.has(messageType)) {
    state.incoming = state.incoming.map((message) =>
      updateCommsMessageOwnership(message, idSet, messageType, owner),
    );
    return;
  }

  state.outgoing = state.outgoing.map((message) =>
    updateCommsMessageOwnership(message, idSet, messageType, owner),
  );
};