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
import { FS, FF, FD, sifterTypes, filterTypes, dashboardTypes } from "../../library/commsUtils";
import { setTutorials } from "../slices/tutorialSlice";
import { setQuizzes } from "../slices/quizSlice";
import { parseZipTrees } from "../../library/EncodingManagerUtils";
import { OutgoingMessage, IncomingMessage } from "../slices/commsSlice";
import { setCourses } from "../slices/courseSlice";
import { mutateCurApp } from "../slices/sessionSlice";
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
                unzipCoursesType,
                unzipTutorialsType,
                unzipQuizzesType,
                TutorialTrees,
                CourseTrees,
                QuizTrees,
            },
            comms: { outgoing, incoming },
        } = state;

        const tutorialTrees: ItemWithTutorialTrees[] = [];
        const courseTrees: ItemWithCourseTrees[] = [];
        const quizTrees: ItemWithQuizTrees[] = [];

        if (isUnzipCourses) {
            const unzippedTreeIds = new Set(Object.keys(CourseTrees).map(Number));
            if (unzipCoursesType === "outgoing" || unzipCoursesType === "incoming_and_outgoing") {
                for (const { type, id, text } of outgoing as OutgoingMessage[]) {
                    if (!sifterTypes.includes(type) || unzippedTreeIds.has(id)) continue;
                    courseTrees.push({ TreesId: id, Trees: parseZipTrees<CourseTrees>(text) });
                }
            }
            if (unzipCoursesType === "incoming" || unzipCoursesType === "incoming_and_outgoing") {
                for (const { type, id, text } of incoming as IncomingMessage[]) {
                    if (type !== FS || unzippedTreeIds.has(id)) continue;
                    courseTrees.push({ TreesId: id, Trees: parseZipTrees<CourseTrees>(text) });
                }
            }
        }

        if (isUnzipTutorials) {
            const unzippedTreeIds = new Set(Object.keys(TutorialTrees).map(Number));
            if (unzipTutorialsType === "outgoing" || unzipTutorialsType === "incoming_and_outgoing") {
                for (const { type, id, text } of outgoing as OutgoingMessage[]) {
                    if (!filterTypes.includes(type) || unzippedTreeIds.has(id)) continue;
                    tutorialTrees.push({ TreesId: id, Trees: parseZipTrees<TutorialTrees>(text) });
                }
            }
            if (unzipTutorialsType === "incoming" || unzipTutorialsType === "incoming_and_outgoing") {
                for (const { type, id, text } of incoming as IncomingMessage[]) {
                    if (type !== FF || unzippedTreeIds.has(id)) continue;
                    tutorialTrees.push({ TreesId: id, Trees: parseZipTrees<TutorialTrees>(text) });
                }
            }
        }

        if (isUnzipQuizzes) {
            const unzippedTreeIds = new Set(Object.keys(QuizTrees).map(Number));
            if (unzipQuizzesType === "outgoing" || unzipQuizzesType === "incoming_and_outgoing") {
                for (const { type, id, text } of outgoing as OutgoingMessage[]) {
                    if (!dashboardTypes.includes(type) || unzippedTreeIds.has(id)) continue;
                    quizTrees.push({ TreesId: id, Trees: parseZipTrees<QuizTrees>(text) });
                }
            }
            if (unzipQuizzesType === "incoming" || unzipQuizzesType === "incoming_and_outgoing") {
                for (const { type, id, text } of incoming as IncomingMessage[]) {
                    if (type !== FD || unzippedTreeIds.has(id)) continue;
                    quizTrees.push({ TreesId: id, Trees: parseZipTrees<QuizTrees>(text) });
                }
            }
        }

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
