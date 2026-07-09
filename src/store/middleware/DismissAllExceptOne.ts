import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  dismissCourse,
  dismissSlide,
  dimissMainslide,
  highlightSlideBreathSelection,
  highlightCoversBreathSelection,
  highlightCourseBreathSelection,
  highlightPennantBreathSelection,
  highlightPennantDepthSelection,
  highlightCourseDepthSelection,
  dismissChapter,
} from '../slices/courseSlice';
import type { SlideGroup, dismissSlidePayload } from '../slices/courseSlice';
import {
  dismissTutorial,
  highlightTutorialBreathSelection,
  highlightTutorialDepthSelection,
  highlightContentBreathSelection,
} from '../slices/tutorialSlice';
import {
  dismissQuiz,
  dismissQuestion,
  dismissAttempt,
  highlightQuizBreathSelection,
  highlightQuizDepthSelection,
  highlightAttemptBreathSelection,
  highlightQuestionBreathSelection,
  highlightQuestionDepthSelection,
} from '../slices/quizSlice';
import { setSingleItemFormFlag } from '../slices/sessionSlice';

const COURSE_HIGHLIGHT_ACTIONS = [
  highlightSlideBreathSelection,
  highlightCoversBreathSelection,
  highlightCourseBreathSelection,
  highlightPennantBreathSelection,
  highlightPennantDepthSelection,
  highlightCourseDepthSelection,
] as const;

const TUTORIAL_HIGHLIGHT_ACTIONS = [
  highlightTutorialBreathSelection,
  highlightTutorialDepthSelection,
  highlightContentBreathSelection,
] as const;

const QUIZ_HIGHLIGHT_ACTIONS = [
  highlightQuizBreathSelection,
  highlightQuizDepthSelection,
  highlightAttemptBreathSelection,
  highlightQuestionBreathSelection,
  highlightQuestionDepthSelection,
] as const;

type SingleItemEntityKey =
  | 'courseBanners'
  | 'coursePennants'
  | 'courseSlideGroupItems'
  | 'courseSlides'
  | 'tutorialBanners'
  | 'tutorialContent'
  | 'quizzes'
  | 'quizBanners'
  | 'quizCoursePennants'

function countCourseBanners(state: RootState): number {
  const { course } = state;
  // For course banners, only consider the "no course selected" state (matches SiftersForm semantics).
  if (course.selected > -1) return 0;
  return course.banners.length;
}

function countCourseSlideGroupItems(state: RootState): number {
  const { course } = state;
  const selected = course.selected;
  if (selected === -1) return 0;
  const banner = course.banners[selected];
  if (!banner) return 0;
  const bannerId = banner.id;
  let count = 0;
  for (const group of course.content as SlideGroup[]) {
    const first = (group[0] as { bannerId?: number } | undefined);
    if (!first || first.bannerId !== bannerId) continue;
    const { slides, ...rest } = group;
    Object.values(rest).forEach((x) => {
      if (x && typeof x === 'object' && 'isDismissed' in x) count += 1;
    });
  }
  return count;
}

function countCourseSlides(state: RootState): number {
  const { course } = state;
  const selected = course.selected;
  if (selected === -1) return 0;
  const banner = course.banners[selected];
  if (!banner) return 0;
  const bannerId = banner.id;
  let count = 0;
  for (const group of course.content as SlideGroup[]) {
    const first = (group[0] as { bannerId?: number } | undefined);
    if (!first || first.bannerId !== bannerId) continue;
    for (const row of group.slides ?? []) {
      count += row.length;
    }
  }
  return count;
}

function countCoursePennants(state: RootState): number {
  const { course } = state;
  const selected = course.selected;
  if (selected === -1) return 0;
  const banner = course.banners[selected];
  if (!banner) return 0;
  return banner.pennants.length;
}

function countTutorialBanners(state: RootState): number {
  const { tutorial } = state;
  // When no tutorial is selected, treat all banners as candidates.
  if (tutorial.selected > -1) return 0;
  return tutorial.banners.length;
}

function countTutorialContentItems(state: RootState): number {
  const { tutorial } = state;
  const selected = tutorial.selected;
  if (selected === -1) return 0;
  const banner = tutorial.banners[selected];
  if (!banner) return 0;
  const bannerId = banner.id;
  let count = 0;
  // tutorial.content is an array of slide rows; rows for this banner have row[0]?.bannerId === bannerId.
  for (const row of tutorial.content as { 0?: { bannerId?: number } }[]) {
    if (row[0]?.bannerId === bannerId) {
      // Each element in the row is a content item (aligns with InstructionsForm tutorialContent usage).
      const typedRow = row as unknown as { id: number }[];
      count += typedRow.length;
    }
  }
  return count;
}

