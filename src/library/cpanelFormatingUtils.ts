import { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { Traversal } from '../store/slices/traversalSlice';
import { setTutorials, TutorialState, Banner as TutorialBanner, Content as TutorialContent } from '../store/slices/tutorialSlice';
import { escrowConvolution } from './actions';
import { setQueue as setControlPanelQueue } from '../store/middleware/controlPanelXYZ';
import { Banner as CourseBanner, CourseState, setCourses, SlideGroup } from '../store/slices/courseSlice';
import { getCurAppIndex, getCurAppName, getPlural, getSingular, orderEntitiesRootToLeafForWebapp, Tree } from '../utils';
import { Quiz, QuizState, setQuizzes } from '../store/slices/quizSlice';
import { QueueItem } from '../store/middleware/controlPanelXYZ';
import { ExtractContentParams } from './contentExtractorUtils';

type ExtractContentDestination = ExtractContentParams['destination'];

const isExtractContentDestination = (name: string): name is ExtractContentDestination =>
  name === 'course' ||
  name === 'quiz' ||
  name === 'tutorial' ||
  name === 'tutors' ||
  name === 'incoming' ||
  name === 'outgoing';
import { DataRow } from '../components/Core/types';
import { ItemWithCourseTrees, ItemWithQuizTrees, ItemWithTutorialTrees } from '../store/middleware/EncodingManagerGHI';
type SetQueueFunction = typeof setControlPanelQueue;
type DispatchFunction = Dispatch<UnknownAction>;

export const defaultTraversal: Traversal = {
    to: '',
    from: '',
    urlID: '',
    toIMG: '',
    fromIMG: '',
    contentIds: [],
    encodedData: '',
    parentData: { parent: '', curApp: 0, IDs: [] },
};

/**
 * Handles formatter switch for setTutorials in controlPanelXYZ middleware
 */
export const handleTutorialFormatters = (
    dispatch: DispatchFunction,
    setQueue: SetQueueFunction,
    flushedBanners: TutorialBanner[] | undefined,
    flushedContent: TutorialContent[][] | undefined
): void => {
    const [curApp] = getCurAppIndex('tutorial');
    const curAppNumber = parseInt(curApp!);
    const payload0: Partial<Traversal> = {
        to: 'filters',
        from: 'foundation',
        urlID: 'foundationfilters',
        contentIds: flushedBanners?.map(({ id }) => id) || []
    };
    const payload1: Traversal = { ...defaultTraversal, ...payload0 };
    const escrowPayload1 = { ...payload1, curApp: curAppNumber };
    const timeoutItem1 = setTimeout(() => dispatch(escrowConvolution(escrowPayload1)), 100);
    setQueue({ item: timeoutItem1, curApp: curAppNumber });
    const payload2: Partial<Traversal> = {
        from: 'filters',
        to: 'instructions',
        urlID: 'filtersinstructions',
        contentIds: flushedContent?.flat().map(({ id }) => id) || []
    };
    const payload3: Traversal = { ...defaultTraversal, ...payload2 };
    const escrowPayload3 = { ...payload3, curApp: curAppNumber };
    const timeoutItem3 = setTimeout(() => dispatch(escrowConvolution(escrowPayload3)), 110);
    setQueue({ item: timeoutItem3, curApp: curAppNumber });
};

export const handleCourseFormatters = (
    dispatch: DispatchFunction,
    setQueue: SetQueueFunction,
    flushedBanners: CourseBanner[] | undefined,
    flushedContent: SlideGroup[] | undefined
): void => {
    const [curApp] = getCurAppIndex('course');
    const curAppNumber = parseInt(curApp!);
    const payload0: Partial<Traversal> = {
        to: 'sifters',
        from: 'foundation',
        urlID: 'foundationsifters',
        contentIds: flushedBanners?.map(({ id }) => id) || []
    };
    const payload1: Traversal = { ...defaultTraversal, ...payload0 };
    const escrowPayload1 = { ...payload1, curApp: curAppNumber };
    const timeoutItem1 = setTimeout(() => dispatch(escrowConvolution(escrowPayload1)), 120);
    setQueue({ item: timeoutItem1, curApp: curAppNumber });
    const payload2: Partial<Traversal> = {
        to: 'filters',
        from: 'sifters',
        urlID: 'siftersfilters',
        contentIds: flushedBanners?.map(({ pennants }) => pennants.map(({ id }) => id)).flat() || []
    };
    const payload3: Traversal = { ...defaultTraversal, ...payload2 };
    const escrowPayload3 = { ...payload3, curApp: curAppNumber };
    const timeoutItem3 = setTimeout(() => dispatch(escrowConvolution(escrowPayload3)), 130);
    setQueue({ item: timeoutItem3, curApp: curAppNumber });

    const payload4: Partial<Traversal> = {
        from: 'sifters',
        to: 'instructions',
        urlID: 'siftersinstructions',
        contentIds: flushedContent?.map(({ slides, ...objSlides }) => Object.values(objSlides).map(({ id }) => id)).flat() || []
    };
    const payload5: Traversal = { ...defaultTraversal, ...payload4 };
    const escrowPayload5 = { ...payload5, curApp: curAppNumber };
    const timeoutItem5 = setTimeout(() => dispatch(escrowConvolution(escrowPayload5)), 140);
    setQueue({ item: timeoutItem5, curApp: curAppNumber });
    const payload6: Partial<Traversal> = {
        from: 'filters',
        to: 'instructions',
        urlID: 'filtersinstructions',
        contentIds: flushedContent?.map(({ slides }) => slides.flat().map(({ id }) => id)).flat() || []
    };
    const payload7: Traversal = { ...defaultTraversal, ...payload6 };
    const escrowPayload7 = { ...payload7, curApp: curAppNumber };
    const timeoutItem7 = setTimeout(() => dispatch(escrowConvolution(escrowPayload7)), 150);
    setQueue({ item: timeoutItem7, curApp: curAppNumber });
};

export const handleQuizFormatters = (
    dispatch: DispatchFunction,
    setQueue: SetQueueFunction,
    flushedQuizzes: Quiz[] | undefined,
    flushedContent: SlideGroup[] | undefined,
    flushedBanners: CourseBanner[] | undefined
): void => {
    const [curApp] = getCurAppIndex('quiz');
    const curAppNumber = parseInt(curApp!);
    const payload0: Partial<Traversal> = {
        to: 'dashboards',
        from: 'foundation',
        urlID: 'foundationdashboards',
        contentIds: flushedQuizzes?.map(({ id }) => id) || []
    };
    const payload1: Traversal = { ...defaultTraversal, ...payload0 };
    const escrowPayload0 = { ...payload1, curApp: curAppNumber };
    const timeoutItem0 = setTimeout(() => dispatch(escrowConvolution(escrowPayload0)), 160);
    setQueue({ item: timeoutItem0, curApp: curAppNumber });
    const payload2: Partial<Traversal> = {
        to: 'sifters',
        from: 'dashboards',
        urlID: 'dashboardssifters',
        contentIds: flushedBanners?.map(({ id }) => id) || []
    };
    const payload3: Traversal = { ...defaultTraversal, ...payload2 };
    const escrowPayload3 = { ...payload3, curApp: curAppNumber };
    const timeoutItem3 = setTimeout(() => dispatch(escrowConvolution(escrowPayload3)), 170);
    setQueue({ item: timeoutItem3, curApp: curAppNumber });
    const payload4: Partial<Traversal> = {
        to: 'filters',
        from: 'dashboards',
        urlID: 'dashboardsfilters',
        contentIds: flushedQuizzes?.map(({ pennants }) => pennants.map(({ id }) => id)).flat() || []
    };
    const payload5: Traversal = { ...defaultTraversal, ...payload4 };
    const escrowPayload5 = { ...payload5, curApp: curAppNumber };
    const timeoutItem5 = setTimeout(() => dispatch(escrowConvolution(escrowPayload5)), 180);
    setQueue({ item: timeoutItem5, curApp: curAppNumber });
    const payload6: Partial<Traversal> = {
        from: 'sifters',
        to: 'instructions',
        urlID: 'siftersinstructions',
        contentIds: flushedContent?.map(({ slides, ...objSlides }) => Object.values(objSlides).map(({ id }) => id)).flat() || []
    };
    const payload7: Traversal = { ...defaultTraversal, ...payload6 };
    const escrowPayload7 = { ...payload7, curApp: curAppNumber };
    const timeoutItem7 = setTimeout(() => dispatch(escrowConvolution(escrowPayload7)), 190);
    setQueue({ item: timeoutItem7, curApp: curAppNumber });

    const payload8: Partial<Traversal> = {
        to: 'filters',
        from: 'sifters',
        urlID: 'siftersfilters',
        contentIds: flushedBanners?.map(({ pennants }) => pennants.map(({ id }) => id)).flat() || []
    };
    const payload9: Traversal = { ...defaultTraversal, ...payload8 };
    const escrowPayload9 = { ...payload9, curApp: curAppNumber };
    const timeoutItem9 = setTimeout(() => dispatch(escrowConvolution(escrowPayload9)), 200);
    setQueue({ item: timeoutItem9, curApp: curAppNumber });

    const payload10: Partial<Traversal> = {
        from: 'filters',
        to: 'instructions',
        urlID: 'filtersinstructions',
        contentIds: flushedContent?.map(({ slides }) => slides.flat().map(({ id }) => id)).flat() || []
    };
    const payload11: Traversal = { ...defaultTraversal, ...payload10 };
    const escrowPayload11 = { ...payload11, curApp: curAppNumber };
    const timeoutItem11 = setTimeout(() => dispatch(escrowConvolution(escrowPayload11)), 210);
    setQueue({ item: timeoutItem11, curApp: curAppNumber });
};
/**
 * Handles formatter switch for unzipped tutorials in EncodingManagerGHI middleware
 */
export const handleUnzippedTutorialFormatters = (
    formatters: string,
    dispatch: DispatchFunction,
    setQueue: SetQueueFunction,
    p: (Partial<TutorialState> & ItemWithTutorialTrees)[]
): void => {
    switch (formatters) {
        case "app": {
            p.forEach((t: Partial<TutorialState> & ItemWithTutorialTrees) => {
                const { banners = [], content = [], Trees = {}, TreesId = 0 } = t;
                setTimeout(() => dispatch(setTutorials({ banners, content, Trees, TreesId })));
            });
            break;
        }
        case "cpanel": {
            p.forEach((t: Partial<TutorialState> & ItemWithTutorialTrees) => {
                const { banners = [], content = [] } = t;
                setTimeout(() => dispatch(setTutorials({ banners: [], content: []})));
                handleTutorialFormatters(dispatch, setQueue, banners, content);
            });
            break;
        }
        case "cpanelapp": {
            p.forEach((t: Partial<TutorialState> & ItemWithTutorialTrees) => {
                const { banners = [], content = [], Trees = {}, TreesId = 0 } = t;
                setTimeout(() => dispatch(setTutorials({ banners, content, Trees, TreesId })));
                handleTutorialFormatters(dispatch, setQueue, banners, content);
            });
            break;
        }
        default: {
            break;
        }
    }
};

export const handleUnzippedQuizFormatters = (
    formatters: string,
    dispatch: DispatchFunction,
    setQueue: SetQueueFunction,
    p: (Partial<QuizState> & ItemWithQuizTrees)[]
): void => {
    switch (formatters) {
        case "app": {
            p.forEach((q: Partial<QuizState> & ItemWithQuizTrees) => {
                const { quizzes = [], banners = [], content = [], Trees = {}, TreesId = 0 } = q;
                setTimeout(() => dispatch(setQuizzes({ quizzes, banners, content, Trees, TreesId })));
            });
            break;
        }
        case "cpanel": {
            p.forEach((q: Partial<QuizState> & ItemWithQuizTrees) => {
                const { quizzes = [], banners = [], content = []} = q;
                setTimeout(() => dispatch(setQuizzes({ quizzes: [], banners: [], content: [] })));
                handleQuizFormatters(dispatch, setQueue, quizzes, content, banners);
            });
            break;
        }
        case "cpanelapp": {
            p.forEach((q: Partial<QuizState> & ItemWithQuizTrees) => {
                const { quizzes = [], banners = [], content = [], Trees = {}, TreesId = 0 } = q;
                setTimeout(() => dispatch(setQuizzes({ quizzes, banners, content, Trees, TreesId })));
                handleQuizFormatters(dispatch, setQueue, quizzes, content, banners);
            });
            break;
        }
        default: {
            break;
        }
    }
}


export const handleUnzippedCourseFormatters = (
    formatters: string,
    dispatch: DispatchFunction,
    setQueue: SetQueueFunction,
    p: (Partial<CourseState> & ItemWithCourseTrees)[]
): void => {
    switch (formatters) {
        case "app": {
            p.forEach((c: Partial<CourseState> & ItemWithCourseTrees) => {
                const { content = [], banners = [], Trees = {}, TreesId = 0 } = c;
                setTimeout(() => dispatch(setCourses({ content, banners, Trees, TreesId })));
            });
            break;
        }
        case "cpanel": {
            p.forEach((c: Partial<CourseState> & ItemWithCourseTrees) => {
                const { content = [], banners = [] } = c;
                setTimeout(() => dispatch(setCourses({ content: [], banners: [] })));
                handleCourseFormatters(dispatch, setQueue, banners, content);
            });
            break;
        }
        case "cpanelapp": {
            p.forEach((c: Partial<CourseState> & ItemWithCourseTrees) => {
                const { content = [], banners = [], Trees = {}, TreesId = 0 } = c;
                setTimeout(() => dispatch(setCourses({ content, banners, Trees, TreesId })));
                handleCourseFormatters(dispatch, setQueue, banners, content);
            });
            break;
        }
        default: {
            break;
        }
    }
}

const predicate = (metadataIds: string[], _entityName: string) => (dataRow: DataRow) => {
    return dataRow.metadata?.[metadataIds.find((idname: string) => idname.startsWith(_entityName)) as keyof typeof dataRow.metadata];
};
export const getExtractContentPayloads = (queueItems: QueueItem[]): ExtractContentParams[] => {
    const extractContentPayloads: ExtractContentParams[] = [];
    // Step 1 & 2: Convert curApp to string and group by curAppName
    const groupedByCurApp: Record<string, DataRow[][]> = {};
    for (const queueItem of queueItems) {
        const curAppName = getCurAppName(queueItem.curApp);
        if (!groupedByCurApp[curAppName]) groupedByCurApp[curAppName] = [];
        groupedByCurApp[curAppName].push(queueItem.item as DataRow[]);
    }
    // Step 3 & 4: For each group, find matching entities in Tree
    for (const [curAppName, groupItems] of Object.entries(groupedByCurApp)) {
        // Find entities that have webapps for this curApp
        const matchingEntities = orderEntitiesRootToLeafForWebapp(Tree.entities, curAppName).filter(
            (entity) => entity.webapps[curAppName] && entity.webapps[curAppName].length > 0
        );
        // Step 5: For each found entity, create a map structure
        const approutes: Record<string, DataRow[]> = {};
        for (const foundEntity of matchingEntities) {
            const metadataId = getSingular(foundEntity.name) + 'Id';
            const metadataIds = foundEntity.webapps[curAppName].map(
                (name: string) => getSingular(name) + 'Id'
            );
            // Step 6: Create approutes (subGroupType array)
            // For each entity name in foundEntity.webapps[curApp]
            for (const _entityName of foundEntity.webapps[curAppName]) {
                const singleMetadataId = getSingular(_entityName);
                // Find the first DataRow[] that matches the condition
                const matchingArray = groupItems.find((dataRowArray) => {
                    // Only check the first item in the array
                    const firstRow = dataRowArray[0];
                    if (!firstRow?.metadata) return false;

                    // Check if metadata[metadataId] exists
                    if (!firstRow.metadata[metadataId as keyof typeof firstRow.metadata]) return false;

                    // Check if any metadataId from metadataIds exists in metadata
                    const matchingMetadataId = predicate(metadataIds, singleMetadataId)(firstRow);
                    return !!matchingMetadataId;
                });
                if (matchingArray) {
                    // Find which metadataId caused the match
                    const firstRow = matchingArray[0];
                    if (!firstRow?.metadata) continue;

                    const matchingMetadataId = metadataIds.find((idname: string) => idname.startsWith(singleMetadataId));

                    if (matchingMetadataId) {
                        // Generate the key: (metadataId + matchingMetadataId).replace('Id', '')
                        const from = metadataId.replace('Id', '');
                        const to = matchingMetadataId.replace('Id', '');
                        const key = (getPlural(from) + getPlural(to));
                        approutes[key] = matchingArray;
                    }
                }
            }
        }          
        // Step 7: Create ExtractContentParams for each subGroup
        for (const [fromto, fetchedData] of Object.entries(approutes)) {
            if (!isExtractContentDestination(curAppName)) continue;
            const base = {
                fromto,
                fetchedData,
                selecttype: false,
                formatters: 'cpanel',
                showSuc: false,
            } as const;
            switch (curAppName) {
                case 'quiz':
                    extractContentPayloads.push({
                        destination: 'quiz',
                        ...base,
                        quizzes: [],
                        quizBanners: [],
                        quizContent: [],
                    });
                    break;
                case 'tutorial':
                    extractContentPayloads.push({
                        destination: 'tutorial',
                        ...base,
                        tutorialBanners: [],
                    });
                    break;
                case 'course':
                    extractContentPayloads.push({
                        destination: 'course',
                        ...base,
                        courseBanners: [],
                        courseContent: [],
                    });
                    break;
                case 'tutors':
                    extractContentPayloads.push({ destination: 'tutors', ...base });
                    break;
                case 'incoming':
                    extractContentPayloads.push({
                        destination: 'incoming',
                        ...base,
                        mailer: -1,
                    });
                    break;
                case 'outgoing':
                    extractContentPayloads.push({ destination: 'outgoing', ...base });
                    break;
            }
        }
    }

    return extractContentPayloads;
}