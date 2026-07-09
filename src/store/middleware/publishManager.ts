import { Middleware, MiddlewareAPI, Dispatch, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../types';
import { isValidPermission } from '../../utils';
import { COMPLETED_MESSAGE, cpanelMessage, viewRequest } from '../slices/viewSlice';
import { mutateEntity } from '../../library/Thunks';
import { prependError } from '../slices/errorSlice';
import { MutationDataAccumulator } from '../../Hooks/useSaveMutations';
import { approveCourseTrees, approveQuizTrees, approveTutorialTrees, discardPayloads } from '../../library/actions';
import { getFilteredUnzippedTree, getHighlightedTreeIds, TreeCategory } from './HarvestManagerUtils';
import {
  getPublishTutorialPayloads,
  getPublishCoursePayloads,
  getPublishQuizPayloads,
  getPublishApprovalErrorMessage,
} from './publishManagerUtils';
import {
  advancePublishQueue,
  clearPublishQueue,
  enqueuePublishPayloads,
  getPublishProgressMessage,
  getPublishFailureMessage,
  isPublishQueueActive,
  isPublishSession,
} from './publishSaveQueue';

const getTreeCount = (tree: ReturnType<typeof getFilteredUnzippedTree>, category: TreeCategory): number => {
  if (!tree) return 0;
  if (category === 'tutorial') return Object.keys(tree.tutorialTrees).length;
  if (category === 'course') return Object.keys(tree.courseTrees).length;
  return Object.keys(tree.quizTrees).length;
};

const publishManager: Middleware<{}, RootState> = (store: MiddlewareAPI<Dispatch, RootState>) => (next) => (action) => {
  const { dispatch, getState } = store;
  const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;

  const handlePublish = (category: TreeCategory) => {
    const state = getState();
    const { requestIsProcessing } = state.view;
    if (requestIsProcessing) return next(action);

    const { quota, curApp, curToken, curMailer, mutateRole } = state.session;
    const { unzippedTrees, status, connects } = state.settings;
    const validPermission = isValidPermission(connects);
    const { outgoing, incoming } = state.comms;

    const baseMutationDataAccumulator: MutationDataAccumulator = {
      quota,
      curApp,
      curToken,
      curMailer,
      mutateRole: mutateRole || '',
    };

    const unzippedTreesCopy = [...unzippedTrees];
    const poppedValue = unzippedTreesCopy.pop();
    const unzippedTree = getFilteredUnzippedTree(outgoing, incoming, unzippedTreesCopy, poppedValue, category);
    const treeCount = getTreeCount(unzippedTree, category);
    const hasCommsSelection = getHighlightedTreeIds(outgoing, incoming, category).length > 0;

    if (!unzippedTree || treeCount === 0 || (status === undefined && !validPermission)) {
      dispatch(prependError(
        getPublishApprovalErrorMessage(category, unzippedTree, treeCount, status, validPermission, hasCommsSelection),
      ));
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }

    const publishArgs = {
      ima: baseMutationDataAccumulator,
      status,
      visibility: connects,
      ...(category === 'tutorial'
        ? { tts: unzippedTree.tutorialTrees }
        : category === 'course'
          ? { cts: unzippedTree.courseTrees }
          : { qts: unzippedTree.quizTrees }),
    };

    const payloads =
      category === 'tutorial'
        ? getPublishTutorialPayloads(publishArgs as Parameters<typeof getPublishTutorialPayloads>[0])
        : category === 'course'
          ? getPublishCoursePayloads(publishArgs as Parameters<typeof getPublishCoursePayloads>[0])
          : getPublishQuizPayloads(publishArgs as Parameters<typeof getPublishQuizPayloads>[0]);

    const { totalRemaining } = enqueuePublishPayloads(thunkDispatch, payloads, category);

    return next(viewRequest({
      message: getPublishProgressMessage(totalRemaining),
      completed: false,
    }));
  };

  if (approveTutorialTrees.match(action)) return handlePublish('tutorial');
  if (approveCourseTrees.match(action)) return handlePublish('course');
  if (approveQuizTrees.match(action)) return handlePublish('quiz');

  if (mutateEntity.fulfilled.match(action)) {
    const { message, requestIsProcessing } = getState().view;
    if (isPublishSession(message, requestIsProcessing)) {
      if (advancePublishQueue(thunkDispatch)) return next(action);
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (mutateEntity.rejected.match(action)) {
    const { message, requestIsProcessing } = getState().view;
    if (isPublishSession(message, requestIsProcessing)) {
      if (isPublishQueueActive()) clearPublishQueue();
      setTimeout(() => dispatch(prependError(getPublishFailureMessage(message ?? ''))));
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (discardPayloads.match(action)) {
    if (isPublishQueueActive()) clearPublishQueue();
    return next(viewRequest({ completed: true }));
  }

  return next(action);
};

export { isPublishing } from './publishSaveQueue';
export default publishManager;
