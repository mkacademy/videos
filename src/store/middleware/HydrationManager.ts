import { RootState } from "../types";
import { Middleware } from "@reduxjs/toolkit";
import { hydrateData, UnzipAndHydrate } from "../../library/actions";
import {
    addUnzippedTrees,
    completedUnzipping,
    MappedCourseTrees,
    MappedQuizTrees,
    MappedTutorialTrees,
    registerUnzippedContentTrees,
} from "../slices/settingsSlice";
import { setTutorials } from "../slices/tutorialSlice";
import { setQuizzes } from "../slices/quizSlice";
import { parseZipTrees } from "../../library/EncodingManagerUtils";
import { setCourses } from "../slices/courseSlice";
import { mutateCurApp, type SessionItem, type SessionItemKind } from "../slices/sessionSlice";
import { abortIfHydrationDisabled } from "../../library/hydrationUtils";
import { CourseTrees, QuizTrees, TutorialTrees } from "../../library/controlPanelUtils";
import {
    flushCourseTrees,
    flushQuizTrees,
    flushTutorialTrees,
} from "../../library/controlPanelUtilz";
import type { Banner as CourseBanner, SlideGroup } from "../../library/CourseUtils";
import type { Banner as TutorialBanner, Content as TutorialContent } from "../slices/tutorialSlice";
import type { Quiz } from "../../library/QuizUtils";
import {
    getDeepLinkTreeIds,
    resolveEditorDeepLinkSearch,
    type DeepLinkTreeIds,
} from "../../loadingRouteUtils";

const UNZIP_COMPLETE_POLL_MS = 2000;
export interface ItemWithTutorialTrees {
    Trees: TutorialTrees;
    TreesId: number;
}
export interface ItemWithCourseTrees {
    Trees: CourseTrees;
    TreesId: number;
}
export interface ItemWithQuizTrees {
    Trees: QuizTrees;
    TreesId: number;
}

const isZipQuote = (quote: string | undefined): quote is string =>
    typeof quote === 'string' && quote.trim() !== '' && quote.trim() !== '.';

const hasTrees = (trees: object): boolean => Object.keys(trees).length > 0;

const collectKindTrees = <T extends CourseTrees | TutorialTrees | QuizTrees>(
    sessionItems: SessionItem[],
    kind: SessionItemKind,
    enabled: boolean,
    targetTreeId: number | undefined,
    restrictToUrlIds: boolean,
    alreadyUnzipped: Set<number>,
): Array<{ TreesId: number; Trees: T }> => {
    if (!enabled) return [];
    if (restrictToUrlIds && targetTreeId === undefined) return [];
    const collected: Array<{ TreesId: number; Trees: T }> = [];
    for (const item of sessionItems) {
        if (item.kind !== kind || alreadyUnzipped.has(item.id) || !isZipQuote(item.quote)) continue;
        if (targetTreeId !== undefined && item.id !== targetTreeId) continue;
        const Trees = parseZipTrees<T>(item.quote);
        if (!hasTrees(Trees)) continue;
        collected.push({ TreesId: item.id, Trees });
    }
    return collected;
};
const scheduleCompletedUnzippingWhenIdle = (
    dispatch:  (action: ReturnType<typeof completedUnzipping>) => void,
) => {
    const attempt = () => dispatch(completedUnzipping(true));
    setTimeout(attempt, UNZIP_COMPLETE_POLL_MS);
};

const dispatchHydrateDataIfEnabled = (
    dispatch: (action: ReturnType<typeof hydrateData>) => void,
    getState: () => RootState,
    count = 0,
): void => {
    if (abortIfHydrationDisabled(getState)) return;
    dispatch(hydrateData(count));
};

