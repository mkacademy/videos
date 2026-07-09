import type { UnknownAction } from '@reduxjs/toolkit';
import type { CourseTrees, QuizTrees, TutorialTrees } from './controlPanelUtils';
import { appendWarnings, clearOnlyWarnings, prependError, prependWarning } from '../store/slices/errorSlice';
import type { RootState } from '../store/types';
import {
  buildUnzipQueryValue,
  hasMixedUnzipMailboxes,
  MIXED_UNZIP_MAILBOX_WARNING,
  presentUnzipTreeApps,
} from './unzipQuery';
import {
  buildRandomizedQueryValue,
  linkPairsIncludeQuiz,
  RANDOMIZED_QUERY_PARAM,
} from './randomizedQuery';

type AppName = 'tutorial' | 'course' | 'quiz';

type TreeIdsAppRef = {
  treeIds: number[];
  currentIndex: number;
  lastBannerId: number | null;
};

type LinkPair = {
  treeIdParam: string;
  bannerIdParam: string;
  treeId: number;
  bannerId?: number;
};

const treeIdsByApp: Record<AppName, TreeIdsAppRef> = {
  tutorial: { treeIds: [], currentIndex: 0, lastBannerId: null },
  course: { treeIds: [], currentIndex: 0, lastBannerId: null },
  quiz: { treeIds: [], currentIndex: 0, lastBannerId: null },
};

const paramMap: Record<AppName, { treeIdParam: string; bannerIdParam: string }> = {
  tutorial: { treeIdParam: 'tutorials', bannerIdParam: 'tutorial' },
  course: { treeIdParam: 'courses', bannerIdParam: 'course' },
  quiz: { treeIdParam: 'Quizzes', bannerIdParam: 'quiz' },
};

const HIGHLIGHT_LINK_ERROR =
  'Please open a tutorial, course, or quiz or highlight tutorials, courses, or quizzes that share atleast ONE unzip source to generate a link.';

const getAllCommTreeIds = (
  outgoing: RootState['comms']['outgoing'],
  incoming: RootState['comms']['incoming'],
): number[] => [
  ...new Set([...outgoing.map((msg) => msg.id), ...incoming.map((msg) => msg.id)]),
];

const findTreeIdsForBanner = (
  appName: AppName,
  bannerId: number,
  tutorialTrees: RootState['settings']['TutorialTrees'],
  courseTrees: RootState['settings']['CourseTrees'],
  quizTrees: RootState['settings']['QuizTrees'],
): number[] => {
  const foundTreeIds: number[] = [];
  const trees =
    appName === 'tutorial' ? tutorialTrees : appName === 'course' ? courseTrees : quizTrees;

  for (const [treeIdStr, tree] of Object.entries(trees)) {
    const currentTreeId = parseInt(treeIdStr);
    if (bannerId in tree) foundTreeIds.push(currentTreeId);
    if (tree._orphans?.includes(bannerId)) foundTreeIds.push(currentTreeId);
  }

  return [...new Set(foundTreeIds)];
};

const collectAllIdsFromTutorialTree = (tree: TutorialTrees): Set<number> => {
  const ids = new Set<number>();
  for (const [key, value] of Object.entries(tree)) {
    if (key === '_orphans') {
      value.forEach((id) => ids.add(id));
      continue;
    }
    ids.add(Number(key));
    if (Array.isArray(value)) value.forEach((id) => ids.add(id));
  }
  return ids;
};

