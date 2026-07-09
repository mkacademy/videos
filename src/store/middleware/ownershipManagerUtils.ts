import {
  extractTutorialTreeData,
  extractCourseTreeData,
  extractQuizTreeData,
} from "./publishManagerUtils";
import { RootState } from "../types";
import { EDITABILITY, UPDATE_ROWS } from "../../utils";
import type { DataRow, Metadata } from "../../components/Core/types";
import { MutationDataAccumulator, PayloadData } from "../../Hooks/useSaveMutations";
import { MappedCourseTrees, MappedQuizTrees, MappedTutorialTrees } from "../slices/settingsSlice";
import { FF, FD, FS, FI, MF, UF, BF, MI, UI, BI, MS, US, BS, MD, UD, BD } from "../../library/commsUtils";
import { Freight } from "../../library/actions";
import {
  countStashRowsInFreights,
  findSelectedEscrowStashFreights,
  parseApprouteChildEntity,
  parseApprouteInteractionIds,
} from "../../library/ShortcutsUtils";
import { getStashCellRows, StashState } from "../slices/stashSlice";
import { TreeCategory } from "./HarvestManagerUtils";

/**
 * Creates a single EDITABILITY assert payload, or null if childIds is empty.
 */
function createAssertPayload(
  base: MutationDataAccumulator,
  target: string,
  entity: string,
  childIds: number[],
  parentIds: number[],
  editable: boolean
): MutationDataAccumulator | null {
  if (childIds.length === 0) return null;
  const payload: MutationDataAccumulator = {
    ...base,
    target,
    entity,
    resolvers: [EDITABILITY],
    [UPDATE_ROWS]: [{ editable, childIds, parentIds }] as unknown as PayloadData[],
  };
  return payload;
}

/**
 * Returns ownership assertion payloads for tutorials.
 */
export const getAssertTutorialPayloads = ({
  tts,
  ima,
  editable,
}: {
  tts: MappedTutorialTrees;
  ima: MutationDataAccumulator;
  editable: boolean;
}): MutationDataAccumulator[] => {
  const payloads: MutationDataAccumulator[] = [];
  Object.values(tts).forEach((tree) => {
    const treeTuples = extractTutorialTreeData(tree);
    treeTuples.forEach(({ target, entity, childIds, parentIds }) => {
      const payload = createAssertPayload(ima, target, entity, childIds, parentIds, editable);
      if (payload) payloads.push(payload);
    });
  });
  return payloads;
};

/**
 * Returns ownership assertion payloads for courses.
 */
export const getAssertCoursePayloads = ({
  cts,
  ima,
  editable,
}: {
  cts: MappedCourseTrees;
  ima: MutationDataAccumulator;
  editable: boolean;
}): MutationDataAccumulator[] => {
  const payloads: MutationDataAccumulator[] = [];
  Object.values(cts).forEach((tree) => {
    const treeTuples = extractCourseTreeData(tree);
    treeTuples.forEach(({ target, entity, childIds, parentIds }) => {
      const payload = createAssertPayload(ima, target, entity, childIds, parentIds, editable);
      if (payload) payloads.push(payload);
    });
  });
  return payloads;
};

/**
 * Returns ownership assertion payloads for quizzes.
 */
export const getAssertQuizPayloads = ({
  qts,
  ima,
  editable,
}: {
  qts: MappedQuizTrees;
  ima: MutationDataAccumulator;
  editable: boolean;
}): MutationDataAccumulator[] => {
  const payloads: MutationDataAccumulator[] = [];
  Object.values(qts).forEach((tree) => {
    const treeTuples = extractQuizTreeData(tree);
    treeTuples.forEach(({ target, entity, childIds, parentIds }) => {
      const payload = createAssertPayload(ima, target, entity, childIds, parentIds, editable);
      if (payload) payloads.push(payload);
    });
  });
  return payloads;
};