function countQuizzes(state: RootState): number {
  const { quiz } = state;
  // For dashboards, only consider when no quiz is selected.
  if (quiz.selected > -1) return 0;
  return quiz.quizzes.length;
}

function countQuizBannersForSelectedQuiz(state: RootState): number {
  const { quiz } = state;
  const selected = quiz.selected;
  if (selected === -1) return 0;
  const selectedQuiz = quiz.quizzes[selected];
  if (!selectedQuiz) return 0;
  const quizId = selectedQuiz.id;
  return quiz.banners.filter((b: { bannerId?: number }) => b.bannerId === quizId).length;
}

function countQuizCoursePennantsForFollowup(state: RootState): number {
  const { quiz } = state;
  if (quiz.followupId === undefined) return 0;
  const parent = quiz.banners.find((b) => b.id === quiz.followupId);
  if (!parent) return 0;
  return parent.pennants.length;
}



/** Whether a lone item in this bucket should short-circuit dismiss for the current highlight action. */
function isSingleItemRelevantForCourseHighlight(
  action: unknown,
  key: SingleItemEntityKey,
  chaptersEmpty: boolean
): boolean {
  switch (key) {
    case 'courseBanners':
      return true;
    case 'coursePennants':
      return (
        highlightPennantBreathSelection.match(action as ReturnType<typeof highlightPennantBreathSelection>) ||
        highlightPennantDepthSelection.match(action as ReturnType<typeof highlightPennantDepthSelection>)
      );
    case 'courseSlideGroupItems':
      return (
        chaptersEmpty &&
        (highlightCoversBreathSelection.match(action as ReturnType<typeof highlightCoversBreathSelection>) ||
          highlightCourseBreathSelection.match(action as ReturnType<typeof highlightCourseBreathSelection>) ||
          highlightCourseDepthSelection.match(action as ReturnType<typeof highlightCourseDepthSelection>))
      );
    case 'courseSlides':
      return (
        !chaptersEmpty &&
        highlightSlideBreathSelection.match(action as ReturnType<typeof highlightSlideBreathSelection>)
      );
    default:
      return false;
  }
}

function setSingleItemFlagsForCourse(
  state: RootState,
  pathname: string,
  action: unknown,
  dispatch: (action: ReturnType<typeof setSingleItemFormFlag>) => void
): boolean {
  const chaptersEmpty = !state.course.chapters || state.course.chapters.length === 0;
  const entries: { key: SingleItemEntityKey; count: number }[] = [
    { key: 'courseBanners', count: countCourseBanners(state) },
    { key: 'coursePennants', count: countCoursePennants(state) },
    { key: 'courseSlideGroupItems', count: countCourseSlideGroupItems(state) },
    { key: 'courseSlides', count: countCourseSlides(state) },
  ];
  let hasSingleRelevant = false;
  for (const { key, count } of entries) {
    if (count === 1) {
      dispatch(setSingleItemFormFlag({ path: pathname, entityKey: key }));
      if (isSingleItemRelevantForCourseHighlight(action, key, chaptersEmpty)) {
        hasSingleRelevant = true;
      }
    }
  }
  return hasSingleRelevant;
}

function isSingleItemRelevantForTutorialHighlight(
  action: unknown,
  key: SingleItemEntityKey
): boolean {
  switch (key) {
    case 'tutorialBanners':
      return (
        highlightTutorialBreathSelection.match(action as ReturnType<typeof highlightTutorialBreathSelection>) ||
        highlightTutorialDepthSelection.match(action as ReturnType<typeof highlightTutorialDepthSelection>)
      );
    case 'tutorialContent':
      return highlightContentBreathSelection.match(
        action as ReturnType<typeof highlightContentBreathSelection>
      );
    default:
      return false;
  }
}

