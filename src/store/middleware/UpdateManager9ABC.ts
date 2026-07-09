import { Dispatch, Middleware, PayloadActionCreator, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  stepsCompleted,
  persistSteps,
  saveCourseEdits,
  persistCourses,
  saveOutgoingEdits,
  saveTutorialEdits,
  persistTutorials,
  coursesCompleted,
  tutorialsCompleted,
  saveTutorsEdits,
  saveIncomingEdits,
  saveQuizEdits,
  quizzesCompleted,
  persistQuizzes,
  saveTutorsEditsPayload,
  saveOutgoingEditsPayload,
  saveTutorialEditsPayload,
  saveQuizEditsPayload,
  saveCourseEditsPayload,
  beginQueuedTabulatorSave,
  updateOwnerships,
} from '../../library/actions';
import { viewRequest } from '../slices/viewSlice';
import { linkRows, mutateRows } from '../slices/sessionSlice';
import { contentDelay } from '../../constants';
import { UPDATE_ROWS, editsMessage } from '../../utils';
import {
  getEditsBatchProgressMessage,
  willChunkEditsPayload,
} from '../../library/editSaveChunkUtils';
import {
  isPayloadTooLargeToStringifyError,
  PAYLOAD_TOO_LARGE_TO_STRINGIFY_MESSAGE,
} from '../../library/jsonStringifyUtils';
import {
  getTabulatorBatchProgressMessage,
  tabulatorSaveMessage,
  willChunkTabulatorPayload,
} from '../../library/tabulatorSaveChunkUtils';
import { clearOnlyWarnings, prependError, prependWarning } from '../slices/errorSlice';
import {
  clearEditSavePreparePending,
  markEditSaveBatchDispatched,
  markEditSavePreparePending,
  startEditSaveQueue,
} from './editSaveQueue';
import {
  isSaveEditsQueueActive,
  onSaveEditsItemComplete,
  onSaveEditsItemFailed,
  shouldSkipSaveEditsEnrichment,
} from './saveEditsQueue';
import { clearTabulatorSaveQueue, startTabulatorSaveQueue } from './tabulatorSaveQueue';
import { MutationDataAccumulator } from '../../Hooks/useSaveMutations';
import {
  mutateTutors,
  mutateIncoming,
  mutateOutgoing,
  mutateTutorial,
  mutateQuiz,
  mutateCourse,
} from '../../library/Thunks';
import responseHandler, {
  getEditedType,
} from '../../library/responseHandler';
import { updateSubmitted } from '../../library/quizAttemptManager';
import { Content } from '../slices/tutorialSlice';
import { SlideGroup, Pennant, SlideGroupItem, Banner } from '../slices/courseSlice';
import { Metadata } from '../../components/Core/types';
import { mutateRows as mutateRowz } from '../../library/actions';
import { mutateRows as mutateRowzTexts } from '../slices/sessionSlice';
import { onCancel } from '../../components/Formulator/formulatorUtils';
import { UpdateTextsPayload } from '../slices/textSlice';
import { MutateEntityResponse } from '../../library/types';
import { withTruncatedSaveTitles } from '../../library/DeletionManagerUtils';
import { collectIncomingOrdinals, hasSaveOrdinals } from '../../library/OrdinalsManagerUtils';
import { mutateIncomingPayload } from '../../library/actions';
interface EditableEntity {
  edited?: boolean;
  id: number;
  owner?: boolean;
  metadata?: Metadata | Metadata[];
}

const hasStashedAdds = (added: Record<string, unknown[] | undefined> | undefined): boolean =>
  Boolean(added && Object.values(added).some((ids) => ids && ids.length > 0));

const isOwner = (owner: boolean | undefined, metadata: Metadata | Metadata[] | undefined): boolean =>
  owner ?? Boolean((metadata as Metadata)?.owner || (metadata as Metadata[])?.find(({ owner }) => owner));

const selPred = <T extends EditableEntity>(item: T): boolean =>
  Boolean(item.edited) && item.id > 0 && isOwner(item.owner, item.metadata);

const predicate3 = (rows: Content[]): Content[] => rows.filter(selPred);

const predicate5 = ({ pennants }: Banner): Pennant[] => pennants.filter(selPred);

const predicate4 = ({ slides }: SlideGroup): Content[] =>
  slides.flat().filter(selPred) as Content[];

const predicate2 = ({ slides, ...s }: SlideGroup): SlideGroupItem[] =>
  Object.values(s).filter((item): item is SlideGroupItem =>
    typeof item === 'object' && item !== null && 'id' in item && selPred(item as EditableEntity)
  );