const toFiniteIds = (values: Array<string | number | boolean | null | undefined>): number[] =>
  values
    .map((value) => (typeof value === 'boolean' ? NaN : Number(value)))
    .filter((id) => Number.isFinite(id));

const parentIdsFromStashRows = (
  rows: DataRow[],
  parentKey: string | undefined
): number[] => {
  if (!parentKey) return [];
  const ids = rows.flatMap((row) => {
    const metadataVal = row.metadata?.[parentKey as keyof Metadata];
    if (metadataVal != null) {
      return Array.isArray(metadataVal) ? metadataVal : [metadataVal];
    }
    const bannerId = (row as DataRow & { bannerId?: number }).bannerId;
    return bannerId != null ? [bannerId] : [];
  });
  return [...new Set(toFiniteIds(ids))];
};

export const buildOwnershipPayloadFromFreight = (
  freight: Freight,
  stash: StashState,
  ima: MutationDataAccumulator,
  editable: boolean
): MutationDataAccumulator | null => {
  const childEntity = parseApprouteChildEntity(freight.approute);
  if (!childEntity) return null;

  const parentEntity = freight.approute.slice(0, freight.approute.length - childEntity.length);
  const rows = getStashCellRows(stash[freight.approute]?.[freight.timestamp]).filter(
    (row) => !row.deleted
  );
  const childIds = toFiniteIds(rows.map((row) => row.id));
  if (childIds.length === 0) return null;

  const interactionIds = parseApprouteInteractionIds(freight.approute);
  const parentIds =
    parentEntity.toLowerCase() === 'foundation'
      ? []
      : parentIdsFromStashRows(rows, interactionIds?.parentID);

  return createAssertPayload(ima, childEntity, parentEntity, childIds, parentIds, editable);
};

const selectedEscrowFreightsForCategory = (
  state: RootState,
  category: TreeCategory
): Freight[] => {
  const freights = findSelectedEscrowStashFreights(state);
  if (!freights?.length) return [];
  return freights.filter((freight) => freight.destination === category);
};

export const hasSelectedEscrowStashRows = (
  state: RootState,
  category: TreeCategory
): boolean => {
  const freights = selectedEscrowFreightsForCategory(state, category);
  return freights.length > 0 && countStashRowsInFreights(state.stash, freights) > 0;
};

export const buildOwnershipPayloadsFromSelectedEscrowStash = (
  state: RootState,
  ima: MutationDataAccumulator,
  category: TreeCategory,
  editable: boolean
): MutationDataAccumulator[] => {
  const freights = selectedEscrowFreightsForCategory(state, category);
  if (!freights.length) return [];

  return freights
    .map((freight) => buildOwnershipPayloadFromFreight(freight, state.stash, ima, editable))
    .filter((payload): payload is MutationDataAccumulator => payload != null);
};

const INCOMING_NODE_TYPES = [FF, FD, FS] as const;
const OUTGOING_NODE_TYPES = [MD, MF, MS, UD, US, UF, BS, BD, BF] as const;
const OUTGOING_LEAF_TYPES = [MI, UI, BI] as const;

function isOwned(item: { owner?: boolean; metadata?: Metadata }): boolean {
  const owner = item.owner !== undefined ? item.owner : item.metadata?.owner;
  return owner === true;
}

function isOwnedComms(metadata: Metadata[] | undefined): boolean {
  return Array.isArray(metadata) && metadata.some((m) => m.owner === true);
}

const verifiedOwnerships: { nodes: Set<number>; leaves: Set<number> } = {
  nodes: new Set(),
  leaves: new Set(),
};

const isIdOwned = (id: number, target: string): boolean =>
  target === 'instructions'
    ? verifiedOwnerships.leaves.has(id)
    : verifiedOwnerships.nodes.has(id);

const getPayloadChildIds = (payload: MutationDataAccumulator): number[] => {
  const updates = payload[UPDATE_ROWS] as Array<{ childIds?: number[] }> | undefined;
  return updates?.[0]?.childIds ?? [];
};

