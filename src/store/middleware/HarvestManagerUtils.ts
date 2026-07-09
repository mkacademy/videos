import { MappedCourseTrees, MappedQuizTrees, MappedTutorialTrees, unzippedTrees } from "../slices/settingsSlice";
import { filterTypes, sifterTypes, dashboardTypes, FF, FS, FD } from "../../library/commsUtils";
import { ADD_ROWS, REMOVE_ROWS, getPlural, capitalizeFirstLetter } from "../../utils";
import { IncomingMessage, OutgoingMessage } from "../slices/commsSlice";
import { MutationDataAccumulator } from "../../Hooks/useSaveMutations";
import {
    extractTutorialTreeData,
    extractCourseTreeData,
    extractQuizTreeData,
} from "./publishManagerUtils";

// ima is The object You're going to mutate 
// You're going to update the parentIds, childIds, entity, and target in the ima object respectively
// each value of tts, cts, and qts is an Tree Object made of Ids that represent the tutorialSlice, courseSlice and quizSlice structures

/**
 * Helper function to create a mutation payload
 * Returns null if childIds is empty (should be skipped)
 */
const createPayload = (
    base: MutationDataAccumulator,
    target: string,
    entity: string,
    childIds: number[],
    parentIds: number[],
    resolver: string
): MutationDataAccumulator | null => {
    if (childIds.length === 0) {
        return null; // Skip empty payloads
    }

    return {
        ...base,
        target,
        entity,
        resolvers: [resolver],
        [resolver]: {
            childIds,
            parentIds,
        },
    };
};

export const getInsertTutorialPayloads = ({ tts, ima }: { tts: MappedTutorialTrees, ima: MutationDataAccumulator }): MutationDataAccumulator[] => {
    const payloads: MutationDataAccumulator[] = [];
    Object.values(tts).forEach((tree) => {
        const treeTuples = extractTutorialTreeData(tree);
        treeTuples.forEach(({ target, entity, childIds, parentIds }) => {
            const payload = createPayload(ima, target, entity, childIds, parentIds, ADD_ROWS);
            if (payload) payloads.push(payload);
        });
    });
    return payloads;
};

export const getRemoveTutorialPayloads = ({ tts, rma }: { tts: MappedTutorialTrees, rma: MutationDataAccumulator }): MutationDataAccumulator[] => {
    const payloads: MutationDataAccumulator[] = [];
    Object.values(tts).forEach((tree) => {
        const treeTuples = extractTutorialTreeData(tree);
        treeTuples.forEach(({ target, entity, childIds, parentIds }) => {
            const payload = createPayload(rma, target, entity, childIds, parentIds, REMOVE_ROWS);
            if (payload) payloads.push(payload);
        });
    });
    return payloads;
};

export const getInsertCoursePayloads = ({ cts, ima }: { cts: MappedCourseTrees, ima: MutationDataAccumulator }): MutationDataAccumulator[] => {
    const payloads: MutationDataAccumulator[] = [];
    Object.values(cts).forEach((tree) => {
        const treeTuples = extractCourseTreeData(tree);
        treeTuples.forEach(({ target, entity, childIds, parentIds }) => {
            const payload = createPayload(ima, target, entity, childIds, parentIds, ADD_ROWS);
            if (payload) payloads.push(payload);
        });
    });
    return payloads;
};

export const getRemoveCoursePayloads = ({ cts, rma }: { cts: MappedCourseTrees, rma: MutationDataAccumulator }): MutationDataAccumulator[] => {
    const payloads: MutationDataAccumulator[] = [];
    Object.values(cts).forEach((tree) => {
        const treeTuples = extractCourseTreeData(tree);
        treeTuples.forEach(({ target, entity, childIds, parentIds }) => {
            const payload = createPayload(rma, target, entity, childIds, parentIds, REMOVE_ROWS);
            if (payload) payloads.push(payload);
        });
    });
    return payloads;
};

export const getInsertQuizPayloads = ({ qts, ima }: { qts: MappedQuizTrees, ima: MutationDataAccumulator }): MutationDataAccumulator[] => {
    const payloads: MutationDataAccumulator[] = [];
    Object.values(qts).forEach((tree) => {
        const treeTuples = extractQuizTreeData(tree);
        treeTuples.forEach(({ target, entity, childIds, parentIds }) => {
            const payload = createPayload(ima, target, entity, childIds, parentIds, ADD_ROWS);
            if (payload) payloads.push(payload);
        });
    });
    return payloads;
};

