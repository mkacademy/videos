import { STATUSES, VISIBILITY, UPDATE_ROWS, connectsAliases, capitalizeFirstLetter, getPlural } from "../../utils";
import { MutationDataAccumulator, PayloadData } from "../../Hooks/useSaveMutations";
import { TutorialTrees, CourseTrees, QuizTrees } from "../../library/controlPanelUtils";
import { MappedCourseTrees, MappedQuizTrees, MappedTutorialTrees, unzippedTrees } from "../slices/settingsSlice";

export type TreeDataTuple = {
    target: string;
    entity: string;
    childIds: number[];
    parentIds: number[];
};

/**
 * Helper function to create a publish payload
 * Returns empty array if childIds is empty, or array with 1-2 payloads depending on status/visibility
 */
const createPublishPayload = (
    base: MutationDataAccumulator,
    target: string,
    entity: string,
    childIds: number[],
    parentIds: number[],
    status?: number,
    visibility?: string
): MutationDataAccumulator[] => {
    if (childIds.length === 0) {
        return []; // Skip empty payloads
    }

    const hasStatus = status !== undefined && (status === 0 || status === 1 || status === 2);
    const hasVisibility = visibility !== undefined && connectsAliases[visibility] !== undefined;

    if (!hasStatus && !hasVisibility) {
        return [];
    }

    // Single payload with one or both resolvers; UPDATE_ROWS holds one entry per resolver
    const updateRows: PayloadData[] = [];
    const resolvers: string[] = [];

    if (hasStatus) {
        resolvers.push(STATUSES);
        const statuses = Array(childIds.length).fill(status);
        updateRows.push({ statuses, childIds, parentIds });
    }
    if (hasVisibility) {
        resolvers.push(VISIBILITY);
        updateRows.push({ visibility: visibility!, childIds, parentIds } as PayloadData);
    }

    const payload: MutationDataAccumulator = {
        ...base,
        target,
        entity,
        resolvers,
        [UPDATE_ROWS]: updateRows as unknown as PayloadData[],
    };

    return [payload];
};

/**
 * Extract tree data from TutorialTrees structure
 * Returns array of tuples (target, entity, childIds, parentIds)
 */
export const extractTutorialTreeData = (tree: TutorialTrees): TreeDataTuple[] => {
    const tuples: TreeDataTuple[] = [];
    const bannerIds: number[] = [];

    // Process banners with content
    Object.entries(tree).forEach(([key, value]) => {
        if (key === '_orphans') return;

        const bannerId = Number(key);
        const contentIds = Array.isArray(value) ? value : [];

        bannerIds.push(bannerId);

        // Extract content -> filters tuple
        if (contentIds.length > 0) {
            tuples.push({
                target: "instructions",
                entity: "filters",
                childIds: contentIds,
                parentIds: [bannerId],
            });
        }
    });

    // Process orphan banners (banners with no content)
    if (tree._orphans && tree._orphans.length > 0) {
        bannerIds.push(...tree._orphans);
    }

    // Extract banners -> foundation tuple
    if (bannerIds.length > 0) {
        tuples.push({
            target: "filters",
            entity: "foundation",
            childIds: bannerIds,
            parentIds: [],
        });
    }

    return tuples;
};

/**
 * Extract tree data from CourseTrees structure
 * Returns array of tuples (target, entity, childIds, parentIds)
 */
export const extractCourseTreeData = (tree: CourseTrees): TreeDataTuple[] => {
    const tuples: TreeDataTuple[] = [];
    const bannerIds: number[] = [];

    // Process banners with children
    Object.entries(tree).forEach(([key, value]) => {
        if (key === '_orphans') return;

        const bannerId = Number(key);
        bannerIds.push(bannerId);

        if (typeof value === 'object' && value !== null) {
            // Process slideGroupItems
            if ('slideGroupItems' in value && Array.isArray(value.slideGroupItems) && value.slideGroupItems.length > 0) {
                tuples.push({
                    target: "instructions",
                    entity: "sifters",
                    childIds: value.slideGroupItems,
                    parentIds: [bannerId],
                });
            }

            // Process pennants
            Object.entries(value).forEach(([pennantKey, pennantValue]) => {
                if (pennantKey === 'slideGroupItems' || pennantKey === '_orphans') return;

                const pennantId = Number(pennantKey);
                const slideIds = Array.isArray(pennantValue) ? pennantValue : [];

                // Extract pennant -> sifters tuple
                tuples.push({
                    target: "filters",
                    entity: "sifters",
                    childIds: [pennantId],
                    parentIds: [bannerId],
                });

                // Extract slides -> filters tuple
                if (slideIds.length > 0) {
                    tuples.push({
                        target: "instructions",
                        entity: "filters",
                        childIds: slideIds,
                        parentIds: [pennantId],
                    });
                }
            });

            // Process orphan pennants (pennants with no slides)
            if ('_orphans' in value && Array.isArray(value._orphans) && value._orphans.length > 0) {
                value._orphans.forEach((pennantId) => {
                    tuples.push({
                        target: "filters",
                        entity: "sifters",
                        childIds: [pennantId],
                        parentIds: [bannerId],
                    });
                });
            }
        }
    });

    // Process orphan banners (banners with no children)
    if (tree._orphans && tree._orphans.length > 0) {
        bannerIds.push(...tree._orphans);
    }

    // Extract banners -> foundation tuple
    if (bannerIds.length > 0) {
        tuples.push({
            target: "sifters",
            entity: "foundation",
            childIds: bannerIds,
            parentIds: [],
        });
    }

    return tuples;
};