function setSingleItemFlagsForTutorial(
  state: RootState,
  pathname: string,
  action: unknown,
  dispatch: (action: ReturnType<typeof setSingleItemFormFlag>) => void
): boolean {
  const entries: { key: SingleItemEntityKey; count: number }[] = [
    { key: 'tutorialBanners', count: countTutorialBanners(state) },
    { key: 'tutorialContent', count: countTutorialContentItems(state) },
  ];
  let hasSingleRelevant = false;
  for (const { key, count } of entries) {
    if (count === 1) {
      dispatch(setSingleItemFormFlag({ path: pathname, entityKey: key }));
      if (isSingleItemRelevantForTutorialHighlight(action, key)) {
        hasSingleRelevant = true;
      }
    }
  }
  return hasSingleRelevant;
}

function isSingleItemRelevantForQuizHighlight(
  action: unknown,
  key: SingleItemEntityKey,
  followupId: number | undefined,
): boolean {
  const isFollowup = followupId !== undefined;
  const isQuizHighlight =
    highlightQuizBreathSelection.match(action as ReturnType<typeof highlightQuizBreathSelection>) ||
    highlightQuizDepthSelection.match(action as ReturnType<typeof highlightQuizDepthSelection>);
  const isQuestionHighlight =
    highlightQuestionBreathSelection.match(action as ReturnType<typeof highlightQuestionBreathSelection>) ||
    highlightQuestionDepthSelection.match(action as ReturnType<typeof highlightQuestionDepthSelection>);

  switch (key) {
    case 'quizzes':
      return isQuizHighlight;
    case 'quizCoursePennants':
      return isFollowup && isQuestionHighlight;
    case 'quizBanners':
      return !isFollowup && isQuestionHighlight;
    default:
      return false;
  }
}

function setSingleItemFlagsForQuiz(
  state: RootState,
  pathname: string,
  action: unknown,
  dispatch: (action: ReturnType<typeof setSingleItemFormFlag>) => void
): boolean {
  const followupId = state.quiz.followupId;
  const isFollowup = followupId !== undefined;
  const entries: { key: SingleItemEntityKey; count: number }[] = [
    { key: 'quizzes', count: countQuizzes(state) },
    { key: 'quizBanners', count: isFollowup ? 0 : countQuizBannersForSelectedQuiz(state) },
    { key: 'quizCoursePennants', count: isFollowup ? countQuizCoursePennantsForFollowup(state) : 0 },
  ];
  let hasSingleRelevant = false;
  for (const { key, count } of entries) {
    if (count === 1) {
      dispatch(setSingleItemFormFlag({ path: pathname, entityKey: key }));
      if (isSingleItemRelevantForQuizHighlight(action, key, followupId)) {
        hasSingleRelevant = true;
      }
    }
  }
  return hasSingleRelevant;
}

function getSelectedBannerIdsCourse(
  state: RootState,
  action: { payload: { ids: number[]; slideIndex?: number } }
): Set<number> {
  const { course } = state;
  const { ids } = action.payload;

  if (
    highlightCourseBreathSelection.match(action as ReturnType<typeof highlightCourseBreathSelection>) ||
    highlightCoversBreathSelection.match(action as ReturnType<typeof highlightCoversBreathSelection>) ||
    highlightCourseDepthSelection.match(action as ReturnType<typeof highlightCourseDepthSelection>)
  ) {
    return new Set(ids);
  }

  if (
    highlightPennantBreathSelection.match(action as ReturnType<typeof highlightPennantBreathSelection>) ||
    highlightPennantDepthSelection.match(action as ReturnType<typeof highlightPennantDepthSelection>)
  ) {
    const bannerIds = new Set<number>();
    for (const banner of course.banners) {
      const hasSelectedPennant = banner.pennants.some((p) => ids.includes(p.id));
      if (hasSelectedPennant) bannerIds.add(banner.id);
    }
    return bannerIds;
  }

  if (highlightSlideBreathSelection.match(action as ReturnType<typeof highlightSlideBreathSelection>)) {
    const bannerIds = new Set<number>();
    for (const group of course.content as SlideGroup[]) {
      const bannerId = group[0]?.bannerId;
      if (bannerId == null) continue;
      const slides = group.slides ?? [];
      const hasSelectedSlide = slides.some((row) =>
        row.some((slide) => ids.includes(slide.id))
      );
      if (hasSelectedSlide) bannerIds.add(bannerId);
    }
    return bannerIds;
  }

  return new Set(ids);
}

/** Payload shape for tutorial highlight actions (ids only). */
type TutorialHighlightPayload = { ids: number[] };

/** Payload shape for quiz highlight actions (ids). */
type QuizHighlightPayload = { ids: (number | string)[] };

