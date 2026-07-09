import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { contentDelay } from '../../constants';
import {
  CoursePennantTreeSelection,
  CourseRootTreeSelection,
  deleteOrphans,
  QuizQuestionTreeSelection,
  QuizRootTreeSelection,
  TutorialRootTreeSelection
} from '../../library/actions';
import {
  COMPLETED_MESSAGE,
  viewRequest,
  cpanelMessage,
} from '../slices/viewSlice';
import { orphansSizeSelected } from '../slices/settingsSlice';
import { mutateOrphans } from '../../library/Thunks';
import { MutateOrphansPayload } from '../../library/types';
import { RootState } from '../types';
import { prependError } from '../slices/errorSlice';
import {
  highlightTutorialBreathSelection,
  highlightTutorialDepthSelection,
} from '../slices/tutorialSlice';
import {
  highlightCourseBreathSelection,
  highlightCourseDepthSelection,
  highlightPennantBreathSelection,
  highlightPennantDepthSelection,
} from '../slices/courseSlice';
import {
  highlightQuestionDepthSelection,
  highlightQuestionBreathSelection,
  highlightQuizBreathSelection,
  highlightQuizDepthSelection,
} from '../slices/quizSlice';

const orphansMessage = "deleting orphans... please wait";

const OrphansManager: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
  if (deleteOrphans.match(action)) {
    const state = getState();
    const { deletedOrphans } = state.settings;
    const { curToken, mutateRole } = state.session;
    const { requestIsProcessing } = state.view;

    if (requestIsProcessing) return next(action);

    if (deletedOrphans > 0) {
      if (curToken && mutateRole) {
        const freight: MutateOrphansPayload = { curToken, mutateRole, limit: deletedOrphans };
        const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
        setTimeout(() => thunkDispatch(mutateOrphans(freight)), contentDelay + 1000);
        return next(viewRequest({
          message: orphansMessage,
          completed: false,
        }));
      } else {
        const error = "authentication tokens are null, cannot delete orphans";
        console.log("error -> " + error + " :");
        return next(action);
      }
    } else {
      const error = "nothing selected hence no orphans records deleted";
      console.log("error -> " + error + " :");
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }
  }

  if (mutateOrphans.fulfilled.match(action)) {
    const state = getState();
    const { message, requestIsProcessing } = state.view;
    if (requestIsProcessing && message === orphansMessage) {
      const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
      setTimeout(() => thunkDispatch(orphansSizeSelected(0)));
      setTimeout(() => next(viewRequest({ completed: true })));
    }
    return next(action);
  }

  if (mutateOrphans.rejected.match(action)) {
    const state = getState();
    console.log("mutateOrphans.rejected.type", action);
    const { message, requestIsProcessing } = state.view;
    if (requestIsProcessing && message === orphansMessage) {
      setTimeout(() => dispatch(prependError('Failed to delete orphans, contact admin')));
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (TutorialRootTreeSelection.match(action)) {
    const { settings: { isBreathSelection, isDepthSelection } } = getState();
    if (isBreathSelection) dispatch(highlightTutorialBreathSelection(action.payload));
    else if (isDepthSelection) dispatch(highlightTutorialDepthSelection(action.payload));
    else dispatch(prependError(' selection type is not set'));
    return next(action);
  }
  if (CourseRootTreeSelection.match(action)) {
    const { settings: { isBreathSelection, isDepthSelection } } = getState();
    if (isBreathSelection) dispatch(highlightCourseBreathSelection(action.payload));
    else if (isDepthSelection) dispatch(highlightCourseDepthSelection(action.payload));
    else dispatch(prependError(' selection type is not set'));
    return next(action);
  }
  if (CoursePennantTreeSelection.match(action)) {
    const { settings: { isBreathSelection, isDepthSelection } } = getState();
    if (isBreathSelection) dispatch(highlightPennantBreathSelection(action.payload));
    else if (isDepthSelection) dispatch(highlightPennantDepthSelection(action.payload));
    else dispatch(prependError(' selection type is not set'));
    return next(action);
  }
  if (QuizRootTreeSelection.match(action)) {
    const { settings: { isBreathSelection, isDepthSelection } } = getState();
    if (isBreathSelection) dispatch(highlightQuizBreathSelection(action.payload));
    else if (isDepthSelection) dispatch(highlightQuizDepthSelection(action.payload));
    else dispatch(prependError(' selection type is not set'));
    return next(action);
  }
  if (QuizQuestionTreeSelection.match(action)) {
    const { settings: { isBreathSelection, isDepthSelection } } = getState();
    if (isBreathSelection) dispatch(highlightQuestionBreathSelection(action.payload));
    else if (isDepthSelection) dispatch(highlightQuestionDepthSelection(action.payload));
    else dispatch(prependError(' selection type is not set'));
    return next(action);
  }
  return next(action);
};
export default OrphansManager;