export const getRemoveQuizPayloads = ({ qts, rma }: { qts: MappedQuizTrees, rma: MutationDataAccumulator }): MutationDataAccumulator[] => {
    const payloads: MutationDataAccumulator[] = [];
    Object.values(qts).forEach((tree) => {
        const treeTuples = extractQuizTreeData(tree);
        treeTuples.forEach(({ target, entity, childIds, parentIds }) => {
            const payload = createPayload(rma, target, entity, childIds, parentIds, REMOVE_ROWS);
            if (payload) payloads.push(payload);
        });
    });
    return payloads;
};

export const getProccedEntity = (cpannelMessage: string) => {
    const match = cpannelMessage.match(/ (Quizzes|Courses|Tutorials)/);
    const entity = match ? match[1] : "unknown";
    return entity;
};

export const countDownMsg = (harvestType: string, entity: string) =>
    `${harvestType} ${capitalizeFirstLetter(getPlural(entity))}... please wait`;

export type TreeCategory = 'tutorial' | 'course' | 'quiz';

export const getHighlightedTreeIds = (
    outgoing: OutgoingMessage[],
    incoming: IncomingMessage[],
    category: TreeCategory
): number[] => {
    const selectedOutgoing = outgoing.filter(msg => msg.isHighlighted);
    const selectedIncoming = incoming.filter(msg => msg.isHighlighted);

    if (category === 'tutorial') {
        const tutorialOutgoingIds = selectedOutgoing
            .filter(msg => filterTypes.includes(msg.type))
            .map(msg => msg.id);
        const tutorialIncomingIds = selectedIncoming
            .filter(msg => msg.type === FF)
            .map(msg => msg.id);
        return [...tutorialOutgoingIds, ...tutorialIncomingIds];
    }
    if (category === 'course') {
        const courseOutgoingIds = selectedOutgoing
            .filter(msg => sifterTypes.includes(msg.type))
            .map(msg => msg.id);
        const courseIncomingIds = selectedIncoming
            .filter(msg => msg.type === FS)
            .map(msg => msg.id);
        return [...courseOutgoingIds, ...courseIncomingIds];
    }
    const quizOutgoingIds = selectedOutgoing
        .filter(msg => dashboardTypes.includes(msg.type))
        .map(msg => msg.id);
    const quizIncomingIds = selectedIncoming
        .filter(msg => msg.type === FD)
        .map(msg => msg.id);
    return [...quizOutgoingIds, ...quizIncomingIds];
};

export const getFilteredUnzippedTree = (
    outgoing: OutgoingMessage[],
    incoming: IncomingMessage[],
    unzippedTreesArray: unzippedTrees[],
    poppedValue: unzippedTrees | undefined,
    category: TreeCategory
): unzippedTrees | undefined => {
    const selectedIds = getHighlightedTreeIds(outgoing, incoming, category);

    // If list is empty, fall back to popped value
    if (selectedIds.length === 0) {
        return poppedValue;
    }

    // Filter unzippedTreesArray to only include items where TreesId matches selected IDs
    const filteredTrees: unzippedTrees[] = unzippedTreesArray.filter(tree => {
        if (category === 'tutorial') {
            return Object.keys(tree.tutorialTrees).some(treesId => selectedIds.includes(Number(treesId)));
        } else if (category === 'course') {
            return Object.keys(tree.courseTrees).some(treesId => selectedIds.includes(Number(treesId)));
        } else if (category === 'quiz') {
            return Object.keys(tree.quizTrees).some(treesId => selectedIds.includes(Number(treesId)));
        }
        return false;
    });

    // Combine all matching items into a single object
    const combinedTree: unzippedTrees = {
        tutorialTrees: {} as MappedTutorialTrees,
        courseTrees: {} as MappedCourseTrees,
        quizTrees: {} as MappedQuizTrees
    };

    filteredTrees.forEach(tree => {
        if (category === 'tutorial') {
            Object.keys(tree.tutorialTrees).forEach(treesId => {
                const id = Number(treesId);
                if (selectedIds.includes(id)) {
                    combinedTree.tutorialTrees[id] = tree.tutorialTrees[id];
                }
            });
        } else if (category === 'course') {
            Object.keys(tree.courseTrees).forEach(treesId => {
                const id = Number(treesId);
                if (selectedIds.includes(id)) {
                    combinedTree.courseTrees[id] = tree.courseTrees[id];
                }
            });
        } else if (category === 'quiz') {
            Object.keys(tree.quizTrees).forEach(treesId => {
                const id = Number(treesId);
                if (selectedIds.includes(id)) {
                    combinedTree.quizTrees[id] = tree.quizTrees[id];
                }
            });
        }
    });

    return combinedTree;
};