function getSelectedBannerIdsTutorial(
  _state: RootState,
  action: { payload: TutorialHighlightPayload }
): Set<number> {
  return new Set(action.payload.ids);
}

function getSelectedQuizIdsFromAttemptIds(state: RootState, attemptIds: (number | string)[]): Set<number> {
  const selectedQuizIds = new Set<number>();
  for (const quiz of state.quiz.quizzes) {
    const hasSelectedPennant = quiz.pennants.some((p) => attemptIds.includes(p.id));
    const focusKeys = Object.keys(state.quiz.focus ?? {});
    const hasFocusKey = attemptIds.some((id) => typeof id === 'string' && focusKeys.includes(id));
    if (hasSelectedPennant || hasFocusKey) selectedQuizIds.add(quiz.id);
  }
  return selectedQuizIds;
}

function getSelectedIdsQuiz(
  state: RootState,
  action: { payload: QuizHighlightPayload }
): { kind: 'quiz'; ids: Set<number> } | { kind: 'banner'; ids: Set<number> } {
  const payloadIds = action.payload.ids;

  if (
    highlightQuizBreathSelection.match(action as ReturnType<typeof highlightQuizBreathSelection>) ||
    highlightQuizDepthSelection.match(action as ReturnType<typeof highlightQuizDepthSelection>)
  ) {
    return { kind: 'quiz', ids: new Set(payloadIds as number[]) };
  }

  if (
    highlightQuestionBreathSelection.match(action as ReturnType<typeof highlightQuestionBreathSelection>) ||
    highlightQuestionDepthSelection.match(action as ReturnType<typeof highlightQuestionDepthSelection>)
  ) {
    return { kind: 'banner', ids: new Set(payloadIds as number[]) };
  }

  if (highlightAttemptBreathSelection.match(action as ReturnType<typeof highlightAttemptBreathSelection>)) {
    const quizIds = getSelectedQuizIdsFromAttemptIds(state, payloadIds);
    return { kind: 'quiz', ids: quizIds };
  }

  return { kind: 'quiz', ids: new Set(payloadIds as number[]) };
}

/** Payload shape for course highlight actions (ids + optional slideIndex). */
type CourseHighlightPayload = { ids: number[]; slideIndex?: number };

/** When a banner is selected (selected !== -1), dismiss all items *within* that banner except the selected one(s). Returns result of next() if handled, undefined otherwise. */
function dismissItemsWithinSelectedBannerCourse(
  state: RootState,
  action: { payload: CourseHighlightPayload },
  dispatch: (a: ReturnType<typeof dismissCourse> |
    ReturnType<typeof dimissMainslide> |
    ReturnType<typeof dismissSlide> |
    ReturnType<typeof dismissChapter>) => void,
): unknown {
  const { course } = state;
  const selected = course.selected;
  if (selected === -1) return undefined;
  const banner = course.banners[selected];
  if (!banner) return undefined;
  const contentIndex = course.content.findIndex(
    (g: SlideGroup) => (g as SlideGroup)[0]?.bannerId === banner.id
  );
  if (contentIndex === -1) return undefined;
  const group = course.content[contentIndex] as SlideGroup;
  const { slides, ...mainslides } = group;
  const ids = action.payload.ids;
  const chaptersEmpty = !course.chapters || course.chapters.length === 0;
  if (
    highlightSlideBreathSelection.match(action as ReturnType<typeof highlightSlideBreathSelection>) &&
    !chaptersEmpty
  ) {
    const toDismiss: dismissSlidePayload['items'] = [];
    (slides ?? []).forEach((row: { id: number }[], slideIndex: number) => {
      row.forEach((slide: { id: number }) => {
        if (!ids.includes(slide.id)) toDismiss.push({ id: slide.id, slideIndex });
      });
    });
    if (toDismiss.length === 0) return;
    dispatch(dismissSlide({ items: toDismiss }));
    return;
  }

  if (
    chaptersEmpty &&
    highlightCoversBreathSelection.match(action as ReturnType<typeof highlightCoversBreathSelection>)
  ) {
    const mainslideIds: number[] = [];
    Object.values(mainslides).forEach((item: { id?: number }) => {
      if (item && typeof item === 'object' && typeof item.id === 'number') mainslideIds.push(item.id);
    });
    const idsToDismiss = mainslideIds.filter((id) => !ids.includes(id));
    if (idsToDismiss.length === 0) return;
    dispatch(dimissMainslide({ ids: idsToDismiss }));
    return;
  }

  if (
    highlightPennantBreathSelection.match(action as ReturnType<typeof highlightPennantBreathSelection>) ||
    highlightPennantDepthSelection.match(action as ReturnType<typeof highlightPennantDepthSelection>)
  ) {
    const idsToDismiss = banner.pennants.filter((p) => !ids.includes(p.id)).map((p) => p.id);
    if (idsToDismiss.length === 0) return;
    dispatch(dismissChapter({ ids: idsToDismiss }));
    return;
  }

  return undefined;
}

