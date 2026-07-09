import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  setCourses,
  setSlides,
  SlideGroup, Banner,
} from "../slices/courseSlice";
import {
  setTutorials,
  Content,
} from "../slices/tutorialSlice";
import {
  setQuizzes,
  setBanners,
  setFollowupOptions,
  Quiz,
} from "../slices/quizSlice";
import { extractContent } from "../../library/actions";
import { getStashCellRows } from '../slices/stashSlice';
import { clearOnlyWarnings, fetchedHandles, Handler, prependError as insertError, prependWarning } from "../slices/errorSlice";
import { appendRecords as appendData } from "../slices/responseSlice";
import { setIncomings, setOutgoings, setTutors } from "../slices/commsSlice";
import {
  QuizFormatter,
  CourseFormatter,
  QuestionFormatter,
  PennantFormatter,
  OutgoingFormatter,
  IncomingFormatter,
  TutorsFormatter,
  TutorialFormatter
} from "../../library/Thunks";
import { visitedRoutes } from '../../utils';
import { withReciepients } from '../../Hooks/useCommunications/useCommunications';
import { CpanelRow } from '../../components/Core/types';
import {
  extractContentLogic,
  CpanelData,
  ExtractContentResult,
  payloadParentLinkError,
  questionBannersMatchSourceDashboards,
  tutorialStepsReferencePayloadBanners,
  quizPennantsMatchQuizParents,
  pennantsAttachToBannerParents,
  courseContentReferencesPayloadEntities,
} from '../../library/contentExtractorUtils';

// Error message constants
const errorMsg0 = "Invalid timestamp provided";
const errorMsg3 = "unknown destination webapp, or invalid route";
const er111 = "no questions found in quiz, unStash aborted";
const er7 = "no banners to receive covers in Courses, unStash aborted";
const er8 = "no banners to receive steps in Tutorials, unStash aborted";
const er9 = "no pennants to receive steps in Courses, unStash aborted";
const er10 = "no banners to receive pennants in Courses, unStash aborted";
const er11 = "no banners, empty content, unStash aborted";
const er12 = "no banners to receive steps in Quizzes, unStash aborted";
const er13 = "webapp is not defined, unStash aborted";

type FormatterTrace = {
  source: 'thunkAction' | 'nextAction';
  formatter: string;
  destination: string;
  approute: string;
  timestamp: string;
};

const formatterTraces = new Map<string, FormatterTrace>();

const getRequestId = (value: unknown): string | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const requestId = (value as { requestId?: unknown }).requestId;
  return typeof requestId === "string" ? requestId : undefined;
};

const trackFormatterDispatch = (
  result: unknown,
  trace: FormatterTrace
): void => {
  const requestId = getRequestId(result);
  if (!requestId) return;
  formatterTraces.set(requestId, trace);
};

const getFormatterDispatchTrace = (action: UnknownAction): FormatterTrace | undefined => {
  const requestId = getRequestId((action as { meta?: { requestId?: string } }).meta);
  if (!requestId) return undefined;
  const trace = formatterTraces.get(requestId);
  formatterTraces.delete(requestId);
  return trace;
};

export interface OutgoingThunkPayload {
  content: {
    records: Record<string, Record<string, CpanelRow[]>>;
  };
}

export interface IncomingThunkPayload {
  content: {
    records: Record<string, Record<string, CpanelRow[]>>;
  };
  mailer: number;
}

export interface TutorsThunkPayload {
  content: {
    records: Record<string, Record<string, CpanelRow[]>>;
  };
}

export interface TutorialThunkPayload {
  content: {
    records: {
      foundationFilters: {
        records?: {
          filtersInstructions:
          {
            instructions: CpanelRow[],
            filters: CpanelRow[]
          }
        },
        foundation: CpanelRow[],
        filters: CpanelRow[]
      },

    };
  };
}