const EDITS_SAVE_PREPARE_WAIT_MSG = 'Preparing batched edit save… please wait.';
const TABULATOR_SAVE_PREPARE_WAIT_MSG = 'Preparing batched tabulator save… please wait.';

const failSaveDueToPayloadSize = (
  dispatch: Dispatch,
  next: (action: unknown) => unknown,
) => {
  clearEditSavePreparePending();
  onSaveEditsItemFailed();
  clearTabulatorSaveQueue();
  dispatch(mutateRows('completed'));
  dispatch(linkRows('completed'));
  dispatch(prependError(PAYLOAD_TOO_LARGE_TO_STRINGIFY_MESSAGE));
  return next(viewRequest({ completed: true }));
};

const shouldBlockSaveEdits = (requestIsProcessing: boolean): boolean =>
  shouldSkipSaveEditsEnrichment(requestIsProcessing);

const getSaveEditsAppLabel = (action: unknown): string => {
  if (saveTutorsEdits.match(action)) return 'tutors';
  if (saveIncomingEdits.match(action)) return 'incoming';
  if (saveOutgoingEdits.match(action)) return 'outgoing';
  if (saveTutorialEdits.match(action)) return 'tutorial';
  if (saveQuizEdits.match(action)) return 'quiz';
  if (saveCourseEdits.match(action)) return 'course';
  return 'unknown';
};

const nothingToSaveWarning = (app: string): string =>
  `${app}: You are all set! Nothing to save.`;

const warnNothingToSave = (
  dispatch: Dispatch,
  next: (action: unknown) => unknown,
  action: unknown,
) => {
  const queueActive = isSaveEditsQueueActive();
  if (!queueActive) dispatch(clearOnlyWarnings());
  dispatch(prependWarning(nothingToSaveWarning(getSaveEditsAppLabel(action))));
  if (queueActive) {
    const shouldComplete = onSaveEditsItemComplete(
      dispatch as ThunkDispatch<RootState, unknown, UnknownAction>,
    );
    if (!shouldComplete) return next(action);
    return next(viewRequest({ completed: true }));
  }
  return next(action);
};

const beginQueuedEditSave = (
  dispatch: Dispatch,
  thunkDispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: () => RootState,
  thunk: Parameters<typeof startEditSaveQueue>[2],
  saves: Parameters<typeof startEditSaveQueue>[3],
  formatter: Parameters<typeof startEditSaveQueue>[4],
  next: (action: unknown) => unknown,
) => {
  const run = () => {
    try {
      const { chunked, totalBatches } = startEditSaveQueue(thunkDispatch, getState, thunk, saves, formatter);
      return next(viewRequest({
        message: chunked ? getEditsBatchProgressMessage(totalBatches) : editsMessage,
        completed: false,
      }));
    } catch (error) {
      if (isPayloadTooLargeToStringifyError(error)) {
        return failSaveDueToPayloadSize(dispatch, next);
      }
      throw error;
    }
  };

  try {
    if (!willChunkEditsPayload(saves, formatter)) {
      return run();
    }
  } catch (error) {
    if (isPayloadTooLargeToStringifyError(error)) {
      return failSaveDueToPayloadSize(dispatch, next);
    }
    throw error;
  }

  dispatch(clearOnlyWarnings());
  dispatch(prependWarning(EDITS_SAVE_PREPARE_WAIT_MSG));
  markEditSavePreparePending();
  setTimeout(() => {
    clearEditSavePreparePending();
    run();
  }, contentDelay);
};

const beginQueuedTabulatorSaveHandler = (
  dispatch: Dispatch,
  thunkDispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: () => RootState,
  payload: MutationDataAccumulator,
  next: (action: unknown) => unknown,
) => {
  const run = () => {
    try {
      const { chunked, totalBatches } = startTabulatorSaveQueue(thunkDispatch, getState, payload);
      return next(viewRequest({
        message: chunked ? getTabulatorBatchProgressMessage(totalBatches) : tabulatorSaveMessage,
        completed: false,
      }));
    } catch (error) {
      if (isPayloadTooLargeToStringifyError(error)) {
        return failSaveDueToPayloadSize(dispatch, next);
      }
      throw error;
    }
  };

  try {
    if (!willChunkTabulatorPayload(payload)) {
      return run();
    }
  } catch (error) {
    if (isPayloadTooLargeToStringifyError(error)) {
      return failSaveDueToPayloadSize(dispatch, next);
    }
    throw error;
  }

  dispatch(clearOnlyWarnings());
  dispatch(prependWarning(TABULATOR_SAVE_PREPARE_WAIT_MSG));
  setTimeout(run, contentDelay);
};