/**
 * Extract tree data from QuizTrees structure
 * Returns array of tuples (target, entity, childIds, parentIds)
 */
export const extractQuizTreeData = (tree: QuizTrees): TreeDataTuple[] => {
    const tuples: TreeDataTuple[] = [];
    const quizIds: number[] = [];

    // Process quizzes with children
    Object.entries(tree).forEach(([key, value]) => {
        if (key === '_orphans') return;

        const quizId = Number(key);
        quizIds.push(quizId);

        if (typeof value === 'object' && value !== null) {
            // Process submissions
            if ('submissions' in value && Array.isArray(value.submissions) && value.submissions.length > 0) {
                tuples.push({
                    target: "filters",
                    entity: "dashboards",
                    childIds: value.submissions,
                    parentIds: [quizId],
                });
            }

            // Process banners (CourseTrees structure)
            if ('banners' in value && value.banners) {
                const courseTuples = extractCourseTreeData(value.banners);

                // Update banner tuples to use quizId as parentId for banners -> dashboards
                courseTuples.forEach((tuple) => {
                    if (tuple.entity === "foundation" && tuple.target === "sifters") {
                        // This is the banner -> foundation tuple, change it to banner -> dashboards
                        tuples.push({
                            target: tuple.target,
                            entity: "dashboards",
                            childIds: tuple.childIds,
                            parentIds: [quizId],
                        });
                    } else {
                        // Other tuples (slideGroupItems, pennants, slides) remain the same
                        tuples.push(tuple);
                    }
                });
            }
        }
    });

    // Process orphan quizzes (quizzes with no children)
    if (tree._orphans && tree._orphans.length > 0) {
        quizIds.push(...tree._orphans);
    }

    // Extract quizzes -> foundation tuple
    if (quizIds.length > 0) {
        tuples.push({
            target: "dashboards",
            entity: "foundation",
            childIds: quizIds,
            parentIds: [],
        });
    }

    return tuples;
};

export const getPublishTutorialPayloads = ({ tts, ima, status, visibility }: { tts: MappedTutorialTrees, ima: MutationDataAccumulator, status?: number, visibility?: string }): MutationDataAccumulator[] => {
    // Early return if both status and visibility are undefined or invalid
    const isValidStatus = status !== undefined && (status === 0 || status === 1 || status === 2);
    const isValidVisibility = visibility !== undefined && connectsAliases[visibility] !== undefined;

    if (!isValidStatus && !isValidVisibility)  return []
    
    const payloads: MutationDataAccumulator[] = [];

    // Iterate over all tree values (ignore keys - they're for deduplication)
    Object.values(tts).forEach((tree) => {
        const treeTuples = extractTutorialTreeData(tree);
        treeTuples.forEach((tuple) => {
            const tuplePayloads = createPublishPayload(
                ima,
                tuple.target,
                tuple.entity,
                tuple.childIds,
                tuple.parentIds,
                isValidStatus ? status : undefined,
                isValidVisibility ? visibility : undefined
            );
            payloads.push(...tuplePayloads);
        });
    });

    return payloads;
};

