import { Middleware, MiddlewareAPI, Dispatch, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../types';
import {
  saveTutorialOwnership,
  saveCourseOwnership,
  saveQuizOwnership,
  updateOwnerships,
  discardPayloads,
} from '../../library/actions';
import { COMPLETED_MESSAGE, cpanelMessage, viewRequest } from '../slices/viewSlice';
import { MutationDataAccumulator } from '../../Hooks/useSaveMutations';
import { mutateEntity } from '../../library/Thunks';
import { prependError, prependWarning } from '../slices/errorSlice';
import { getFilteredUnzippedTree, TreeCategory } from './HarvestManagerUtils';
import {
  buildOwnershipPayloadsFromSelectedEscrowStash,
  getAssertTutorialPayloads,
  getAssertCoursePayloads,
  getAssertQuizPayloads,
  hasSelectedEscrowStashRows,
  logOwnershipAssertionStats,
} from './ownershipManagerUtils';
import {
  advanceOwnershipQueue,
  clearOwnershipQueue,
  enqueueOwnershipPayloads,
  ensureOwnershipVerified,
  getOwnershipProgressMessage,
  getOwnershipFailureMessage,
  isOwnershipQueueActive,
  isOwnershipSession,
} from './ownershipSaveQueue';

const EMPTY_OWNERSHIP_WARNING: Record<TreeCategory, string> = {
  tutorial: 'No tutorials trees or stash to assert ownership for.',
  course: 'No courses trees or stash to assert ownership for.',
  quiz: 'No quizzes trees or stash to assert ownership for.',
};

const NO_ASSERT_MODE_WARNING = 'Enable assert ownership before saving.';

const getTreeCount = (tree: ReturnType<typeof getFilteredUnzippedTree>, category: TreeCategory): number => {
  if (!tree) return 0;
  if (category === 'tutorial') return Object.keys(tree.tutorialTrees).length;
  if (category === 'course') return Object.keys(tree.courseTrees).length;
  return Object.keys(tree.quizTrees).length;
};

const OwnershipManager: Middleware<{}, RootState> = (store: MiddlewareAPI<Dispatch, RootState>) => (next) => (action) => {
  const { dispatch, getState } = store;
  const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;

  const handleAssertOwnership = (category: TreeCategory) => {
    const state = getState();
    const { requestIsProcessing } = state.view;
    if (requestIsProcessing) return next(action);

    ensureOwnershipVerified(state);

    const { quota, curApp, curToken, curMailer, mutateRole } = state.session;
    const { unzippedTrees, assertOwnership } = state.settings;
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
    const hasTrees = Boolean(unzippedTree && treeCount > 0);
    const hasEscrowStash = hasSelectedEscrowStashRows(state, category);

    if (!hasTrees && !hasEscrowStash) {
      dispatch(prependWarning(EMPTY_OWNERSHIP_WARNING[category]));
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }

    if (assertOwnership === undefined) {
      dispatch(prependWarning(NO_ASSERT_MODE_WARNING));
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }

    const treePayloads = hasTrees
      ? (() => {
        const assertArgs = {
          ima: baseMutationDataAccumulator,
          editable: assertOwnership,
          ...(category === 'tutorial'
            ? { tts: unzippedTree!.tutorialTrees }
            : category === 'course'
              ? { cts: unzippedTree!.courseTrees }
              : { qts: unzippedTree!.quizTrees }),
        };
        return category === 'tutorial'
          ? getAssertTutorialPayloads(assertArgs as Parameters<typeof getAssertTutorialPayloads>[0])
          : category === 'course'
            ? getAssertCoursePayloads(assertArgs as Parameters<typeof getAssertCoursePayloads>[0])
            : getAssertQuizPayloads(assertArgs as Parameters<typeof getAssertQuizPayloads>[0]);
      })()
      : [];

    const stashPayloads = hasEscrowStash
      ? buildOwnershipPayloadsFromSelectedEscrowStash(
        state,
        baseMutationDataAccumulator,
        category,
        assertOwnership
      )
      : [];

    const payloads = [...treePayloads, ...stashPayloads];

    if (payloads.length === 0) {
      dispatch(prependWarning(EMPTY_OWNERSHIP_WARNING[category]));
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }

    logOwnershipAssertionStats(category, assertOwnership, payloads);

    const { totalRemaining } = enqueueOwnershipPayloads(thunkDispatch, payloads, {
      entity: category,
      asserting: assertOwnership,
    });

    return next(viewRequest({
      message: getOwnershipProgressMessage(totalRemaining),
      completed: false,
    }));
  };

  if (saveTutorialOwnership.match(action)) return handleAssertOwnership('tutorial');
  if (saveCourseOwnership.match(action)) return handleAssertOwnership('course');
  if (saveQuizOwnership.match(action)) return handleAssertOwnership('quiz');

  if (updateOwnerships.match(action)) {
    if (advanceOwnershipQueue(thunkDispatch)) return next(action);
    return next(viewRequest({ completed: true }));
  }



  if (mutateEntity.rejected.match(action)) {
    const { message, requestIsProcessing } = getState().view;
    if (isOwnershipSession(message, requestIsProcessing)) {
      if (isOwnershipQueueActive()) clearOwnershipQueue();
      setTimeout(() => dispatch(prependError(getOwnershipFailureMessage(message ?? ''))));
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (discardPayloads.match(action)) {
    if (isOwnershipQueueActive()) clearOwnershipQueue();
    return next(viewRequest({ completed: true }));
  }

  return next(action);
};

export { isAsserting } from './ownershipSaveQueue';
export default OwnershipManager;
