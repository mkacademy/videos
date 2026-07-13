import { Middleware } from '@reduxjs/toolkit';
import { Buffer } from 'buffer';
import { RootState } from '../types';
import {
  parse,
  signTZip,
  signMZip,
  signQZip,
  unSignTZip,
  unSignMZip,
  unSignQZip,
  compressCourses,
  compressQuizzes,
  compressSlideGroupItems,
  compressQuizAnswers,
  compressSlideItems,
  compressSteps,
  compressTutorials,
  compressCourseTutorials,
} from '../../library/EncodingManagerUtils';
import { prependError, prependWarning } from '../slices/errorSlice';
import { Tree as entities, globalVars, getInteractionIDs, users, visitedRoutes } from '../../utils';
import { zipRecords, unzipRecords } from '../../library/actions';
import { viewPayload, ViewPayload } from '../slices/viewSlice';
import { FD as dashboardType, FF as filterType, FS as sifterType } from '../../library/commsUtils';
import { dashboardTypes, filterTypes, sifterTypes } from '../../library/commsUtils';
import { Content, TutorialState } from '../slices/tutorialSlice';
import { Banner as CourseBanner, CourseState, Pennant, SlideGroup, SlideGroupItem, SlideItem } from '../slices/courseSlice';
import { Quiz, QuizState } from '../slices/quizSlice';
import { Metadata, MockedDataReturn, DataRow } from '../../components/Core/types';
import { IncomingMessage, OutgoingMessage } from '../slices/commsSlice';
import { InteractionState } from '../slices/interactionSlice';
import { CourseTrees, QuizTrees, TutorialTrees } from '../../library/controlPanelUtils';
import { setQueue } from './controlPanelXYZ';
import { handleUnzippedCourseFormatters, handleUnzippedQuizFormatters, handleUnzippedTutorialFormatters } from '../../library/cpanelFormatingUtils';
import { addUnzippedTrees, MappedCourseTrees, MappedQuizTrees, MappedTutorialTrees } from '../slices/settingsSlice';

// Error messages
const errorMsg7 = "Nothing selected, zip aborted!";
const errorMsg10 = "No Quizzes found, unzip aborted!";
const errorMsg6 = "No Courses found, unzip aborted!";
const errorMsg3 = "No Tutorials found, unzip aborted!";
const errorMsg5 = "missing containers detected, zip aborted";
const errorMsg2 = "Courses can only be zipped into a sifter!";
const errorMsg1 = "Tutorials can only be zipped into a filter!";
const errorMsg9 = "Quizes can only be zipped into a dashboards!";
const errorMsg8 = "Messages can only be sent via an instruction";
const errorMsg0 = "Recipients have not been selected, zip aborted";

interface ItemWithIsHighlightedAndIsDismissed {
  isHighlighted: boolean;
  isDismissed: boolean;
}

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