export const getPublishCoursePayloads = ({ cts, ima, status, visibility }: { cts: MappedCourseTrees, ima: MutationDataAccumulator, status?: number, visibility?: string }): MutationDataAccumulator[] => {
    // Early return if both status and visibility are undefined or invalid
    const isValidStatus = status !== undefined && (status === 0 || status === 1 || status === 2);
    const isValidVisibility = visibility !== undefined && connectsAliases[visibility] !== undefined;

    if (!isValidStatus && !isValidVisibility) return []

    const payloads: MutationDataAccumulator[] = [];

    // Iterate over all tree values (ignore keys - they're for deduplication)
    Object.values(cts).forEach((tree) => {
        const treeTuples = extractCourseTreeData(tree);
        treeTuples.forEach((tuple) => {
            const tuplePayloads = createPublishPayload(
                ima,
                tuple.target,
                tuple.entity,
                tuple.childIds,
                tuple.parentIds,
                isValidStatus ? status : undefined,
                isValidVisibility ? visibility : undefined
            );
            payloads.push(...tuplePayloads);
        });
    });

    return payloads;
};

export const getPublishQuizPayloads = ({ qts, ima, status, visibility }: { qts: MappedQuizTrees, ima: MutationDataAccumulator, status?: number, visibility?: string }): MutationDataAccumulator[] => {
    // Early return if both status and visibility are undefined or invalid
    const isValidStatus = status !== undefined && (status === 0 || status === 1 || status === 2);
    const isValidVisibility = visibility !== undefined && connectsAliases[visibility] !== undefined;

    if (!isValidStatus && !isValidVisibility) return []

    const payloads: MutationDataAccumulator[] = [];

    // Iterate over all tree values (ignore keys - they're for deduplication)
    Object.values(qts).forEach((tree) => {
        const treeTuples = extractQuizTreeData(tree);
        treeTuples.forEach((tuple) => {
            const tuplePayloads = createPublishPayload(
                ima,
                tuple.target,
                tuple.entity,
                tuple.childIds,
                tuple.parentIds,
                isValidStatus ? status : undefined,
                isValidVisibility ? visibility : undefined
            );
            payloads.push(...tuplePayloads);
        });
    });

    return payloads;
};

export const getPublishApprovalErrorMessage = (
    category: 'tutorial' | 'course' | 'quiz',
    unzippedTree: unzippedTrees | undefined,
    treeCount: number,
    status: number | undefined,
    isValidPermission: boolean,
    hasCommsSelection: boolean,
): string => {
    const plural = capitalizeFirstLetter(getPlural(category));

    if (!unzippedTree) {
        return `Cannot publish ${plural}: no unzipped content loaded. Import or unzip content in Settings first.`;
    }
    if (treeCount === 0) {
        if (hasCommsSelection) {
            return `Cannot publish ${plural}: highlighted messages do not match any ${category} trees in the loaded content.`;
        }
        return `Cannot publish ${plural}: the loaded content contains no ${category} trees.`;
    }
    if (status === undefined && !isValidPermission) {
        return `Cannot publish ${plural}: choose a status (pending, approved, or rejected) or who can connect before publishing.`;
    }
    return `Cannot publish ${plural}.`;
};

// ---- current --> in harvestManagerUtils.ts
//return {
//    ...base,
//    target,
//    entity,
//    resolvers: [resolver],
//    [resolver]: {
//        childIds,
//        parentIds,
//    },
//};

//---- if visibility efined --> in treeManagerUtils.ts
//return {
//    ...base,
//    target,
//    entity,
//    resolvers: [VISIBILITY],
//    [UPDATE_ROWS]:[     <-- this is always an UPDATE_ROWS resolver
//     {
//        visibility, <-- this is a string value. Only valid values are keys in the connectsAliases object
//        childIds,
//        parentIds,
//    }
// ] 
//};


//---- if status is defined --> in treeManagerUtils.ts
//return {
//    ...base,
//    target,
//    entity,
//    resolvers: [STATUSES],
//    [UPDATE_ROWS]:[  <-- this is always an UPDATE_ROWS resolver
// {    
//        statuses, <-- this is a number value. Only valid values are 0,1 and 2
//        childIds,
//        parentIds,
//    },
//]
//};

//---- if status and visibility are defined --> in treeManagerUtils.ts
//create both sets of payloads and return a single array with both sets of payloads


//we can reduce the number of payloads in the following way:
//return {
//    ...base,
//    target,
//    entity,
//    resolvers: [STATUSES, VISIBILITY],
//    [UPDATE_ROWS]:[  <-- this is always an UPDATE_ROWS resolver
//   {    
//        statuses, 
//        childIds,
//        parentIds,
//    },
//     {
//        visibility, 
//        childIds,
//        parentIds,
//    }
//]
//};