const collectAllIdsFromCourseTree = (tree: CourseTrees): Set<number> => {
  const ids = new Set<number>();
  for (const [key, value] of Object.entries(tree)) {
    if (key === '_orphans') {
      (value as number[]).forEach((id) => ids.add(id));
      continue;
    }
    ids.add(Number(key));
    if (typeof value !== 'object' || value === null) continue;
    if ('slideGroupItems' in value && Array.isArray(value.slideGroupItems)) {
      value.slideGroupItems.forEach((id) => ids.add(id));
    }
    for (const [childKey, childValue] of Object.entries(value)) {
      if (childKey === 'slideGroupItems') continue;
      if (childKey === '_orphans') {
        if (Array.isArray(childValue)) childValue.forEach((id) => ids.add(id));
        continue;
      }
      ids.add(Number(childKey));
      if (Array.isArray(childValue)) childValue.forEach((id) => ids.add(id));
    }
  }
  return ids;
};

const collectAllIdsFromQuizTree = (tree: QuizTrees): Set<number> => {
  const ids = new Set<number>();
  for (const [key, value] of Object.entries(tree)) {
    if (key === '_orphans') {
      (value as number[]).forEach((id) => ids.add(id));
      continue;
    }
    ids.add(Number(key));
    if (typeof value !== 'object' || value === null) continue;
    if ('submissions' in value && Array.isArray(value.submissions)) {
      value.submissions.forEach((id) => ids.add(id));
    }
    if ('banners' in value && value.banners) {
      collectAllIdsFromCourseTree(value.banners).forEach((id) => ids.add(id));
    }
  }
  return ids;
};

const collectAllIdsFromTree = (appName: AppName, tree: TutorialTrees | CourseTrees | QuizTrees): Set<number> => {
  if (appName === 'tutorial') return collectAllIdsFromTutorialTree(tree as TutorialTrees);
  if (appName === 'course') return collectAllIdsFromCourseTree(tree as CourseTrees);
  return collectAllIdsFromQuizTree(tree as QuizTrees);
};

const collectHighlightedIdsFromTutorial = (state: RootState['tutorial']): Set<number> => {
  const ids = new Set<number>();
  for (const banner of state.banners) {
    if (banner.isHighlighted) ids.add(banner.id);
  }
  for (const group of state.content) {
    for (const slide of group) {
      if (slide.isHighlighted) ids.add(slide.id);
    }
  }
  return ids;
};

const collectHighlightedIdsFromCourse = (
  banners: RootState['course']['banners'],
  content: RootState['course']['content'],
): Set<number> => {
  const ids = new Set<number>();
  for (const banner of banners) {
    if (banner.isHighlighted) ids.add(banner.id);
    for (const pennant of banner.pennants) {
      if (pennant.isHighlighted) ids.add(pennant.id);
    }
  }
  for (const group of content) {
    for (const slideRow of group.slides ?? []) {
      for (const slide of slideRow) {
        if (slide.isHighlighted) ids.add(slide.id);
      }
    }
    for (const [key, value] of Object.entries(group)) {
      if (key === 'slides') continue;
      if (typeof value === 'object' && value !== null && 'id' in value && 'isHighlighted' in value) {
        if (value.isHighlighted) ids.add(value.id as number);
      }
    }
  }
  return ids;
};

const collectHighlightedIdsFromQuiz = (state: RootState['quiz']): Set<number> => {
  const ids = new Set<number>();
  for (const quiz of state.quizzes) {
    if (quiz.isHighlighted) ids.add(quiz.id);
    for (const pennant of quiz.pennants) {
      if (pennant.isHighlighted) ids.add(pennant.id);
    }
  }
  return collectHighlightedIdsFromCourse(state.banners, state.content);
};

const findTreeIdsContainingId = (
  appName: AppName,
  entityId: number,
  trees: RootState['settings']['TutorialTrees'] | RootState['settings']['CourseTrees'] | RootState['settings']['QuizTrees'],
  sourcePool: Set<number>,
): number[] => {
  const containing: number[] = [];
  for (const [treeIdStr, tree] of Object.entries(trees)) {
    const treeId = Number(treeIdStr);
    if (sourcePool.size > 0 && !sourcePool.has(treeId)) continue;
    if (collectAllIdsFromTree(appName, tree).has(entityId)) {
      containing.push(treeId);
    }
  }
  return containing;
};