const EncodingManager: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
  if (zipRecords.match(action)) {
    const { payload } = action;
    const state = getState();
    const { dismisstype: isClicked, source } = payload;
    const { seltype } = state.settings;
    const { parent: from } = state.view;
    const { username, crudUrl } = state.session;

    if (!users.includes(from ?? '')) {
      return next(prependError(errorMsg0));
    }

    const predicate = seltype
      ? (item: ItemWithIsHighlightedAndIsDismissed) => item.isHighlighted === isClicked
      : (item: ItemWithIsHighlightedAndIsDismissed) => item.isDismissed === isClicked;

    const { entity: to, parentData: { IDs = [] } = { IDs: [] } } = state.view;

    if (IDs.length === 0) {
      return next(prependError(errorMsg0));
    }

    const showSuc = crudUrl === undefined;

    switch (source) {
      case "message": {
        if (to !== "instructions") {
          return next(prependError(errorMsg8));
        }

        const { globallyUniqueIDs } = globalVars;
        const { parentID, childID } = getInteractionIDs(from as string, to);
        const metadata: Metadata = {
          owner: true,
          ordinal: 0,
        };
        if (childID) metadata[childID] = globallyUniqueIDs;
        if (parentID) metadata[parentID] = IDs;
        const metadatas = [metadata];

        const connections = entities.getProperty(to, "connections") as string[];
        const mockedData = entities.getProperty(to, "mockedData") as (metadatas: Metadata[], connections: string[]) => MockedDataReturn | undefined;
        const mock = mockedData?.(metadatas, connections)?.pop();
        const freight: ViewPayload = {
          fetchedData: [
            {
              ...mock,
              id: parseInt(mock?.id as string),
              metadata: {
                ...mock?.metadata,
                communications: "DRAFT",
                owner: mock?.metadata?.owner ?? true,
              },
              descendentsSums: mock?.descendentsSums ?? {},
              status: mock?.status ?? 0,
              sizeInBytes: 0,
            } as DataRow,
          ],
          interactions: { options: [], clicked: [] } as InteractionState,
          entity: "instructions",
        };

        if (showSuc) {
          dispatch(prependError(`created a message template!`));
        }
        return next(viewPayload(freight));
      }

      case "quiz": {
        const insidesPred = (peels: CourseBanner[]) =>
          (content: SlideGroup) => ({
            ...Object.values(content).filter((obj: SlideGroupItem) =>
              peels.find(({ id }: CourseBanner) => obj.bannerId === id)
            ),
            slides: (content.slides || []).filter((slide: SlideItem[]) =>
              peels.find(({ pennants = [] }: CourseBanner) =>
                pennants.find(({ id }: Pennant) => id === slide[0]?.bannerId)
              )
            ),
          });

        const peelsPred = (item: Quiz) => ({
          ...item,
          pennants: (item.pennants || []).filter(predicate),
        });

        const danglingPred = (hulls: Quiz[]) =>
          (item: CourseBanner) =>
            hulls.findIndex(({ id }: Quiz) => id === item.bannerId) === -1;

        if (to !== "dashboards") {
          return next(prependError(errorMsg9));
        }

        const { globallyUniqueIDs } = globalVars;
        const { parentID, childID } = getInteractionIDs(from as string, to);
        const metadata: Metadata = {
          owner: true,
          ordinal: 0,
        };
        if (childID) metadata[childID] = globallyUniqueIDs;
        if (parentID) metadata[parentID] = IDs;
        const metadatas = [metadata];

        const connections = entities.getProperty(to, "connections") as string[];
        const mockedData = entities.getProperty(to, "mockedData") as (metadatas: Metadata[], connections: string[]) => MockedDataReturn | undefined;
        const { quizzes, banners, content } = state.quiz;

        const peels = banners.filter(predicate);
        const insides = content.map(insidesPred(peels));
        const hulls = quizzes.filter(predicate).map(peelsPred);

        if (peels.find(danglingPred(hulls))) {
          return next(prependError(errorMsg5));
        }

        if (insides.length === 0 && peels.length === 0 && hulls.length === 0) {
          return next(prependError(errorMsg7));
        }

        const mock = mockedData?.(metadatas, connections)?.pop();
        const combinedObj = {
          banners: compressCourses(peels).map((banner) => ({ ...banner, pennants: compressCourseTutorials(banner.pennants) })),
          quizzes: compressQuizzes(hulls.map((quiz) => ({ ...quiz, pennants: compressQuizAnswers(quiz.pennants) }))),
          content: insides.map(({ slides, ...slideGroup }: SlideGroup) => {
            const items = Object.values(slideGroup);
            const compressedItems = compressSlideGroupItems(items);
            const compressedObject = Object.fromEntries(compressedItems.map((item, index) => [index, item]));
            return {
              ...compressedObject,
              slides: slides.map((slide) => compressSlideItems(slide))
            };
          }),
          username: username || '',
        };

        const buffer = Buffer.from(JSON.stringify(signQZip(combinedObj)));
        const encodedData = buffer.toString("base64");

        const freight: ViewPayload = {
          fetchedData: [
            {
              ...mock,
              purpose: encodedData,
              id: parseInt(mock?.id as string),
              metadata: {
                ...mock?.metadata,
                communications: "DRAFT",
                owner: mock?.metadata?.owner ?? true,
              },
              descendentsSums: mock?.descendentsSums ?? {},
              status: mock?.status ?? 0,
              sizeInBytes: 0,
            } as DataRow,
          ],
          interactions: { options: [], clicked: [] } as InteractionState,
          entity: "dashboards",
        };

        if (showSuc) {
          dispatch(prependError(`zipped Quiz`));
        }

        return next(viewPayload(freight));
      }

      case "tutorial": {
        if (to !== "filters") {
          return next(prependError(errorMsg1));
        }

        const { globallyUniqueIDs } = globalVars;
        const { parentID, childID } = getInteractionIDs(from as string, to);
        const metadata: Metadata = {
          owner: true,
          ordinal: 0,
        };
        if (childID) metadata[childID] = globallyUniqueIDs;
        if (parentID) metadata[parentID] = IDs;
        const metadatas = [metadata];

        const connections = entities.getProperty(to, "connections") as string[];
        const mockedData = entities.getProperty(to, "mockedData") as (metadatas: Metadata[], connections: string[]) => MockedDataReturn | undefined;
        const insidesPred = (slides: Content[]) => slides.filter(predicate);
        const redPred = (p: number, c: Content[]) => (c.length > 0 ? p + 1 : p);

        const { banners, content } = state.tutorial;
        const insides = content.map(insidesPred);
        const peels = banners.filter(predicate);

        if (insides.reduce(redPred, 0) > peels.length) {
          return next(prependError(errorMsg5));
        } else if (insides.length === 0 && peels.length === 0) {
          return next(prependError(errorMsg7));
        }

        const mock = mockedData?.(metadatas, connections)?.pop();
        const combinedObj = {
          banners: compressTutorials(peels),
          content: insides.map((step) => compressSteps(step)),
          username: username || ''
        };

        const buffer = Buffer.from(JSON.stringify(signTZip(combinedObj)));
        const encodedData = buffer.toString("base64");

        const freight: ViewPayload = {
          fetchedData: [
            {
              ...mock,
              purpose: encodedData,
              id: parseInt(mock?.id as string),
              metadata: {
                ...mock?.metadata,
                communications: "DRAFT",
                owner: mock?.metadata?.owner ?? true,
              },
              descendentsSums: mock?.descendentsSums ?? {},
              status: mock?.status ?? 0,
              sizeInBytes: 0,
            } as DataRow,
          ],
          interactions: { options: [], clicked: [] } as InteractionState,
          entity: "filters",
        };

        if (showSuc) {
          dispatch(prependError(`zipped Tutorial`));
        }

        return next(viewPayload(freight));
      }

      case "course": {
        const redPred = (p: number, content: SlideGroup) =>
          Object.values(content).length > 0 ? p + 1 : p;

        const peelsPred = (item: CourseBanner) => ({
          ...item,
          pennants: (item.pennants || []).filter(predicate),
        });

        const insidesPred = (content: SlideGroup) => ({
          ...Object.values(content).filter(predicate),
          slides: (content.slides || []).map((slide: SlideItem[]) => slide.filter(predicate)),
        });

        if (to !== "sifters") {
          return next(prependError(errorMsg2));
        }

        const { globallyUniqueIDs } = globalVars;
        const { parentID, childID } = getInteractionIDs(from as string, to);
        const metadata: Metadata = {
          owner: true,
          ordinal: 0,
        };
        if (childID) metadata[childID] = globallyUniqueIDs;
        if (parentID) metadata[parentID] = IDs;
        const metadatas = [metadata];

        const connections = entities.getProperty(to, "connections") as string[];
        const mockedData = entities.getProperty(to, "mockedData") as (metadatas: Metadata[], connections: string[]) => MockedDataReturn | undefined;
        const { banners, content } = state.course;

        const peels = banners.filter(predicate).map(peelsPred);
        const insides = content.map(insidesPred);

        if (insides.reduce(redPred, 0) > peels.length) {
          return next(prependError(errorMsg5));
        } else if (insides.length === 0 && peels.length === 0) {
          return next(prependError(errorMsg7));
        }

        const mock = mockedData?.(metadatas, connections)?.pop();
        const combinedObj = {
          banners: compressCourses(peels).map((banner) => ({ ...banner, pennants: compressCourseTutorials(banner.pennants) })),
          content: insides.map(({ slides, ...slideGroup }: SlideGroup) => {
            const items = Object.values(slideGroup);
            const compressedItems = compressSlideGroupItems(items);
            const compressedObject = Object.fromEntries(compressedItems.map((item, index) => [index, item]));
            return {
              ...compressedObject,
              slides: slides.map((slide) => compressSlideItems(slide))
            };
          }),
          username: username || ''
        };

        const buffer = Buffer.from(JSON.stringify(signMZip(combinedObj)));
        const encodedData = buffer.toString("base64");

        const freight: ViewPayload = {
          fetchedData: [
            {
              ...mock,
              purpose: encodedData,
              id: parseInt(mock?.id as string),
              metadata: {
                ...mock?.metadata,
                communications: "DRAFT",
                owner: mock?.metadata?.owner ?? true,
              },
              descendentsSums: mock?.descendentsSums ?? {},
              status: mock?.status ?? 0,
              sizeInBytes: 0,
            } as DataRow,
          ],
          interactions: { options: [], clicked: [] } as InteractionState,
          entity: "sifters",
        };

        if (showSuc) {
          dispatch(prependError(`zipped Course`));
        }

        return next(viewPayload(freight));
      }

      default:
        return next(action);
    }
  }

  if (unzipRecords.match(action)) {
    const { payload } = action;
    const state = getState();
    const { seltype } = state.settings;
    const { username } = state.session;
    const { dismisstype: isClicked, source } = payload;
    const selector = seltype ? "isHighlighted" : "isDismissed";

    switch (source) {
      case "outgoing": {
        const predicate1 = (item: OutgoingMessage) =>
          item[selector] === isClicked && filterTypes.includes(item.type);
        const predicate2 = (item: OutgoingMessage) =>
          item[selector] === isClicked && sifterTypes.includes(item.type);
        const predicate3 = (item: OutgoingMessage) =>
          item[selector] === isClicked && dashboardTypes.includes(item.type);

        const { outgoing } = state.comms;

        let tutorialP: (Partial<TutorialState> & ItemWithTutorialTrees)[] = [];
        let courseP: (Partial<CourseState> & ItemWithCourseTrees)[] = [];
        let quizP: (Partial<QuizState> & ItemWithQuizTrees)[] = [];

        const payloads0 = outgoing.filter(predicate1);
        if (payloads0.length > 0) {
          tutorialP = payloads0.map(({ text, id }: OutgoingMessage) =>
            ({ TreesId: id, ...parse(text, username || '', unSignTZip) })
          ) as (Partial<TutorialState> & ItemWithTutorialTrees)[];

          const { formatters } = state.settings;
          handleUnzippedTutorialFormatters(formatters, dispatch, setQueue, tutorialP);
          const tutorials = tutorialP.map(({ banners }: Partial<TutorialState> & ItemWithTutorialTrees) => banners?.length);
          const tutorialsMsg = `unzipped ${tutorials.toString()} Hydrated Tutorials`;
          dispatch(prependWarning(tutorialsMsg));
          const dehydratedTutorials = tutorialP.map(({ Trees: { _orphans, ...trees } }:
            Partial<TutorialState> & ItemWithTutorialTrees) => Object.values(trees).length + (_orphans?.length ?? 0));
          const dehydratedTutorialsMsg = `unzipped ${dehydratedTutorials.toString()} Dehydrated Tutorials.`;
          dispatch(prependWarning(dehydratedTutorialsMsg));
          visitedRoutes['/convolution/tutorial'] = true;
        } else {
          dispatch(prependError(errorMsg3));
        }

        const payloads1 = outgoing.filter(predicate2);
        if (payloads1.length > 0) {
          courseP = payloads1.map(({ text, id }: OutgoingMessage) =>
            ({ TreesId: id, ...parse(text, username || '', unSignMZip) })
          ) as (Partial<CourseState> & ItemWithCourseTrees)[];
          const { formatters } = state.settings;
          handleUnzippedCourseFormatters(formatters, dispatch, setQueue, courseP);
          const courses = courseP.map(({ banners }: Partial<CourseState> & ItemWithCourseTrees) => banners?.length);
          const coursesMsg = `unzipped ${courses.toString()} Hydrated Courses`;
          dispatch(prependWarning(coursesMsg));
          const dehydratedCourses = courseP.map(({ Trees: { _orphans, ...trees } }:
            Partial<CourseState> & ItemWithCourseTrees) => Object.values(trees).length + (_orphans?.length ?? 0));
          const dehydratedCoursesMsg = `unzipped ${dehydratedCourses.toString()} Dehydrated Courses.`;
          dispatch(prependWarning(dehydratedCoursesMsg));
          visitedRoutes['/convolution/course'] = true;
        } else {
          dispatch(prependError(errorMsg6));
        }

        const payloads2 = outgoing.filter(predicate3);
        if (payloads2.length > 0) {
          quizP = payloads2.map(({ text, id }: OutgoingMessage) =>
            ({ TreesId: id, ...parse(text, username || '', unSignQZip) })
          ) as (Partial<QuizState> & ItemWithQuizTrees)[];
          const { formatters } = state.settings;
          handleUnzippedQuizFormatters(formatters, dispatch, setQueue, quizP);
          const quizzes = quizP.map(({ quizzes }: Partial<QuizState> & ItemWithQuizTrees) => quizzes?.length);
          const quizzesMsg = `unzipped ${quizzes.toString()} Hydrated Quizzes`;
          dispatch(prependWarning(quizzesMsg));
          const dehydratedQuizzes = quizP.map(({ Trees: { _orphans, ...trees } }:
            Partial<QuizState> & ItemWithQuizTrees) => Object.values(trees).length + (_orphans?.length ?? 0));
          const dehydratedQuizzesMsg = `unzipped ${dehydratedQuizzes.toString()} Dehydrated Quizzes.`;
          dispatch(prependWarning(dehydratedQuizzesMsg));
          visitedRoutes['/convolution/quiz'] = true;
        } else {
          dispatch(prependError(errorMsg10));
        }
        if (tutorialP.length > 0 || courseP.length > 0 || quizP.length > 0)
          setTimeout(() => {
            dispatch(addUnzippedTrees({
              tutorialTrees: tutorialP.reduce((acc: MappedTutorialTrees, t: ItemWithTutorialTrees) => {
                acc[t.TreesId] = t.Trees;
                return acc;
              }, {}),
              courseTrees: courseP.reduce((acc: MappedCourseTrees, c: ItemWithCourseTrees) => {
                acc[c.TreesId] = c.Trees;
                return acc;
              }, {}),
              quizTrees: quizP.reduce((acc: MappedQuizTrees, q: ItemWithQuizTrees) => {
                acc[q.TreesId] = q.Trees;
                return acc;
              }, {}),
            }));
          });
        break;
      }

      case "incoming": {
        const predicate1 = (item: IncomingMessage) =>
          item[selector] === isClicked && filterType === item.type;
        const predicate2 = (item: IncomingMessage) =>
          item[selector] === isClicked && sifterType === item.type;
        const predicate3 = (item: IncomingMessage) =>
          item[selector] === isClicked && dashboardType === item.type;

        const { incoming } = state.comms;

        let tutorialP: (Partial<TutorialState> & ItemWithTutorialTrees)[] = [];
        let courseP: (Partial<CourseState> & ItemWithCourseTrees)[] = [];
        let quizP: (Partial<QuizState> & ItemWithQuizTrees)[] = [];

        const payloads0 = incoming.filter(predicate1);
        if (payloads0.length > 0) {
          tutorialP = payloads0.map(({ text, id }: IncomingMessage) =>
            ({ TreesId: id, ...parse(text, username || '', unSignTZip) })
          ) as (Partial<TutorialState> & ItemWithTutorialTrees)[];
          const { formatters } = state.settings;
          handleUnzippedTutorialFormatters(formatters, dispatch, setQueue, tutorialP);
          const results = tutorialP.map(({ banners }: Partial<TutorialState> & ItemWithTutorialTrees) => banners?.length);
          const tutorialsMsg = `unzipped ${results.toString()} Hydrated Tutorials`;
          visitedRoutes['/convolution/tutorial'] = true;
          dispatch(prependWarning(tutorialsMsg));
          const dehydratedTutorials = tutorialP.map(({ Trees: { _orphans, ...trees } }:
            Partial<TutorialState> & ItemWithTutorialTrees) => Object.values(trees).length + (_orphans?.length ?? 0));
          const dehydratedTutorialsMsg = `unzipped ${dehydratedTutorials.toString()} Dehydrated Tutorials.`;
          dispatch(prependWarning(dehydratedTutorialsMsg));
        } else {
          dispatch(prependError(errorMsg3));
        }

        const payloads1 = incoming.filter(predicate2);
        if (payloads1.length > 0) {
          courseP = payloads1.map(({ text, id }: IncomingMessage) =>
            ({ TreesId: id, ...parse(text, username || '', unSignMZip) })
          ) as (Partial<CourseState> & ItemWithCourseTrees)[];
          const { formatters } = state.settings;
          handleUnzippedCourseFormatters(formatters, dispatch, setQueue, courseP);
          const results = courseP.map(({ banners }: Partial<CourseState> & ItemWithCourseTrees) => banners?.length);
          const coursesMsg = `unzipped ${results.toString()} Hydrated Courses`;
          visitedRoutes['/convolution/course'] = true;
          dispatch(prependWarning(coursesMsg));
          const dehydratedCourses = courseP.map(({ Trees: { _orphans, ...trees } }:
            Partial<CourseState> & ItemWithCourseTrees) => Object.values(trees).length + (_orphans?.length ?? 0));
          const dehydratedCoursesMsg = `unzipped ${dehydratedCourses.toString()} Dehydrated Courses.`;
          dispatch(prependWarning(dehydratedCoursesMsg));
        } else {
          dispatch(prependError(errorMsg6));
        }

        const payloads2 = incoming.filter(predicate3);
        if (payloads2.length > 0) {
          quizP = payloads2.map(({ text, id }: IncomingMessage) =>
            ({ TreesId: id, ...parse(text, username || '', unSignQZip) })
          ) as (Partial<QuizState> & ItemWithQuizTrees)[];
          const { formatters } = state.settings;
          handleUnzippedQuizFormatters(formatters, dispatch, setQueue, quizP);
          const results = quizP.map(({ quizzes }: Partial<QuizState> & ItemWithQuizTrees) => quizzes?.length);
          const quizzesMsg = `unzipped ${results.toString()} Hydrated Quizzes`;
          visitedRoutes['/convolution/quiz'] = true;
          dispatch(prependWarning(quizzesMsg));
          const dehydratedQuizzes = quizP.map(({ Trees: { _orphans, ...trees } }:
            Partial<QuizState> & ItemWithQuizTrees) => Object.values(trees).length + (_orphans?.length ?? 0));
          const dehydratedQuizzesMsg = `unzipped ${dehydratedQuizzes.toString()} Dehydrated Quizzes.`;
          dispatch(prependWarning(dehydratedQuizzesMsg));
        } else {
          dispatch(prependError(errorMsg10));
        }
        if (tutorialP.length > 0 || courseP.length > 0 || quizP.length > 0)
          setTimeout(() => {
            dispatch(addUnzippedTrees({
              tutorialTrees: tutorialP.reduce((acc: MappedTutorialTrees, t: ItemWithTutorialTrees) => {
                acc[t.TreesId] = t.Trees;
                return acc;
              }, {}),
              courseTrees: courseP.reduce((acc: MappedCourseTrees, c: ItemWithCourseTrees) => {
                acc[c.TreesId] = c.Trees;
                return acc;
              }, {}),
              quizTrees: quizP.reduce((acc: MappedQuizTrees, q: ItemWithQuizTrees) => {
                acc[q.TreesId] = q.Trees;
                return acc;
              }, {}),
            }));
          });
        break;
      }

      default:
        break;
    }

    return next(action);
  }

  return next(action);
};

export default EncodingManager; 