function dismissItemsWithinSelectedBannerTutorial(
  state: RootState,
  action: { payload: TutorialHighlightPayload },
  isShow: boolean,
  dispatch: (a: ReturnType<typeof dismissTutorial>) => void,
): unknown {
  const { tutorial } = state;
  const selected = tutorial.selected;
  if (selected === -1) return undefined;
  const banner = tutorial.banners[selected];
  if (!banner) return undefined;
  type SlideRow = { 0?: { bannerId?: number } };
  const predicate = (slideRow: SlideRow) => slideRow[0]?.bannerId === banner?.id;
  const contIndex = tutorial.content.findIndex((row) => predicate(row as unknown as SlideRow));
  if (contIndex === -1) return undefined;
  const slideRow = tutorial.content[contIndex];
  const ids = action.payload.ids;
  const idsToDismiss = slideRow.filter((slide: { id: number }) => !ids.includes(slide.id)).map((s: { id: number }) => s.id);
  if (idsToDismiss.length === 0) return;
  dispatch(dismissTutorial({ ids: idsToDismiss, isShow }));
  return;
}

function dismissItemsWithinSelectedQuiz(
  state: RootState,
  action: { payload: QuizHighlightPayload },
  dispatch: (a: ReturnType<typeof dismissQuestion>) => void,
): unknown {
  const { quiz } = state;
  const selected = quiz.selected;
  if (selected === -1) return undefined;
  const selectedQuiz = quiz.quizzes[selected];
  if (!selectedQuiz) return undefined;
  const ids = action.payload.ids as number[];
  let idsToDismiss: number[];
  if (quiz.followupId !== undefined) {
    const followupBanner = quiz.banners.find((b) => b.id === quiz.followupId);
    if (!followupBanner) return undefined;
    const pennantIds = followupBanner.pennants.map((p: { id: number }) => p.id);
    idsToDismiss = pennantIds.filter((id) => !ids.includes(id));
  } else {
    const questionBannerIds = quiz.banners
      .filter((b: { bannerId?: number }) => b.bannerId === selectedQuiz.id)
      .map((b: { id: number }) => b.id);
    idsToDismiss = questionBannerIds.filter((id) => !ids.includes(id));
  }
  if (idsToDismiss.length === 0) return;
  dispatch(dismissQuestion({ ids: idsToDismiss }));
  return;
}

function dismissItemsWithinSelectedQuizAttempts(
  state: RootState,
  action: { payload: QuizHighlightPayload },
  dispatch: (a: ReturnType<typeof dismissAttempt>) => void,
): unknown {
  const { quiz } = state;
  const selected = quiz.selected;
  if (selected === -1) return undefined;
  const selectedQuiz = quiz.quizzes[selected];
  if (!selectedQuiz) return undefined;
  const selectedAttemptIds = (action.payload.ids as (number | string)[]).filter(
    (id): id is number => typeof id === 'number'
  );
  const attemptIdsToDismiss = selectedQuiz.pennants
    .filter((p) => !selectedAttemptIds.includes(p.id))
    .map((p) => p.id);
  if (attemptIdsToDismiss.length === 0) return;
  dispatch(dismissAttempt({ ids: attemptIdsToDismiss }));
  return;
}

