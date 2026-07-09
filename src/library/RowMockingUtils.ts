import { getInteractionIDs } from "../utils";
import { Status } from "../store/slices/actionSlice";
import { DataRow, Metadata } from "../components/Core/types";
import type { IncomingMessage, OutgoingMessage } from "./commsUtils";

// Type definitions
interface BaseMetadata {
  id: string | number;
  status: number;
  sizeInBytes: number;
  isHighlighted: boolean;
}

export interface UserMetadata extends BaseMetadata {
  email: string;
  title: string;
  underbossId?: string;
  minionId?: string;
  bossId?: string;
}

export interface FilterMetadata extends BaseMetadata {
  quote: string;
  title: string;
  content: string;
  imageurl: string;
  filterId?: string;
  sifterId?: string;
  dashboardId?: string;
}

export interface InstructionMetadata extends BaseMetadata {
  title: string;
  imageurl: string;
  content: string;
}

interface UserInput {
  metadata: UserMetadata;
}

interface FilterInput {
  metadata: FilterMetadata;
}

interface InstructionInput {
  metadata: InstructionMetadata;
}

export interface BannerInput {
  id: string | number;
  owner?: boolean;
  quote: string;
  title: string;
  ordinal: number;
  sizeInBytes: number;
  isHighlighted: boolean;
  status: number | Status;
  bannerId?: number;
  bannerIds?: number[];
}

export interface PennantInput {
  id: string | number;
  owner?: boolean;
  quote: string;
  title: string;
  ordinal: number;
  status: number | Status;
  bannerId?: number;
  bannerIds?: number[];
  sizeInBytes: number;
  isHighlighted: boolean;
}

export interface StepInput {
  id: string | number;
  owner?: boolean;
  title: string;
  status: number | Status;
  ordinal: number;
  content: string;
  imageurl: string;
  bannerId?: number;
  bannerIds?: number[];
  sizeInBytes: number;
  isHighlighted: boolean;
}

export interface RootInput {
  id: string | number;
  owner?: boolean;
  content?: string | undefined;
  quote?: string | undefined;
  title: string;
  status: OutgoingMessage['status'] | IncomingMessage['status'] | number;
  text?: string | undefined;
  ordinal?: number | undefined;
  footer?: keyof typeof statuses;
  mailer?: string | number;
  targets?: (string | number)[];
  imageurl?: string;
  sizeInBytes?: number;
  isHighlighted: boolean;
  metadata?: Metadata
}

export interface UserMockInput {
  id: string | number;
  email: string;
  title: string;
  owner?: boolean;
  ordinal?: number;
  imageurl?: string;
  sizeInBytes?: number;
  isHighlighted: boolean;
  status: number | Status;
}
type MockFunction<T> = (input: T) => T;

export const statuses = { PENDING: 0, APPROVED: 1, REJECTED: 2 } as const;

export const userPred = ({
  metadata: {
    id,
    email,
    status,
    title,
    sizeInBytes,
    isHighlighted,
    ...themetadata
  },
  ...thedata
}: UserInput): DataRow => {
  const keys = Object.keys(themetadata);
  const interactionId =
    keys.find((k) => k === "underbossId") ??
    keys.find((k) => k === "minionId") ??
    keys.find((k) => k === "bossId");

  if (!interactionId) {
    throw new Error("No valid interaction ID found in metadata");
  }

  const key = interactionId.replace("Id", "");
  return {
    descendentsSums: {},
    ...thedata,
    id,
    email,
    status,
    sizeInBytes,
    [key]: title,
    checked: isHighlighted,
    metadata: themetadata as Metadata,
  };
};

export const filterPred = ({
  metadata: {
    id,
    quote,
    title,
    status,
    content,
    imageurl,
    sizeInBytes,
    isHighlighted,
    ...themetadata
  },
  ...thedata
}: FilterInput): DataRow => {
  const keys = Object.keys(themetadata);
  const interactionId =
    keys.find((k) => k === "filterId") ??
    keys.find((k) => k === "sifterId") ??
    keys.find((k) => k === "dashboardId");

  if (!interactionId) {
    throw new Error("No valid interaction ID found in metadata");
  }

  const key = interactionId.replace("Id", "");
  return {
    descendentsSums: {},
    ...thedata,
    id,
    status,
    sizeInBytes,
    [key]: title,
    purpose: quote,
    checked: isHighlighted,
    metadata: themetadata as Metadata,
  };
};