export const logOwnershipAssertionStats = (
  category: TreeCategory,
  assertOwnership: boolean,
  payloads: MutationDataAccumulator[],
): void => {
  const mode = assertOwnership ? 'assert' : 'unassert';
  const byLocation = payloads.map((payload) => {
    const childIds = getPayloadChildIds(payload);
    const ownedIds = childIds.filter((id) => isIdOwned(id, payload.target ?? ''));
    const notOwnedIds = childIds.filter((id) => !isIdOwned(id, payload.target ?? ''));
    return {
      target: payload.target,
      entity: payload.entity,
      total: childIds.length,
      owned: ownedIds.length,
      notOwned: notOwnedIds.length,
      ownedIds,
      notOwnedIds,
    };
  });

  const summary = byLocation.reduce(
    (acc, row) => ({
      totalIds: acc.totalIds + row.total,
      ownedIds: acc.ownedIds + row.owned,
      notOwnedIds: acc.notOwnedIds + row.notOwned,
    }),
    { totalIds: 0, ownedIds: 0, notOwnedIds: 0 },
  );

  console.group(`[ownership] ${category} (${mode})`);
  console.log('summary', { ...summary, payloadCount: payloads.length });
  console.table(
    byLocation.map(({ target, entity, total, owned, notOwned }) => ({
      target,
      entity,
      total,
      owned,
      notOwned,
    })),
  );
  byLocation.forEach(({ target, entity, ownedIds, notOwnedIds }) => {
    if (ownedIds.length > 0) {
      console.log(`${entity}/${target} owned IDs (${ownedIds.length}):`, ownedIds);
    }
    if (notOwnedIds.length > 0) {
      console.log(`${entity}/${target} not owned IDs (${notOwnedIds.length}):`, notOwnedIds);
    }
  });
  console.groupEnd();
};