const findCommonSourceTreeIds = (
  appName: AppName,
  highlightedIds: Set<number>,
  trees: RootState['settings']['TutorialTrees'] | RootState['settings']['CourseTrees'] | RootState['settings']['QuizTrees'],
  sourcePool: Set<number>,
): number[] => {
  if (highlightedIds.size === 0) return [];

  let common: number[] | null = null;
  for (const id of highlightedIds) {
    const treeIds = findTreeIdsContainingId(appName, id, trees, sourcePool);
    if (treeIds.length === 0) return [];
    common = common === null ? treeIds : common.filter((treeId) => treeIds.includes(treeId));
    if (common.length === 0) return [];
  }
  return common ?? [];
};

const resolveTreeIdFromHighlights = (
  appName: AppName,
  containerHighlights: Set<number>,
  allCommTreeIds: number[],
  trees: RootState['settings']['TutorialTrees'] | RootState['settings']['CourseTrees'] | RootState['settings']['QuizTrees'],
): number | null => {
  if (containerHighlights.size === 0) return null;

  const sourcePool = new Set(allCommTreeIds);
  const candidates = findCommonSourceTreeIds(appName, containerHighlights, trees, sourcePool);
  return candidates.length === 1 ? candidates[0] : null;
};

const appendUnzipParam = (
  url: URL,
  settings: RootState['settings'],
): void => {
  const unzipValue = buildUnzipQueryValue(presentUnzipTreeApps(url.search), {
    tutorial: settings.unzipTutorialsType,
    course: settings.unzipCoursesType,
    quiz: settings.unzipQuizzesType,
  });
  if (unzipValue) url.searchParams.set('unzip', unzipValue);
};

const copyLinkToClipboard = (
  dispatch: (action: UnknownAction) => void,
  pairs: LinkPair[],
  settings: RootState['settings'],
): void => {
  const isDev = window.location.hostname === 'localhost';
  const baseUrl = isDev ? 'http://localhost:3000' : 'https://mkacademy.ca';
  const url = new URL(baseUrl);
  for (const { treeIdParam, bannerIdParam, treeId, bannerId } of pairs) {
    url.searchParams.set(treeIdParam, treeId.toString());
    if (bannerId !== undefined) {
      url.searchParams.set(bannerIdParam, bannerId.toString());
    }
  }
  appendUnzipParam(url, settings);
  if (linkPairsIncludeQuiz(pairs)) {
    url.searchParams.set(RANDOMIZED_QUERY_PARAM, buildRandomizedQueryValue(settings.randomizedType));
  }
  const urlString = url.toString();
  const unzipTypes = {
    tutorial: settings.unzipTutorialsType,
    course: settings.unzipCoursesType,
    quiz: settings.unzipQuizzesType,
  };
  const mixedMailboxes = hasMixedUnzipMailboxes(presentUnzipTreeApps(url.search), unzipTypes);
  navigator.clipboard.writeText(urlString).then(
    () => {
      dispatch(clearOnlyWarnings());
      if (mixedMailboxes) {
        dispatch(appendWarnings(['Link copied to clipboard', MIXED_UNZIP_MAILBOX_WARNING]));
      } else {
        dispatch(prependWarning('Link copied to clipboard'));
      }
    },
    () => dispatch(prependError('Failed to copy link to clipboard')),
  );
};

