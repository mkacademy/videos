import { Middleware, MiddlewareAPI, Dispatch, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../types';
import { saveCourseTrees, saveQuizTrees, saveTutorialTrees, discardPayloads } from '../../library/actions';
import { COMPLETED_MESSAGE, cpanelMessage, viewRequest } from '../slices/viewSlice';
import { MutationDataAccumulator } from '../../Hooks/useSaveMutations';
import { mutateEntity } from '../../library/Thunks';
import { prependError, prependWarning } from '../slices/errorSlice';
import {
  getInsertCoursePayloads,
  getRemoveCoursePayloads,
  getInsertQuizPayloads,
  getRemoveQuizPayloads,
  getInsertTutorialPayloads,
  getRemoveTutorialPayloads,
  getFilteredUnzippedTree,
  TreeCategory,
} from './HarvestManagerUtils';
import {
  advanceHarvestQueue,
  clearHarvestQueue,
  enqueueHarvestPayloads,
  getHarvestProgressMessage,
  getHarvestFailureMessage,
  isHarvestQueueActive,
  isHarvestSession,
} from './harvestSaveQueue';

const EMPTY_HARVEST_WARNING: Record<TreeCategory, string> = {
  tutorial: 'No tutorials to harvest.',
  course: 'No courses to harvest.',
  quiz: 'No quizzes to harvest.',
};

const NO_HARVEST_MODE_WARNING = 'Choose plant or uproot before harvesting.';

const getTreeCount = (tree: ReturnType<typeof getFilteredUnzippedTree>, category: TreeCategory): number => {
  if (!tree) return 0;
  if (category === 'tutorial') return Object.keys(tree.tutorialTrees).length;
  if (category === 'course') return Object.keys(tree.courseTrees).length;
  return Object.keys(tree.quizTrees).length;
};

const HarvestManager: Middleware<{}, RootState> = (store: MiddlewareAPI<Dispatch, RootState>) => (next) => (action) => {
  const { dispatch, getState } = store;
  const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;

  const handleHarvest = (category: TreeCategory) => {
    const state = getState();
    const { requestIsProcessing } = state.view;
    if (requestIsProcessing) return next(action);

    const { quota, curApp, curToken, curMailer, mutateRole } = state.session;
    const { unzippedTrees, isRemoveTrees, isInsertTrees } = state.settings;
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

    if (!unzippedTree || treeCount === 0) {
      dispatch(prependWarning(EMPTY_HARVEST_WARNING[category]));
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }

    if (!isInsertTrees && !isRemoveTrees) {
      dispatch(prependWarning(NO_HARVEST_MODE_WARNING));
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }

    let totalRemaining = 0;

    if (isRemoveTrees) {
      const removeArgs =
        category === 'tutorial'
          ? { tts: unzippedTree.tutorialTrees, rma: baseMutationDataAccumulator }
          : category === 'course'
            ? { cts: unzippedTree.courseTrees, rma: baseMutationDataAccumulator }
            : { qts: unzippedTree.quizTrees, rma: baseMutationDataAccumulator };
      const removePayloads =
        category === 'tutorial'
          ? getRemoveTutorialPayloads(removeArgs as Parameters<typeof getRemoveTutorialPayloads>[0])
          : category === 'course'
            ? getRemoveCoursePayloads(removeArgs as Parameters<typeof getRemoveCoursePayloads>[0])
            : getRemoveQuizPayloads(removeArgs as Parameters<typeof getRemoveQuizPayloads>[0]);
      const { totalRemaining: remaining } = enqueueHarvestPayloads(thunkDispatch, removePayloads, {
        harvestType: 'uprooting',
        entity: category,
        uprooting: true,
      });
      totalRemaining = remaining;
    }

    if (isInsertTrees) {
      const insertArgs =
        category === 'tutorial'
          ? { tts: unzippedTree.tutorialTrees, ima: baseMutationDataAccumulator }
          : category === 'course'
            ? { cts: unzippedTree.courseTrees, ima: baseMutationDataAccumulator }
            : { qts: unzippedTree.quizTrees, ima: baseMutationDataAccumulator };
      const insertPayloads =
        category === 'tutorial'
          ? getInsertTutorialPayloads(insertArgs as Parameters<typeof getInsertTutorialPayloads>[0])
          : category === 'course'
            ? getInsertCoursePayloads(insertArgs as Parameters<typeof getInsertCoursePayloads>[0])
            : getInsertQuizPayloads(insertArgs as Parameters<typeof getInsertQuizPayloads>[0]);
      const { totalRemaining: remaining } = enqueueHarvestPayloads(thunkDispatch, insertPayloads, {
        harvestType: 'planting',
        entity: category,
        uprooting: false,
      });
      totalRemaining = remaining;
    }

    return next(viewRequest({
      message: getHarvestProgressMessage(totalRemaining),
      completed: false,
    }));
  };

  if (saveTutorialTrees.match(action)) return handleHarvest('tutorial');
  if (saveCourseTrees.match(action)) return handleHarvest('course');
  if (saveQuizTrees.match(action)) return handleHarvest('quiz');

  if (mutateEntity.fulfilled.match(action)) {
    const { message, requestIsProcessing } = getState().view;
    if (isHarvestSession(message, requestIsProcessing)) {
      if (advanceHarvestQueue(thunkDispatch)) return next(action);
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (mutateEntity.rejected.match(action)) {
    const { message, requestIsProcessing } = getState().view;
    if (isHarvestSession(message, requestIsProcessing)) {
      if (isHarvestQueueActive()) clearHarvestQueue();
      setTimeout(() => dispatch(prependError(getHarvestFailureMessage(message ?? ''))));
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (discardPayloads.match(action)) {
    if (isHarvestQueueActive()) clearHarvestQueue();
    return next(viewRequest({ completed: true }));
  }

  return next(action);
};

export { isUprooting } from './harvestSaveQueue';
export default HarvestManager;