const HydrationManager: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
    if (UnzipAndHydrate.match(action)) {
        const state = getState();
        const {
            settings: {
                isUnzipCourses,
                isUnzipTutorials,
                isUnzipQuizzes,
                TutorialTrees,
                CourseTrees,
                QuizTrees,
            },
            session: { sessionItems },
        } = state;

        const treeIds: DeepLinkTreeIds = typeof window !== 'undefined'
            ? getDeepLinkTreeIds(resolveEditorDeepLinkSearch(window.location.search))
            : {};
        const restrictToUrlIds = Object.keys(treeIds).length > 0;

        const tutorialTrees: ItemWithTutorialTrees[] = collectKindTrees<TutorialTrees>(
            sessionItems,
            'tutorial',
            isUnzipTutorials,
            treeIds.tutorial,
            restrictToUrlIds,
            new Set(Object.keys(TutorialTrees).map(Number)),
        );
        const courseTrees: ItemWithCourseTrees[] = collectKindTrees<CourseTrees>(
            sessionItems,
            'course',
            isUnzipCourses,
            treeIds.course,
            restrictToUrlIds,
            new Set(Object.keys(CourseTrees).map(Number)),
        );
        const quizTrees: ItemWithQuizTrees[] = collectKindTrees<QuizTrees>(
            sessionItems,
            'quiz',
            isUnzipQuizzes,
            treeIds.quiz,
            restrictToUrlIds,
            new Set(Object.keys(QuizTrees).map(Number)),
        );

        if (courseTrees.length > 0) {
            const banners: CourseBanner[] = [];
            const content: SlideGroup[] = [];
            const courseTreesMap: MappedCourseTrees = {};
            for (const { Trees = {}, TreesId = 0 } of courseTrees) {
                courseTreesMap[TreesId] = Trees;
                const flushed = flushCourseTrees(Trees);
                if (flushed.banners?.length) banners.push(...flushed.banners);
                if (flushed.content?.length) content.push(...flushed.content);
            }
            dispatch(setCourses({ banners, content }));
            dispatch(registerUnzippedContentTrees({ courseTrees: courseTreesMap }));
        }

        if (tutorialTrees.length > 0) {
            const banners: TutorialBanner[] = [];
            const content: TutorialContent[][] = [];
            const tutorialTreesMap: MappedTutorialTrees = {};
            for (const { Trees = {}, TreesId = 0 } of tutorialTrees) {
                tutorialTreesMap[TreesId] = Trees;
                const flushed = flushTutorialTrees(Trees);
                if (flushed.banners?.length) banners.push(...flushed.banners);
                if (flushed.content?.length) content.push(...flushed.content);
            }
            dispatch(setTutorials({ banners, content }));
            dispatch(registerUnzippedContentTrees({ tutorialTrees: tutorialTreesMap }));
        }

        if (quizTrees.length > 0) {
            const quizzes: Quiz[] = [];
            const banners: CourseBanner[] = [];
            const content: SlideGroup[] = [];
            const quizTreesMap: MappedQuizTrees = {};
            for (const { Trees = {}, TreesId = 0 } of quizTrees) {
                quizTreesMap[TreesId] = Trees;
                const flushed = flushQuizTrees(Trees);
                if (flushed.quizzes?.length) quizzes.push(...flushed.quizzes);
                if (flushed.banners?.length) banners.push(...flushed.banners);
                if (flushed.content?.length) content.push(...flushed.content);
            }
            dispatch(setQuizzes({ quizzes, banners, content }));
            dispatch(registerUnzippedContentTrees({ quizTrees: quizTreesMap }));
        }

        const hasTrees = courseTrees.length > 0 || tutorialTrees.length > 0 || quizTrees.length > 0;
        scheduleCompletedUnzippingWhenIdle(dispatch);
        if (hasTrees) {
            dispatch(addUnzippedTrees({
                tutorialTrees: tutorialTrees.reduce((acc: MappedTutorialTrees, t: ItemWithTutorialTrees) => {
                    acc[t.TreesId] = t.Trees;
                    return acc;
                }, {}),
                courseTrees: courseTrees.reduce((acc: MappedCourseTrees, c: ItemWithCourseTrees) => {
                    acc[c.TreesId] = c.Trees;
                    return acc;
                }, {}),
                quizTrees: quizTrees.reduce((acc: MappedQuizTrees, q: ItemWithQuizTrees) => {
                    acc[q.TreesId] = q.Trees;
                    return acc;
                }, {}),
            }));
            dispatchHydrateDataIfEnabled(dispatch, getState);
        }
    }

    if (mutateCurApp.match(action)) {
        const { settings: { isUnzipCourses, isUnzipTutorials, isUnzipQuizzes } } = getState();
        if (isUnzipTutorials && action.payload === "tutorial") {
            setTimeout(() => dispatchHydrateDataIfEnabled(dispatch, getState));
        }
        if (isUnzipCourses && action.payload === "course") {
            setTimeout(() => dispatchHydrateDataIfEnabled(dispatch, getState));
        }
        if (isUnzipQuizzes && action.payload === "quiz") {
            setTimeout(() => dispatchHydrateDataIfEnabled(dispatch, getState));
        }
    }
    return next(action);
};

export default HydrationManager;
