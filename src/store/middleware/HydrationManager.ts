import { RootState } from "../types";
import { Middleware } from "@reduxjs/toolkit";
import { hydrateData, UnzipAndHydrate } from "../../library/actions";
import { addUnzippedTrees, completedUnzipping, MappedCourseTrees, MappedQuizTrees, MappedTutorialTrees } from "../slices/settingsSlice";
import { FS, FF, FD, sifterTypes, filterTypes, dashboardTypes } from "../../library/commsUtils";
import { setTutorials, TutorialState } from "../slices/tutorialSlice";
import { QuizState, setQuizzes } from "../slices/quizSlice";
import { parse, unSignMZip, unSignTZip, unSignQZip } from "../../library/EncodingManagerUtils";
import { OutgoingMessage, IncomingMessage } from "../slices/commsSlice";
import { CourseState, setCourses } from "../slices/courseSlice";
import { mutateCurApp } from "../slices/sessionSlice";
import { abortIfHydrationDisabled } from "../../library/hydrationUtils";
import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { CourseTrees, QuizTrees, TutorialTrees } from "../../library/controlPanelUtils";

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
    dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
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
            session: { username }
        } = state;

        // Initialize separate arrays for each category
        const tutorialTrees: ItemWithTutorialTrees[] = [];
        const courseTrees: ItemWithCourseTrees[] = [];
        const quizTrees: ItemWithQuizTrees[] = [];

        // Process Courses
        if (isUnzipCourses) {
            const unzippedTreeIds = Object.keys(CourseTrees).map(Number);
            if (unzipCoursesType === "outgoing" || unzipCoursesType === "incoming_and_outgoing") {
                const courseOutgoingIds = outgoing
                    .filter(({ type, id }: OutgoingMessage) => sifterTypes.includes(type) && !unzippedTreeIds.includes(id))
                    .map(({ id, text }: OutgoingMessage) => ({ TreesId: id, ...parse(text, username || '', unSignMZip) }))
                    .map(item => item as Partial<CourseState> & ItemWithCourseTrees)
                    .map(({ TreesId, Trees }: ItemWithCourseTrees) => ({ TreesId, Trees: Trees }));
                courseTrees.push(...courseOutgoingIds);
            }
            if (unzipCoursesType === "incoming" || unzipCoursesType === "incoming_and_outgoing") {
                const courseIncomingIds = incoming
                    .filter(({ type, id }: IncomingMessage) => type === FS && !unzippedTreeIds.includes(id))
                    .map(({ id, text }: IncomingMessage) => ({ TreesId: id, ...parse(text, username || '', unSignMZip) }))
                    .map(item => item as Partial<CourseState> & ItemWithCourseTrees)
                    .map(({ TreesId, Trees }: ItemWithCourseTrees) => ({ TreesId, Trees: Trees }));
                courseTrees.push(...courseIncomingIds);
            }
        }

        // Process Tutorials
        if (isUnzipTutorials) {
            const unzippedTreeIds = Object.keys(TutorialTrees).map(Number);
            if (unzipTutorialsType === "outgoing" || unzipTutorialsType === "incoming_and_outgoing") {
                const tutorialOutgoingIds = outgoing
                    .filter(({ type, id }: OutgoingMessage) => filterTypes.includes(type) && !unzippedTreeIds.includes(id))
                    .map(({ id, text }: OutgoingMessage) => ({ TreesId: id, ...parse(text, username || '', unSignTZip) }))
                    .map(item => item as Partial<TutorialState> & ItemWithTutorialTrees)
                    .map(({ TreesId, Trees }: ItemWithTutorialTrees) => ({ TreesId, Trees: Trees }));
                tutorialTrees.push(...tutorialOutgoingIds);
            }
            if (unzipTutorialsType === "incoming" || unzipTutorialsType === "incoming_and_outgoing") {
                const tutorialIncomingIds = incoming
                    .filter(({ type, id }: IncomingMessage) => type === FF && !unzippedTreeIds.includes(id))
                    .map(({ id, text }: IncomingMessage) => ({ TreesId: id, ...parse(text, username || '', unSignTZip) }))
                    .map(item => item as Partial<TutorialState> & ItemWithTutorialTrees)
                    .map(({ TreesId, Trees }: ItemWithTutorialTrees) => ({ TreesId, Trees: Trees }));
                tutorialTrees.push(...tutorialIncomingIds);
            }
        }

        // Process Quizzes
        if (isUnzipQuizzes) {
            const unzippedTreeIds = Object.keys(QuizTrees).map(Number);
            if (unzipQuizzesType === "outgoing" || unzipQuizzesType === "incoming_and_outgoing") {
                const quizOutgoingIds = outgoing
                    .filter(({ type, id }: OutgoingMessage) => dashboardTypes.includes(type) && !unzippedTreeIds.includes(id))
                    .map(({ id, text }: OutgoingMessage) => ({ TreesId: id, ...parse(text, username || '', unSignQZip) }))
                    .map(item => item as Partial<QuizState> & ItemWithQuizTrees)
                    .map(({ TreesId, Trees }: ItemWithQuizTrees) => ({ TreesId, Trees: Trees }));
                quizTrees.push(...quizOutgoingIds);
            }
            if (unzipQuizzesType === "incoming" || unzipQuizzesType === "incoming_and_outgoing") {
                const quizIncomingIds = incoming
                    .filter(({ type, id }: IncomingMessage) => type === FD && !unzippedTreeIds.includes(id))
                    .map(({ id, text }: IncomingMessage) => ({ TreesId: id, ...parse(text, username || '', unSignQZip) }))
                    .map(item => item as Partial<QuizState> & ItemWithQuizTrees)
                    .map(({ TreesId, Trees }: ItemWithQuizTrees) => ({ TreesId, Trees: Trees }));
                quizTrees.push(...quizIncomingIds);
            }
        }

        courseTrees.forEach((c: ItemWithCourseTrees) => {
            const { Trees = {}, TreesId = 0 } = c;
            const payload = { content: [], banners: [], Trees, TreesId };
            setTimeout(() => dispatch(setCourses(payload)));
        });
        tutorialTrees.forEach((t: ItemWithTutorialTrees) => {
            const { Trees = {}, TreesId = 0 } = t;
            const payload = { banners: [], content: [], Trees, TreesId };
            setTimeout(() => dispatch(setTutorials(payload)));
        });
        quizTrees.forEach((q: ItemWithQuizTrees) => {
            const { Trees = {}, TreesId = 0 } = q;
            const payload = { quizzes: [], banners: [], content: [], Trees, TreesId };
            setTimeout(() => dispatch(setQuizzes(payload)));
        });
        const hasTrees = courseTrees.length > 0 || tutorialTrees.length > 0 || quizTrees.length > 0;
        scheduleCompletedUnzippingWhenIdle(dispatch);
        if (hasTrees) setTimeout(() => {
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
        });
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