export interface PennantThunkPayload {
  content: {
    records: {
      siftersFilters: {
        filters: CpanelRow[],
        sifters: CpanelRow[]
      },
      banners: Banner[],
    }
  }
}

export interface SubmissionThunkPayload {
  content: {
    records: {
      dashboardsFilters: {
        filters: CpanelRow[],
        dashboards: CpanelRow[]
      },
      quizzes: Quiz[],
    }
  }
}

export interface CourseThunkPayload {
  content: {
    records: {
      foundationSifters: {
        records?: {
          siftersInstructions: {
            instructions: CpanelRow[],
            sifters: CpanelRow[]
          }
        },
        foundation: CpanelRow[],
        sifters: CpanelRow[]
      },
    }
  }
}

export interface QuizThunkPayload {
  content: {
    records: {
      foundationDashboards: {
        foundation: CpanelRow[],
        dashboards: CpanelRow[]
      },
    }
  }
}

export interface QuestionThunkPayload {
  content: {
    records: {
      dashboardsSifters: {
        sifters: CpanelRow[],
        dashboards: CpanelRow[],
      },
    }
  }
}

const ContentExtractor: Middleware<{}, RootState> =
  ({ dispatch, getState }) =>
    (next) =>
      (action) => {

        if (extractContent.match(action)) {
          const state = getState();
          const { payload } = action;
          const {
            timestamp,
            selecttype,
            destination,
            approute: fromto,
          } = payload;

          const { crudUrl } = state.session;
          const { formatters } = state.settings;
          const timestamps = state.stash[fromto];
          const fetchedData = timestamps ? getStashCellRows(timestamps[timestamp]) : undefined;
          if (fetchedData === undefined || fetchedData.length === 0) return next(insertError(errorMsg0));

          const showSuc = crudUrl === undefined;
          const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
          const traceBase = {
            destination,
            approute: fromto,
            timestamp,
          };

          // Use the extracted utility function
          const baseParams = {
            fromto,
            fetchedData,
            selecttype,
            formatters,
            showSuc,
          };
          let result: ExtractContentResult;
          switch (destination) {
            case "quiz":
              result = extractContentLogic({
                destination,
                ...baseParams,
                quizzes: state.quiz.quizzes,
                quizBanners: state.quiz.banners,
                quizContent: state.quiz.content,
              });
              break;
            case "tutorial":
              result = extractContentLogic({
                destination,
                ...baseParams,
                tutorialBanners: state.tutorial.banners,
              });
              break;
            case "course":
              result = extractContentLogic({
                destination,
                ...baseParams,
                courseBanners: state.course.banners,
                courseContent: state.course.content,
              });
              break;
            case "tutors":
              result = extractContentLogic({
                destination,
                ...baseParams,
              });
              break;
            case "incoming":
              result = extractContentLogic({
                destination,
                ...baseParams,
                mailer: state.session.curMailer,
              });
              break;
            case "outgoing":
              result = extractContentLogic({
                destination,
                ...baseParams,
              });
              break;
            default:
              return next(insertError(errorMsg3));
          }

          if (!result.success) return next(insertError(result.error || errorMsg3));

          if (result.sucMsg || result.warning) {
            dispatch(clearOnlyWarnings());
          }

          // Handle success message
          if (result.sucMsg) setTimeout(() => dispatch(prependWarning(result.sucMsg ?? null)));

          // Handle warning message
          if (result.warning) setTimeout(() => dispatch(prependWarning(result.warning ?? null)));

          // Handle visited routes
          if (result.routes) result.routes.forEach(route => route && (visitedRoutes[route] = true));


          // Handle thunk dispatch (for cpanelapp formatter)
          if (result.thunkAction && result.webapp) {
            switch (result.webapp) {
              case "quiz":
                if (fromto === "dashboardssifters") {
                  trackFormatterDispatch(
                    thunkDispatch(QuestionFormatter(result.thunkAction as QuestionThunkPayload)),
                    { ...traceBase, source: 'thunkAction', formatter: 'QuestionFormatter' }
                  );
                }
                else if (fromto === "siftersinstructions") {
                  trackFormatterDispatch(
                    thunkDispatch(CourseFormatter(result.thunkAction as CourseThunkPayload)),
                    { ...traceBase, source: 'thunkAction', formatter: 'CourseFormatter' }
                  );
                }
                else if (fromto === "siftersfilters") {
                  trackFormatterDispatch(
                    thunkDispatch(PennantFormatter(result.thunkAction as PennantThunkPayload)),
                    { ...traceBase, source: 'thunkAction', formatter: 'PennantFormatter' }
                  );
                }
                else if (fromto === "filtersinstructions") {
                  trackFormatterDispatch(
                    thunkDispatch(TutorialFormatter(result.thunkAction as TutorialThunkPayload)),
                    { ...traceBase, source: 'thunkAction', formatter: 'TutorialFormatter' }
                  );
                }
                else {
                  trackFormatterDispatch(
                    thunkDispatch(QuizFormatter(result.thunkAction as QuizThunkPayload)),
                    { ...traceBase, source: 'thunkAction', formatter: 'QuizFormatter' }
                  );
                }
                break;
              case "tutorial":
                trackFormatterDispatch(
                  thunkDispatch(TutorialFormatter(result.thunkAction as TutorialThunkPayload)),
                  { ...traceBase, source: 'thunkAction', formatter: 'TutorialFormatter' }
                );
                break;
              case "course":
                if (fromto === "siftersfilters") {
                  trackFormatterDispatch(
                    thunkDispatch(PennantFormatter(result.thunkAction as PennantThunkPayload)),
                    { ...traceBase, source: 'thunkAction', formatter: 'PennantFormatter' }
                  );
                }
                else if (fromto === "filtersinstructions") {
                  trackFormatterDispatch(
                    thunkDispatch(TutorialFormatter(result.thunkAction as TutorialThunkPayload)),
                    { ...traceBase, source: 'thunkAction', formatter: 'TutorialFormatter' }
                  );
                }
                else {
                  trackFormatterDispatch(
                    thunkDispatch(CourseFormatter(result.thunkAction as CourseThunkPayload)),
                    { ...traceBase, source: 'thunkAction', formatter: 'CourseFormatter' }
                  );
                }
                break;
              case "outgoing":
                trackFormatterDispatch(
                  thunkDispatch(OutgoingFormatter(result.thunkAction as OutgoingThunkPayload)),
                  { ...traceBase, source: 'thunkAction', formatter: 'OutgoingFormatter' }
                );
                break;
              case "incoming":
                trackFormatterDispatch(
                  thunkDispatch(IncomingFormatter(result.thunkAction as IncomingThunkPayload)),
                  { ...traceBase, source: 'thunkAction', formatter: 'IncomingFormatter' }
                );
                break;
              case "tutors":
                trackFormatterDispatch(
                  thunkDispatch(TutorsFormatter(result.thunkAction as TutorsThunkPayload)),
                  { ...traceBase, source: 'thunkAction', formatter: 'TutorsFormatter' }
                );
                break;
            }
          }

          // Handle next action: cpanel append vs formatter thunk (app mode puts the thunk on
          // nextAction while still including cpanel on the result for other uses)
          if (result.nextAction) {
            const na = result.nextAction;
            const nextIsCpanelAppend =
              "fetchedData" in na && "to" in na && "from" in na;
            if (nextIsCpanelAppend && result.cpanel && result.webapp) {
              return next(appendData(na as CpanelData & { webapp: string }));
            }
            switch (result.webapp) {
              case "quiz":
                if (fromto === "dashboardssifters") {
                  trackFormatterDispatch(
                    thunkDispatch(QuestionFormatter(na as QuestionThunkPayload)),
                    { ...traceBase, source: 'nextAction', formatter: 'QuestionFormatter' }
                  );
                  break;
                }
                else if (fromto === "siftersinstructions") {
                  const dispatchedAction = next(CourseFormatter(na as CourseThunkPayload));
                  trackFormatterDispatch(dispatchedAction, { ...traceBase, source: 'nextAction', formatter: 'CourseFormatter' });
                  return dispatchedAction;
                }
                else if (fromto === "siftersfilters") {
                  const dispatchedAction = next(PennantFormatter(na as PennantThunkPayload));
                  trackFormatterDispatch(dispatchedAction, { ...traceBase, source: 'nextAction', formatter: 'PennantFormatter' });
                  return dispatchedAction;
                }
                else if (fromto === "filtersinstructions") {
                  const dispatchedAction = next(TutorialFormatter(na as TutorialThunkPayload));
                  trackFormatterDispatch(dispatchedAction, { ...traceBase, source: 'nextAction', formatter: 'TutorialFormatter' });
                  return dispatchedAction;
                }
                else {
                  const dispatchedAction = next(QuizFormatter(na as QuizThunkPayload));
                  trackFormatterDispatch(dispatchedAction, { ...traceBase, source: 'nextAction', formatter: 'QuizFormatter' });
                  return dispatchedAction;
                }
              case "tutorial":
                {
                  const dispatchedAction = next(TutorialFormatter(na as TutorialThunkPayload));
                  trackFormatterDispatch(dispatchedAction, { ...traceBase, source: 'nextAction', formatter: 'TutorialFormatter' });
                  return dispatchedAction;
                }
              case "course":
                if (fromto === "siftersfilters") {
                  const dispatchedAction = next(PennantFormatter(na as PennantThunkPayload));
                  trackFormatterDispatch(dispatchedAction, { ...traceBase, source: 'nextAction', formatter: 'PennantFormatter' });
                  return dispatchedAction;
                }
                else if (fromto === "filtersinstructions") {
                  const dispatchedAction = next(TutorialFormatter(na as TutorialThunkPayload));
                  trackFormatterDispatch(dispatchedAction, { ...traceBase, source: 'nextAction', formatter: 'TutorialFormatter' });
                  return dispatchedAction;
                }
                else {
                  const dispatchedAction = next(CourseFormatter(na as CourseThunkPayload));
                  trackFormatterDispatch(dispatchedAction, { ...traceBase, source: 'nextAction', formatter: 'CourseFormatter' });
                  return dispatchedAction;
                }
              case "outgoing":
                {
                  const result = next(OutgoingFormatter(na as OutgoingThunkPayload));
                  trackFormatterDispatch(result, { ...traceBase, source: 'nextAction', formatter: 'OutgoingFormatter' });
                  return result;
                }
              case "incoming":
                {
                  const result = next(IncomingFormatter(na as IncomingThunkPayload));
                  trackFormatterDispatch(result, { ...traceBase, source: 'nextAction', formatter: 'IncomingFormatter' });
                  return result;
                }
              case "tutors":
                {
                  const result = next(TutorsFormatter(na as TutorsThunkPayload));
                  trackFormatterDispatch(result, { ...traceBase, source: 'nextAction', formatter: 'TutorsFormatter' });
                  return result;
                }
              default:
                if (result.cpanel) return next(appendData(na as CpanelData & { webapp: string }));
            }
          }

          // Fallback for cases that only need cpanel action
          if (result.cpanel && result.webapp && !result.nextAction)
            return next(appendData({ ...result.cpanel, webapp: result.webapp }));

          return next(action);
        }

        if (QuestionFormatter.fulfilled.match(action)) {
          const formatterTrace = getFormatterDispatchTrace(action);
          const destination = formatterTrace?.destination;
          if (destination === undefined) return next(insertError(er13));
          const { formatters } = getState().settings;
          const { payload } = action;
          const { banners, handlers } = payload;
          const questionArgs = ((action as UnknownAction & {
            meta?: {
              arg?: QuestionThunkPayload;
              args?: QuestionThunkPayload;
            };
          }).meta?.arg ?? (action as UnknownAction & {
            meta?: {
              arg?: QuestionThunkPayload;
              args?: QuestionThunkPayload;
            };
          }).meta?.args);
          const sourceSifters = questionArgs?.content?.records?.dashboardsSifters?.sifters ?? [];
          const hydratedPayload = sourceSifters.length === 0
            ? payload
            : {
              ...payload,
              banners: banners?.map((banner, index) => {
                if (banner.title != null && banner.quote != null) return banner;
                const bySifterId = sourceSifters.find(({ id }) => id === banner.sifterId);
                const fallbackSource = bySifterId ?? sourceSifters[index];
                if (!fallbackSource) return banner;
                const fallbackTitle = (fallbackSource as CpanelRow & { title?: string }).title
                  ?? (fallbackSource as CpanelRow).sifter
                  ?? (fallbackSource as CpanelRow).dashboard
                  ?? "";
                const fallbackQuote = (fallbackSource as CpanelRow & { quote?: string }).quote
                  ?? (fallbackSource as CpanelRow).details
                  ?? (fallbackSource as CpanelRow).purpose
                  ?? "";
                return {
                  ...banner,
                  title: banner.title ?? fallbackTitle,
                  quote: banner.quote ?? fallbackQuote,
                };
              }),
            };
          const sourceDashboards =
            questionArgs?.content?.records?.dashboardsSifters?.dashboards ?? [];
          if (
            formatters !== "cpanel" &&
            formatterTrace?.approute === "dashboardssifters" &&
            !questionBannersMatchSourceDashboards(hydratedPayload.banners, sourceDashboards)
          ) {
            return next(insertError(payloadParentLinkError("quiz", "questions", "Quizzes")));
          }
          if (banners?.length === 0)
            return next(insertError(er111));
          switch (formatters) {
            case "app":
            case "cpanelapp":
              setTimeout(() => dispatch(fetchedHandles(handlers ?? {} as Record<string, Handler[]>)));
              return next(setBanners(hydratedPayload));
            default: return next(action);
          }
        }

        if (QuizFormatter.fulfilled.match(action)) {
          const formatterTrace = getFormatterDispatchTrace(action);
          const destination = formatterTrace?.destination;
          if (destination === undefined) return next(insertError(er13));
          const { formatters } = getState().settings;
          const { payload } = action;
          if (
            formatters !== "cpanel" &&
            !quizPennantsMatchQuizParents(payload.quizzes ?? [])
          ) {
            return next(insertError(payloadParentLinkError("quiz", "submissions", "Quizzes")));
          }
          switch (formatters) {
            case "app":
            case "cpanelapp":
              return next(setQuizzes(payload));
            default: return next(action);
          }
        }

        if (TutorialFormatter.fulfilled.match(action)) {
          const formatterTrace = getFormatterDispatchTrace(action);
          const destination = formatterTrace?.destination;
          if (destination === undefined) return next(insertError(er13));
          const state = getState();
          const { formatters } = state.settings;
          const { banners: quizBanners } = state.quiz;
          const { banners, content } = action.payload;
          const { banners: courseBanners } = state.course;
          const { banners: curTutorialBanners } = state.tutorial;
          if (
            formatters !== "cpanel" &&
            !tutorialStepsReferencePayloadBanners(banners, content)
          ) {
            switch (destination) {
              case "course":
                return next(insertError(payloadParentLinkError("chapter", "steps", "Courses")));
              case "tutorial":
                return next(insertError(payloadParentLinkError("banner", "steps", "Tutorials")));
              case "quiz":
                return next(insertError(payloadParentLinkError("followup question", "options", "Quizzes")));
            }
          }
          const stepPred = ({ id }: { id: number }) =>
            content.find((item: Content[]) => item[0]?.bannerId === id);
          const noTutorialMatches = curTutorialBanners.length === 0 || curTutorialBanners.filter(stepPred).length === 0;
          if (destination === "tutorial" && banners.length === 0 && noTutorialMatches && formatters !== "cpanel")
            return next(insertError(er8));

          const pennantPred = ({ bannerId }: { bannerId: number }) =>
            courseBanners.find(({ pennants }) =>
              pennants.find(({ id }) => id === bannerId)
            );
          const noCourseMatches = content.flat().filter(pennantPred).length === 0;
          if (destination === "course" && banners.length === 0 && noCourseMatches && formatters !== "cpanel")
            return next(insertError(er9));

          const quizPennantPred = ({ bannerId }: { bannerId: number }) =>
            quizBanners.find(({ pennants }) =>
              pennants.find(({ id }) => id === bannerId)
            );
          const noQuizMatches = content.flat().filter(quizPennantPred).length === 0;
          if (destination === "quiz" && banners.length === 0 && noQuizMatches && formatters !== "cpanel")
            return next(insertError(er12));

          if (banners.length === 0 && content.length === 0 && formatters !== "cpanel")
            return next(insertError(er11));

          switch (formatters) {
            case "app":
            case "cpanelapp":
              if (destination === "course") return next(setSlides({ content }));
              if (destination === "quiz") return next(setFollowupOptions({ content }));
              if (destination === "tutorial") return next(setTutorials(action.payload));
            default: return next(action);
          }
        }

        if (CourseFormatter.fulfilled.match(action)) {
          const formatterTrace = getFormatterDispatchTrace(action);
          const destination = formatterTrace?.destination;
          if (destination === undefined) return next(insertError(er13));
          if (
            formatterTrace &&
            formatterTrace.destination !== "course" &&
            formatterTrace.destination !== "quiz"
          ) {
            return next(action);
          }
          const { payload } = action;
          const { banners, content } = payload;
          const state = getState();
          const { formatters } = state.settings;
          const { banners: currentCourseBanners } = state.course;
          const { banners: existingQuizBanners } = state.quiz;
          const allBanners = banners ?? [];
          const nextCourseBanners = destination === "course"
            ? allBanners
            : destination === "quiz"
              ? []
              : allBanners.filter(({ id, bannerId }) => bannerId === undefined || bannerId === id);
          const quizBanners = destination === "quiz"
            ? allBanners
            : destination === "course"
              ? []
              : allBanners.filter(({ id, bannerId }) => bannerId !== undefined && bannerId !== id);
          const recoveredQuizBanners = destination ? []
            : quizBanners.length === 0
              ? nextCourseBanners
                .map((banner) => {
                  const existingQuizBanner = existingQuizBanners.find(({ id }) => id === banner.id);
                  if (!existingQuizBanner || existingQuizBanner.bannerId === undefined) return null;
                  return {
                    ...banner,
                    bannerId: existingQuizBanner.bannerId,
                  };
                })
                .filter(Boolean) as Banner[]
              : [];
          const unmatchedCourseBanners = recoveredQuizBanners.length === 0
            ? nextCourseBanners
            : nextCourseBanners.filter(
              ({ id }) => !recoveredQuizBanners.some((quizBanner) => quizBanner.id === id)
            );
          const coverPred = ({ id }: { id: number }) =>
            content && content.find((item: SlideGroup) => item[0]?.bannerId === id);
          const noMatches = banners.length === 0 && currentCourseBanners.filter(coverPred).length === 0;

          if (noMatches) return next(insertError(er7));

          if (
            formatters !== "cpanel" &&
            banners &&
            content &&
            !courseContentReferencesPayloadEntities(allBanners, content)
          ) {
            switch (destination) {
              case "course":
                return next(insertError(payloadParentLinkError("banner", "covers", "Courses")));
              case "quiz":
                return next(insertError(payloadParentLinkError("question", "options", "Quizzes")));
            }
          }

          switch (formatters) {
            case "app":
            case "cpanelapp":
              if (destination === "quiz" && formatterTrace?.approute === "siftersinstructions") {
                if (content && content.length > 0) {
                  next(setQuizzes({ quizzes: [], banners: [], content }));
                }
                return;
              }
              if (banners && content) {
                if (unmatchedCourseBanners.length > 0 || content.length > 0)
                  next(setCourses({ banners: unmatchedCourseBanners, content }));
                if (quizBanners.length > 0)
                  next(setQuizzes({ quizzes: [], banners: quizBanners, content }));
                else if (recoveredQuizBanners.length > 0)
                  next(setQuizzes({ quizzes: [], banners: recoveredQuizBanners, content }));
                if (unmatchedCourseBanners.length > 0 || quizBanners.length > 0 || recoveredQuizBanners.length > 0 || content.length > 0) return;
              }
              return next(action);
            default: return next(action);
          }
        }

        if (PennantFormatter.fulfilled.match(action)) {
          const formatterTrace = getFormatterDispatchTrace(action);
          const destination = formatterTrace?.destination;
          if (destination === undefined) return next(insertError(er13));
          const { formatters } = getState().settings;
          const { payload } = action;
          const { banners, content } = payload;
          const allBanners = banners ?? [];
          const courseBanners = destination === "course"
            ? allBanners
            : destination === "quiz"
              ? []
              : allBanners.filter(({ id, bannerId }) => bannerId === undefined || bannerId === id);
          const quizBanners = destination === "quiz"
            ? allBanners
            : destination === "course"
              ? []
              : allBanners.filter(({ id, bannerId }) => bannerId !== undefined && bannerId !== id);

          if (formatters !== "cpanel") {
            if (!pennantsAttachToBannerParents(courseBanners))
              return next(insertError(payloadParentLinkError("banner", "chapters", "Courses")));
            if (!pennantsAttachToBannerParents(quizBanners))
              return next(insertError(payloadParentLinkError("question", "followup questions", "Quizzes")));
          }

          const pennants = banners?.map(({ pennants }: Banner) => pennants).flat().length || 0;
          if (pennants === 0) return next(insertError(er10));
          switch (formatters) {
            case "app":
            case "cpanelapp":
              if (banners && content.length === 0) {
                if (courseBanners.length > 0) next(setCourses({ banners: courseBanners, content: [] }));
                if (quizBanners.length > 0) next(setBanners({ banners: quizBanners }));
                if (courseBanners.length > 0 || quizBanners.length > 0) return;
              }
              if (content.length > 0) return next(setSlides({ content }));
              return next(action);
            default: return next(action);
          }
        }

        if (OutgoingFormatter.fulfilled.match(action)) {
          const formatterTrace = getFormatterDispatchTrace(action);
          const destination = formatterTrace?.destination;
          if (destination === undefined) return next(insertError(er13));
          const state = getState();
          const { formatters } = state.settings;
          const { handles } = state.error;
          const { payload } = action;
          switch (formatters) {
            case "app":
            case "cpanelapp":
              const { content } = payload;
              return next(setOutgoings(withReciepients({ response: content, handlers: handles })));
            default: return next(action);
          }
        }
        if (IncomingFormatter.fulfilled.match(action)) {
          const formatterTrace = getFormatterDispatchTrace(action);
          const destination = formatterTrace?.destination;
          if (destination === undefined) return next(insertError(er13));
          const { formatters } = getState().settings;
          const { payload } = action;
          switch (formatters) {
            case "app":
            case "cpanelapp":
              const { content } = payload;
              return next(setIncomings(content));
            default: return next(action);
          }
        }
        if (TutorsFormatter.fulfilled.match(action)) {
          const formatterTrace = getFormatterDispatchTrace(action);
          const destination = formatterTrace?.destination;
          if (destination === undefined) return next(insertError(er13));
          const { formatters } = getState().settings;
          const { payload } = action;
          switch (formatters) {
            case "app":
            case "cpanelapp":
              const { content } = payload;
              return next(setTutors(content));
            default: return next(action);
          }
        }

        return next(action);
      };

export default ContentExtractor;