export const instructionPred = ({
  metadata: {
    id,
    title,
    status,
    imageurl,
    sizeInBytes,
    isHighlighted,
    content: details,
    ...themetadata
  },
  ...thedata
}: InstructionInput): DataRow => ({
  descendentsSums: {},
  ...thedata,
  id,
  status,
  details,
  imageurl,
  sizeInBytes,
  instruction: title,
  checked: isHighlighted,
  metadata: themetadata as Metadata,
});

export const bannersMocks = (from: string, to: string): MockFunction<BannerInput> => {
  const { parentID, childID } = getInteractionIDs(from, to);
  return (value: BannerInput): BannerInput => {
    const {
      id,
      owner,
      quote,
      title,
      status,
      ordinal,
      sizeInBytes,
      isHighlighted,
      bannerId,
      bannerIds,
    } = value;
    const result: BannerInput = {
      id,
      owner,
      quote,
      title,
      status,
      ordinal,
      sizeInBytes,
      isHighlighted,
    };

    if (childID) result[childID] = id;
    if (parentID) result[parentID] = bannerIds ?? (bannerId != null ? [bannerId] : []);

    return result;
  };
};

export const pennantsMocks = (from: string, to: string): MockFunction<PennantInput> => {
  const { parentID, childID } = getInteractionIDs(from, to);
  return (value: PennantInput): PennantInput => {
    const {
      id,
      owner,
      quote,
      title,
      ordinal,
      status,
      bannerId,
      bannerIds,
      sizeInBytes,
      isHighlighted,
    } = value;
    const result: PennantInput = {
      id,
      owner,
      quote,
      title,
      status,
      ordinal,
      sizeInBytes,
      isHighlighted,
    };

    if (childID) result[childID] = id;
    if (parentID) result[parentID] = bannerIds ?? (bannerId != null ? [bannerId] : []);

    return result;
  };
};

export const stepsMocks = (from: string, to: string): MockFunction<StepInput> => {
  const { parentID, childID } = getInteractionIDs(from, to);
  return (value: StepInput): StepInput => {
    const {
      id,
      owner,
      title,
      status,
      ordinal,
      content,
      imageurl,
      bannerId,
      bannerIds,
      sizeInBytes,
      isHighlighted,
    } = value;
    const result: StepInput = {
      id,
      owner,
      title,
      status,
      ordinal,
      content,
      imageurl,
      sizeInBytes,
      isHighlighted,
    };

    if (childID) result[childID] = id;
    if (parentID) result[parentID] = bannerIds ?? (bannerId != null ? [bannerId] : []);

    return result;
  };
};

export const rootMocks = (from: string, to: string): MockFunction<RootInput> => {
  const { parentID, childID } = getInteractionIDs(from, to);
  return (value: RootInput): RootInput => {
    const {
      id,
      text,
      owner,
      title,
      footer,
      mailer,
      targets,
      imageurl,
      sizeInBytes,
      isHighlighted,
      metadata: {owner: owner0, ordinal } = {},
    } = value;
    const result: RootInput = {
      id,
      title,
      ordinal,
      imageurl,
      quote: text,
      sizeInBytes,
      content: text,
      isHighlighted,
      owner: owner? owner : owner0,
      status: statuses[footer ?? "PENDING"],
    };

    if (childID) result[childID] = id;
    if (parentID) result[parentID] = targets ?? [mailer];

    return result;
  };
};

export const userMocks = (from: string, to: string): MockFunction<UserMockInput> => {
  const { parentID, childID } = getInteractionIDs(from, to);
  return (value: UserMockInput): UserMockInput => {
    const {
      id,
      email,
      title,
      owner,
      status,
      ordinal,
      imageurl,
      sizeInBytes,
      isHighlighted,
    } = value;
    const result: UserMockInput = {
      id,
      email,
      owner,
      title,
      status,
      ordinal,
      imageurl,
      sizeInBytes,
      isHighlighted,
    };

    if (childID) result[childID] = id;
    if (parentID) result[parentID] = [];

    return result;
  };
};

export const ownerMolds = (value: OutgoingMessage | IncomingMessage, _index: number): RootInput => {
  const { metadata, ...therest } = value;
  return {
    metadata: metadata?.find(({ owner }: { owner: boolean }) => owner) ?? { owner: false, ordinal: 0 },
    ...therest,
  };
};