export const verifyOwnership = (state: RootState): void => {
  verifiedOwnerships.nodes = new Set();
  verifiedOwnerships.leaves = new Set();

  const scanCounts = {
    tutorial: { nodes: 0, leaves: 0 },
    course: { nodes: 0, leaves: 0 },
    quiz: { nodes: 0, leaves: 0 },
    comms: { nodes: 0, leaves: 0 },
    stash: { nodes: 0, leaves: 0 },
  };

  // tutorialSlice: nodes = Banners, leaves = Contents
  for (const banner of state.tutorial.banners) {
    if (isOwned(banner)) {
      verifiedOwnerships.nodes.add(banner.id);
      scanCounts.tutorial.nodes += 1;
    }
  }
  for (const row of state.tutorial.content) {
    for (const content of row) {
      if (isOwned(content)) {
        verifiedOwnerships.leaves.add(content.id);
        scanCounts.tutorial.leaves += 1;
      }
    }
  }

  // courseSlice: nodes = Banners, Pennants; leaves = slideGroupItems, slideItems
  for (const banner of state.course.banners) {
    if (isOwned(banner)) {
      verifiedOwnerships.nodes.add(banner.id);
      scanCounts.course.nodes += 1;
    }
    for (const pennant of banner.pennants) {
      if (isOwned(pennant)) {
        verifiedOwnerships.nodes.add(pennant.id);
        scanCounts.course.nodes += 1;
      }
    }
  }
  for (const group of state.course.content) {
    const { slides, ...groupItems } = group;
    for (const key of Object.keys(groupItems)) {
      const item = groupItems[Number(key)];
      if (item && isOwned(item)) {
        verifiedOwnerships.leaves.add(item.id);
        scanCounts.course.leaves += 1;
      }
    }
    for (const slideRow of slides) {
      for (const slide of slideRow) {
        if (isOwned(slide)) {
          verifiedOwnerships.leaves.add(slide.id);
          scanCounts.course.leaves += 1;
        }
      }
    }
  }

  // quizSlice: nodes = Banners, Pennants, Quizzes, Submitions; leaves = slideGroupItems, slideItems
  for (const banner of state.quiz.banners) {
    if (isOwned(banner)) {
      verifiedOwnerships.nodes.add(banner.id);
      scanCounts.quiz.nodes += 1;
    }
    for (const pennant of banner.pennants) {
      if (isOwned(pennant)) {
        verifiedOwnerships.nodes.add(pennant.id);
        scanCounts.quiz.nodes += 1;
      }
    }
  }
  for (const quiz of state.quiz.quizzes) {
    if (isOwned(quiz)) {
      verifiedOwnerships.nodes.add(quiz.id);
      scanCounts.quiz.nodes += 1;
    }
    for (const submition of quiz.pennants) {
      if (isOwned(submition)) {
        verifiedOwnerships.nodes.add(submition.id);
        scanCounts.quiz.nodes += 1;
      }
    }
  }
  for (const group of state.quiz.content) {
    const { slides, ...groupItems } = group;
    for (const key of Object.keys(groupItems)) {
      const item = groupItems[Number(key)];
      if (item && isOwned(item)) {
        verifiedOwnerships.leaves.add(item.id);
        scanCounts.quiz.leaves += 1;
      }
    }
    for (const slideRow of slides) {
      for (const slide of slideRow) {
        if (isOwned(slide)) {
          verifiedOwnerships.leaves.add(slide.id);
          scanCounts.quiz.leaves += 1;
        }
      }
    }
  }

  // commsSlice: nodes/leaves by type; owner from metadata (any entry with owner === true)
  for (const msg of state.comms.incoming) {
    if (!isOwnedComms(msg.metadata)) continue;
    if (INCOMING_NODE_TYPES.includes(msg.type as (typeof INCOMING_NODE_TYPES)[number])) {
      verifiedOwnerships.nodes.add(msg.id);
      scanCounts.comms.nodes += 1;
    } else if (msg.type === FI) {
      verifiedOwnerships.leaves.add(msg.id);
      scanCounts.comms.leaves += 1;
    }
  }
  for (const msg of state.comms.outgoing) {
    if (!isOwnedComms(msg.metadata)) continue;
    if (OUTGOING_NODE_TYPES.includes(msg.type as (typeof OUTGOING_NODE_TYPES)[number])) {
      verifiedOwnerships.nodes.add(msg.id);
      scanCounts.comms.nodes += 1;
    } else if (OUTGOING_LEAF_TYPES.includes(msg.type as (typeof OUTGOING_LEAF_TYPES)[number])) {
      verifiedOwnerships.leaves.add(msg.id);
      scanCounts.comms.leaves += 1;
    }
  }

  const escrowFreights = findSelectedEscrowStashFreights(state);
  if (escrowFreights) {
    for (const { approute, timestamp } of escrowFreights) {
      const childEntity = parseApprouteChildEntity(approute);
      if (!childEntity) continue;
      for (const row of getStashCellRows(state.stash[approute]?.[timestamp])) {
        if (row.deleted || !isOwned(row)) continue;
        const id = Number(row.id);
        if (!Number.isFinite(id)) continue;
        if (childEntity === 'instructions') {
          verifiedOwnerships.leaves.add(id);
          scanCounts.stash.leaves += 1;
        } else {
          verifiedOwnerships.nodes.add(id);
          scanCounts.stash.nodes += 1;
        }
      }
    }
  }

  console.group('[ownership] state scan');
  console.table([
    { area: 'tutorial', ...scanCounts.tutorial },
    { area: 'course', ...scanCounts.course },
    { area: 'quiz', ...scanCounts.quiz },
    { area: 'comms', ...scanCounts.comms },
    { area: 'stash', ...scanCounts.stash },
  ]);
  console.log('totals', {
    ownedNodes: verifiedOwnerships.nodes.size,
    ownedLeaves: verifiedOwnerships.leaves.size,
  });
  console.groupEnd();
};