const UpdateManager: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
  const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;

  if (saveTutorsEdits.match(action)) {
    const { payload } = action;
    const state = getState();
    const { tutors } = state.comms;
    const { requestIsProcessing } = state.view;
    const { curToken, mutateRole, quota, curMailer } = state.session;
    const modified = tutors.filter(selPred);

    if (shouldBlockSaveEdits(requestIsProcessing))
      return next(action);

    // Check that at least one of deleted, inserted, or updates is not empty/null
    const hasUpdates = modified.length > 0;
    const hasDeleted = payload?.deleted && Object.keys(payload.deleted).length > 0;
    const hasAdded = hasStashedAdds(payload?.added);
    const hasOrdinals = hasSaveOrdinals(payload?.ordinals);

    if (!hasUpdates && !hasDeleted && !hasAdded && !hasOrdinals) {
      return warnNothingToSave(dispatch, next, action);
    }

    const saves: saveTutorsEditsPayload = {
      ...payload,
      updates: modified,
      formatter: "tutors",
      mutateRole: mutateRole!,
      curToken: curToken!,
      curMailer,
      quota: quota!,
    };
    markEditSavePreparePending();
    setTimeout(() => {
      markEditSaveBatchDispatched();
      thunkDispatch(mutateTutors(saves));
    }, contentDelay + 1000);
    return next(viewRequest({
      message: editsMessage,
      completed: false,
    }));
  }

  if (saveIncomingEdits.match(action)) {
    const { payload } = action;
    const state = getState();
    const { incoming } = state.comms;
    const { requestIsProcessing } = state.view;
    const { curToken, mutateRole, quota } = state.session;
    const curMailer = payload?.curMailer ?? state.comms.tutors.find(({ checked }) => checked)?.id;

    if (shouldBlockSaveEdits(requestIsProcessing)) return next(action);

    const modified = incoming?.filter(({ isModified }) => isModified) ?? [];
    const ordinals = hasSaveOrdinals(payload?.ordinals)
      ? payload!.ordinals
      : collectIncomingOrdinals(state.comms.modifiedOrdinals, incoming);
    const hasUpdates = modified.length > 0;
    const hasDeleted = Boolean(
      payload?.deleted &&
      Object.values(payload.deleted).some((ids) => ids && ids.length > 0),
    );
    const hasMarked = Boolean(payload?.marked && payload.marked.length > 0);
    const hasAdded = hasStashedAdds(payload?.added);
    const hasOrdinals = hasSaveOrdinals(ordinals);

    if (!hasUpdates && !hasDeleted && !hasMarked && !hasAdded && !hasOrdinals) {
      return warnNothingToSave(dispatch, next, action);
    }

    const saves: mutateIncomingPayload = {
      deleted: payload?.deleted ?? {},
      added: payload?.added ?? {},
      ...(hasUpdates && { updates: modified }),
      formatter: 'incoming',
      curToken: payload?.curToken ?? curToken ?? null,
      mutateRole: payload?.mutateRole ?? mutateRole ?? null,
      quota: payload?.quota ?? quota ?? null,
      curMailer: curMailer ?? null,
      ...(hasOrdinals && { ordinals }),
    };

    markEditSavePreparePending();
    setTimeout(() => {
      markEditSaveBatchDispatched();
      thunkDispatch(mutateIncoming(saves));
    }, contentDelay + 1000);
    return next(viewRequest({
      message: editsMessage,
      completed: false,
    }));
  }

  if (saveOutgoingEdits.match(action)) {
    const state = getState();
    const { payload } = action;
    const { outgoing } = state.comms;
    const { requestIsProcessing } = state.view;
    const { curToken, mutateRole, quota, curMailer } = state.session;
    const modified = withTruncatedSaveTitles(outgoing.filter(selPred));

    if (shouldBlockSaveEdits(requestIsProcessing))
      return next(action);

    const hasUpdates = modified.length > 0;
    const hasSent = payload?.sent && Object.keys(payload.sent).length > 0;
    const hasDeleted = payload?.deleted && Object.keys(payload.deleted).length > 0;
    const hasAdded = hasStashedAdds(payload?.added);
    const hasInserted = payload?.inserted && Object.keys(payload.inserted).length > 0;
    const hasOrdinals = hasSaveOrdinals(payload?.ordinals);

    if (!hasUpdates && !hasSent && !hasDeleted && !hasAdded && !hasInserted && !hasOrdinals) {
      return warnNothingToSave(dispatch, next, action);
    }

    const saves: saveOutgoingEditsPayload = {
      ...payload,
      updates: modified,
      formatter: "outgoing",
      mutateRole: mutateRole!,
      curToken: curToken!,
      curMailer,
      quota: quota!,
    };


    return beginQueuedEditSave(dispatch, thunkDispatch, getState, mutateOutgoing, saves, 'outgoing', next);
  }

  if (saveTutorialEdits.match(action)) {
    const routes: NonNullable<saveTutorialEditsPayload['updates']> = {};
    const state = getState();
    const { payload } = action;
    const { requestIsProcessing } = state.view;
    const { banners, content } = state.tutorial;
    const { curToken, mutateRole, quota, curMailer } = state.session;

    const foundationfilters = withTruncatedSaveTitles(banners.filter(selPred));
    const filtersinstructions = withTruncatedSaveTitles(content.map(predicate3).flat());

    if (
      shouldBlockSaveEdits(requestIsProcessing) ||
      (payload === undefined &&
        foundationfilters.length === 0 &&
        filtersinstructions.length === 0
      ))
      return next(action);

    if (foundationfilters.length > 0)
      routes.foundationfilters = foundationfilters;
    if (filtersinstructions.length > 0)
      routes.filtersinstructions = filtersinstructions;

    // Check that at least one of deleted, inserted, or updates is not empty/null
    const hasUpdates = Object.keys(routes).length > 0;
    const hasDeleted = payload?.deleted && Object.keys(payload.deleted).length > 0;
    const hasAdded = hasStashedAdds(payload?.added);
    const hasInserted = payload?.inserted && Object.keys(payload.inserted).length > 0;
    const hasOrdinals = hasSaveOrdinals(payload?.ordinals);

    if (!hasUpdates && !hasDeleted && !hasAdded && !hasInserted && !hasOrdinals) {
      return warnNothingToSave(dispatch, next, action);
    }

    const saves: saveTutorialEditsPayload = {
      ...payload,
      updates: routes,
      formatter: "tutorial",
      curMailer,
      curToken: curToken!,
      mutateRole: mutateRole!,
      quota: quota!,
    };


    return beginQueuedEditSave(dispatch, thunkDispatch, getState, mutateTutorial, saves, 'tutorial', next);
  }

  if (saveQuizEdits.match(action)) {
    const routes: NonNullable<saveQuizEditsPayload['updates']> = {};
    const state = getState();
    const { payload } = action;
    const { requestIsProcessing } = state.view;

    const { quizzes, banners, content } = state.quiz;
    const { curToken, mutateRole, quota, curMailer } = state.session;
    const dashboardsfilters = updateSubmitted(state, dispatch);
    const foundationdashboards = withTruncatedSaveTitles(quizzes.filter(selPred));
    const dashboardssifters = withTruncatedSaveTitles(banners.filter(selPred));
    const siftersfilters = withTruncatedSaveTitles(banners.map(predicate5).flat());
    const siftersinstructions = withTruncatedSaveTitles(content.map(predicate2).flat());
    const filtersinstructions = withTruncatedSaveTitles(content.map(predicate4).flat());

    if (
      shouldBlockSaveEdits(requestIsProcessing) ||
      (payload === undefined &&
        dashboardsfilters.length === 0 &&
        foundationdashboards.length === 0 &&
        dashboardssifters.length === 0 &&
        siftersfilters.length === 0 &&
        siftersinstructions.length === 0 &&
        filtersinstructions.length === 0
      ))
      return next(action);

    if (foundationdashboards.length > 0)
      routes.foundationdashboards = foundationdashboards;
    if (dashboardsfilters.length > 0)
      routes.dashboardsfilters = dashboardsfilters;
    if (dashboardssifters.length > 0)
      routes.dashboardssifters = dashboardssifters;
    if (siftersfilters.length > 0)
      routes.siftersfilters = siftersfilters;
    if (filtersinstructions.length > 0)
      routes.filtersinstructions = filtersinstructions;
    if (siftersinstructions.length > 0)
      routes.siftersinstructions = siftersinstructions;

    // Check that at least one of deleted, inserted, or updates is not empty/null
    const hasUpdates = Object.keys(routes).length > 0;
    const hasDeleted = payload?.deleted && Object.keys(payload.deleted).length > 0;
    const hasAdded = hasStashedAdds(payload?.added);
    const hasInserted = payload?.inserted && Object.keys(payload.inserted).length > 0;
    const hasOrdinals = hasSaveOrdinals(payload?.ordinals);

    if (!hasUpdates && !hasDeleted && !hasAdded && !hasInserted && !hasOrdinals) {
      return warnNothingToSave(dispatch, next, action);
    }

    const saves: saveQuizEditsPayload = {
      ...payload,
      updates: routes,
      formatter: "quiz",
      mutateRole: mutateRole!,
      curToken: curToken!,
      curMailer,
      quota: quota!,
    };


    return beginQueuedEditSave(dispatch, thunkDispatch, getState, mutateQuiz, saves, 'quiz', next);
  }

  if (saveCourseEdits.match(action)) {
    const routes: NonNullable<saveCourseEditsPayload['updates']> = {};
    const state = getState();
    const { payload } = action;
    const { banners, content } = state.course;
    const { requestIsProcessing } = state.view;
    const { curToken, mutateRole, quota, curMailer } = state.session;

    const foundationsifters = withTruncatedSaveTitles(banners.filter(selPred));
    const siftersfilters = withTruncatedSaveTitles(banners.map(predicate5).flat());
    const siftersinstructions = withTruncatedSaveTitles(content.map(predicate2).flat());
    const filtersinstructions = withTruncatedSaveTitles(content.map(predicate4).flat());

    if (
      shouldBlockSaveEdits(requestIsProcessing) ||
      (payload === undefined &&
        siftersfilters.length === 0 &&
        foundationsifters.length === 0 &&
        filtersinstructions.length === 0 &&
        siftersinstructions.length === 0
      ))
      return next(action);

    if (siftersfilters.length > 0)
      routes.siftersfilters = siftersfilters;
    if (foundationsifters.length > 0)
      routes.foundationsifters = foundationsifters;
    if (filtersinstructions.length > 0)
      routes.filtersinstructions = filtersinstructions;
    if (siftersinstructions.length > 0)
      routes.siftersinstructions = siftersinstructions;

    // Check that at least one of deleted, inserted, or updates is not empty/null
    const hasUpdates = Object.keys(routes).length > 0;
    const hasDeleted = payload?.deleted && Object.keys(payload.deleted).length > 0;
    const hasAdded = hasStashedAdds(payload?.added);
    const hasInserted = payload?.inserted && Object.keys(payload.inserted).length > 0;
    const hasOrdinals = hasSaveOrdinals(payload?.ordinals);

    if (!hasUpdates && !hasDeleted && !hasAdded && !hasInserted && !hasOrdinals) {
      return warnNothingToSave(dispatch, next, action);
    }

    const saves: saveCourseEditsPayload = {
      ...payload,
      updates: routes,
      formatter: "course",
      mutateRole: mutateRole!,
      curToken: curToken!,
      curMailer,
      quota: quota!,
    };


    return beginQueuedEditSave(dispatch, thunkDispatch, getState, mutateCourse, saves, 'course', next);
  }

  if (beginQueuedTabulatorSave.match(action)) {
    const state = getState();
    const { requestIsProcessing } = state.view;
    if (requestIsProcessing) return next(action);
    return beginQueuedTabulatorSaveHandler(dispatch, thunkDispatch, getState, action.payload, next);
  }

  if (mutateRowz.match(action)) {
    const { payload } = action;
    const { route, ...response } = payload;
    if (response.task === UPDATE_ROWS) {
      const completedToPersistMap: { [key: string]: PayloadActionCreator<{ id: string; modified: boolean }[]> } = {
        [quizzesCompleted.type]: persistQuizzes,
        [coursesCompleted.type]: persistCourses,
        [tutorialsCompleted.type]: persistTutorials,
        [stepsCompleted.type]: persistSteps,
      };

      const editedType = getEditedType(route);
      const resetTexts = editedType && completedToPersistMap[editedType]
        ? (items: { id: string; modified: boolean }[]) => dispatch(completedToPersistMap[editedType](items))
        : undefined;
      const state = getState();
      const { assertOwnership } = state.settings;
      const resetOwnerships = assertOwnership && route ?
        (ids: string[]) => dispatch(updateOwnerships({ ids, owner: assertOwnership, route })) : undefined;
      setTimeout(() => responseHandler({
        resetTexts,
        response,
        resetOwnerships,
      }));
    }
    return next(action);
  }

  if (mutateRowzTexts.match(action)) {
    const { payload } = action;
    const resetTexts = (p: UpdateTextsPayload[]) =>
      p.forEach(({ id, modified }) => modified === false && onCancel(parseInt(id)));
    setTimeout(() => responseHandler({ resetTexts, response: payload as MutateEntityResponse }));
    return next(action);
  }

  return next(action);
};

export default UpdateManager;