const DismissAllExceptOne: Middleware<{}, RootState> =
  ({ getState, dispatch }) =>
    (next) =>
      (action) => {
        const state = getState();
        const { authenticated } = state.session;
        const { isUnzipCourses, isUnzipQuizzes, isUnzipTutorials, editMode } = state.settings;
        const isMaximumFeatures = !isUnzipCourses && !isUnzipQuizzes && !isUnzipTutorials;

        if (!authenticated || isMaximumFeatures || !editMode) return next(action);

        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
        const isShow = state.session.dismissals[pathname] ?? false;

        for (const matcher of TUTORIAL_HIGHLIGHT_ACTIONS) {
          if (matcher.match(action)) {
            const hasSingle = setSingleItemFlagsForTutorial(state, pathname, action, dispatch);
            if (hasSingle) return;
            const isTutorialHighlight =
              highlightTutorialBreathSelection.match(action) ||
              highlightTutorialDepthSelection.match(action);
            if (state.tutorial.selected > -1 && !isTutorialHighlight) {
              const result = dismissItemsWithinSelectedBannerTutorial(
                state,
                action as { payload: TutorialHighlightPayload },
                isShow,
                dispatch,
              );
              if (result !== undefined) return result;
            }
            const selectedIds = getSelectedBannerIdsTutorial(state, action);
            const allBanners = state.tutorial.banners;
            const toDismiss = allBanners.filter((b) => !selectedIds.has(b.id));
            if (toDismiss.length === 0) return;
            const anyAlreadyNotIsShow = allBanners.some((b) => b.isDismissed === !isShow);
            const targetIsDismissed = anyAlreadyNotIsShow ? isShow : !isShow;
            const idsToUpdate = anyAlreadyNotIsShow ? allBanners.map((b) => b.id) : toDismiss.map((b) => b.id);
            dispatch(dismissTutorial({ ids: idsToUpdate, isShow, isDismissed: targetIsDismissed }));
            return;
          }
        }

        for (const matcher of COURSE_HIGHLIGHT_ACTIONS) {
          if (matcher.match(action)) {
            const hasSingle = setSingleItemFlagsForCourse(state, pathname, action, dispatch);
            if (hasSingle) return;
            const isCourseHighlight = highlightCourseDepthSelection.match(action) ||
              highlightCourseBreathSelection.match(action);
            if (state.course.selected > -1 && !isCourseHighlight) {
              const result = dismissItemsWithinSelectedBannerCourse(
                state,
                action as { payload: CourseHighlightPayload },
                dispatch,
              );
              if (result !== undefined) return result;
            }
            const selectedIds = getSelectedBannerIdsCourse(state, action);
            const allBanners = state.course.banners;
            const toDismiss = allBanners.filter((b) => !selectedIds.has(b.id));
            if (toDismiss.length === 0) return;
            const anyAlreadyNotIsShow = allBanners.some((b) => b.isDismissed === !isShow);
            const targetIsDismissed = anyAlreadyNotIsShow ? isShow : !isShow;
            const idsToUpdate = anyAlreadyNotIsShow ? allBanners.map((b) => b.id) : toDismiss.map((b) => b.id);
            dispatch(dismissCourse({ ids: idsToUpdate, isShow, isDismissed: targetIsDismissed }));
            return;
          }
        }

        for (const matcher of QUIZ_HIGHLIGHT_ACTIONS) {
          if (matcher.match(action)) {
            const hasSingle = setSingleItemFlagsForQuiz(state, pathname, action, dispatch);
            if (hasSingle) return;
            const isQuizHighlight =
              highlightQuizBreathSelection.match(action) ||
              highlightQuizDepthSelection.match(action);
            if (state.quiz.selected > -1 && !isQuizHighlight) {
              if (
                highlightQuestionBreathSelection.match(action) ||
                highlightQuestionDepthSelection.match(action)
              ) {
                const result = dismissItemsWithinSelectedQuiz(
                  state,
                  action as { payload: QuizHighlightPayload },
                  dispatch,
                );
                if (result !== undefined) return result;
              }
              if (highlightAttemptBreathSelection.match(action)) {
                const result = dismissItemsWithinSelectedQuizAttempts(
                  state,
                  action as { payload: QuizHighlightPayload },
                  dispatch,
                );
                if (result !== undefined) return result;
              }
            }
            const selected = getSelectedIdsQuiz(state, action);
            if (selected.kind === 'quiz') {
              const allQuizzes = state.quiz.quizzes;
              const toDismiss = allQuizzes.filter((q) => !selected.ids.has(q.id));
              if (toDismiss.length === 0) return;
              const anyAlreadyNotIsShow = allQuizzes.some((q) => q.isDismissed === !isShow);
              const idsToUpdate = anyAlreadyNotIsShow ? allQuizzes.map((q) => q.id) : toDismiss.map((q) => q.id);
              dispatch(dismissQuiz({ ids: idsToUpdate }));
              return;
            }
            return;
          }
        }

        return next(action);
      };

export default DismissAllExceptOne;