const buildHighlightFallbackPairs = (state: RootState): LinkPair[] | null => {
  const { tutorial: tutorialSlice, course: courseSlice, quiz: quizSlice, settings, comms } = state;
  const { TutorialTrees: tutorialTrees, CourseTrees: courseTrees, QuizTrees: quizTrees } = settings;
  const allCommTreeIds = getAllCommTreeIds(comms.outgoing, comms.incoming);

  const highlightConfigs: Array<{
    appName: AppName;
    containerHighlights: Set<number>;
    trees: RootState['settings']['TutorialTrees'] | RootState['settings']['CourseTrees'] | RootState['settings']['QuizTrees'];
  }> = [
    {
      appName: 'tutorial',
      containerHighlights: collectHighlightedIdsFromTutorial(tutorialSlice),
      trees: tutorialTrees,
    },
    {
      appName: 'course',
      containerHighlights: collectHighlightedIdsFromCourse(courseSlice.banners, courseSlice.content),
      trees: courseTrees,
    },
    {
      appName: 'quiz',
      containerHighlights: collectHighlightedIdsFromQuiz(quizSlice),
      trees: quizTrees,
    },
  ];

  const hasAnyHighlight = highlightConfigs.some(({ containerHighlights }) => containerHighlights.size > 0);
  if (!hasAnyHighlight) return null;

  const pairs: LinkPair[] = [];
  for (const { appName, containerHighlights, trees } of highlightConfigs) {
    if (containerHighlights.size === 0) continue;

    const treeId = resolveTreeIdFromHighlights(appName, containerHighlights, allCommTreeIds, trees);
    if (treeId === null) return null;

    const params = paramMap[appName];
    pairs.push({ treeIdParam: params.treeIdParam, bannerIdParam: params.bannerIdParam, treeId });
  }

  return pairs.length > 0 ? pairs : null;
};

/** Builds a shareable URL from open tutorial/course/quiz selections and copies it to the clipboard. */
export const dispatchGenerateLink = (
  dispatch: (action: UnknownAction) => void,
  state: RootState,
): void => {
  const { tutorial: tutorialSlice, course: courseSlice, quiz: quizSlice, settings } = state;
  const { TutorialTrees: tutorialTrees, CourseTrees: courseTrees, QuizTrees: quizTrees } = settings;

  const appConfigs: Array<{
    appName: AppName;
    selected: number;
    banners: Array<{ id: number }>;
  }> = [
    { appName: 'tutorial', selected: tutorialSlice.selected, banners: tutorialSlice.banners },
    { appName: 'course', selected: courseSlice.selected, banners: courseSlice.banners },
    { appName: 'quiz', selected: quizSlice.selected, banners: quizSlice.quizzes },
  ];

  const activeApps = appConfigs.filter((c) => c.selected > -1);

  if (activeApps.length === 0) {
    const highlightPairs = buildHighlightFallbackPairs(state);
    if (!highlightPairs) {
      dispatch(prependError(HIGHLIGHT_LINK_ERROR));
      return;
    }
    copyLinkToClipboard(dispatch, highlightPairs, settings);
    return;
  }

  const pairs: LinkPair[] = [];

  for (const { appName, selected, banners } of activeApps) {
    const banner = banners[selected];
    if (!banner) {
      dispatch(prependError(`${appName} at index ${selected} not found.`));
      return;
    }
    const bannerId = banner.id;
    const appRef = treeIdsByApp[appName];

    if (appRef.treeIds.length === 0 || appRef.lastBannerId !== bannerId) {
      appRef.treeIds = findTreeIdsForBanner(appName, bannerId, tutorialTrees, courseTrees, quizTrees);
      appRef.currentIndex = 0;
      appRef.lastBannerId = bannerId;
    }

    if (appRef.treeIds.length === 0) {
      dispatch(prependError(`No TreeID found containing bannerID ${bannerId} in ${appName}.`));
      return;
    }

    let treeId: number;
    if (appRef.currentIndex < appRef.treeIds.length) {
      treeId = appRef.treeIds[appRef.currentIndex];
      appRef.currentIndex += 1;
    } else {
      treeId = appRef.treeIds[appRef.treeIds.length - 1];
    }

    const params = paramMap[appName];
    pairs.push({
      treeIdParam: params.treeIdParam,
      bannerIdParam: params.bannerIdParam,
      treeId,
      bannerId,
    });
  }

  copyLinkToClipboard(dispatch, pairs, settings);
};
