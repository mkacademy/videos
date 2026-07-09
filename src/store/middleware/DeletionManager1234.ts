import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
    finalizeDelete,
    unfinalizeDelete,
    saveCourseEdits,
    saveTutorsEdits,
    saveOutgoingEdits,
    saveTutorialEdits,
    saveIncomingEdits,
    saveQuizEdits,
} from "../../library/actions";
import { DELETE_ROWS, REMOVE_ROWS } from "../../utils";
import responseHandler from "../../library/responseHandler";
import {
    getDeletesFromTutorsStash,
    getDeletesFromIncomingStash,
    getDeletesFromOutgoingStash,
    getDeletesFromTutorialStash,
    getDeletesFromQuizStash,
    getDeletesFromCourseStash
} from "../../library/DeletionManagerUtils";
import { DeleteResponse } from '../../library/DeletionManagerUtils';
import { linkRows as linkRowz, mutateRows as mutateRowz } from '../../library/actions';
import { prependError } from '../slices/errorSlice';
import { shouldSkipSaveEditsEnrichment } from './saveEditsQueue';

const DELETION_GUARD_WARNING =
    'Deletion disabled (Ctrl+Shift+NumpadSubtract on profile B to enable).';

const hasDeleteResponse = (obj: DeleteResponse | {}): obj is DeleteResponse => {
    return obj && typeof obj === 'object' && 'deleted' in obj;
};

const hasStashedDeletes = (freight: DeleteResponse | {}): freight is DeleteResponse =>
    hasDeleteResponse(freight) &&
    Object.values(freight.deleted).some((ids) => ids && ids.length > 0);

/** True when this action would inject stashed deletes or purge rows (same gates as the handlers below). */
const wouldApplyDeletion = (state: RootState, action: unknown): boolean => {
    if (state.view.requestIsProcessing) {
        if (
            saveTutorsEdits.match(action) ||
            saveIncomingEdits.match(action) ||
            saveOutgoingEdits.match(action) ||
            saveTutorialEdits.match(action) ||
            saveQuizEdits.match(action) ||
            saveCourseEdits.match(action)
        ) {
            return false;
        }
    }

    if (saveTutorsEdits.match(action)) {
        return hasStashedDeletes(getDeletesFromTutorsStash(state));
    }

    if (saveIncomingEdits.match(action)) {
        const { payload } = action;
        if (payload === undefined) return false;
        return hasStashedDeletes(getDeletesFromIncomingStash(state));
    }

    if (saveOutgoingEdits.match(action)) {
        return hasStashedDeletes(getDeletesFromOutgoingStash(state));
    }

    if (saveTutorialEdits.match(action)) {
        return hasStashedDeletes(getDeletesFromTutorialStash(state));
    }

    if (saveQuizEdits.match(action)) {
        return hasStashedDeletes(getDeletesFromQuizStash(state));
    }

    if (saveCourseEdits.match(action)) {
        return hasStashedDeletes(getDeletesFromCourseStash(state));
    }

    return false;
};

const DeletionManager: Middleware<{}, RootState> = ({ dispatch, getState }) => {
    return (next) => (action) => {
        const state = getState();
        if (!state.settings.shouldDelete && wouldApplyDeletion(state, action)) {
            dispatch(prependError(DELETION_GUARD_WARNING));
            return next(action);
        }

        if (saveTutorsEdits.match(action)) {
            const state = getState();
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getDeletesFromTutorsStash(state);
            if (!hasStashedDeletes(freight)) return next(saveTutorsEdits({}));
            return next(saveTutorsEdits(freight));
        }

        if (saveIncomingEdits.match(action)) {
            const state = getState();
            const { payload } = action;
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getDeletesFromIncomingStash(state);
            const hasMarked = Boolean(payload?.marked && payload.marked.length > 0);
            const hasDeletes = hasStashedDeletes(freight);
            if (!hasMarked && !hasDeletes && Object.keys(payload).length === 0) {
                return next(saveIncomingEdits({}));
            }
            return next(saveIncomingEdits({
                deleted: {},
                ...(hasStashedDeletes(freight) && { deleted: freight.deleted }),
                ...payload,
            }));
        }

        if (saveOutgoingEdits.match(action)) {
            const state = getState();
            const { payload } = action;
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getDeletesFromOutgoingStash(state);
            const hasSent = payload.sent !== undefined && Object.keys(payload.sent).length > 0;
            if (!hasSent && !hasStashedDeletes(freight)) return next(saveOutgoingEdits({}));
            return next(saveOutgoingEdits({ deleted: {}, ...freight, ...payload }));
        }

        if (saveTutorialEdits.match(action)) {
            const state = getState();
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getDeletesFromTutorialStash(state);
            if (!hasStashedDeletes(freight)) return next(saveTutorialEdits({}));
            return next(saveTutorialEdits(freight));
        }

        if (saveQuizEdits.match(action)) {
            const state = getState();
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getDeletesFromQuizStash(state);
            if (!hasStashedDeletes(freight)) return next(saveQuizEdits({}));
            return next(saveQuizEdits(freight));
        }

        if (saveCourseEdits.match(action)) {
            const state = getState();
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getDeletesFromCourseStash(state);
            if (!hasStashedDeletes(freight)) return next(saveCourseEdits({}));
            return next(saveCourseEdits(freight));
        }

        if (linkRowz.match(action) || mutateRowz.match(action)) {
            const { payload } = action;
            const { route, ...response } = payload;
            if (response.task === DELETE_ROWS || response.task === REMOVE_ROWS) {
                const purgeRows = (purgePayload: string[]) =>
                    dispatch(finalizeDelete({ route: route!, ids: purgePayload }));
                const restoreRows = () =>
                    dispatch(unfinalizeDelete(route!));
                const freight = { purgeRows, restoreRows, response };
                setTimeout(() => responseHandler(freight));
            } else return next(action);
            return next(action);
        }

        return next(action);
    };
};

export default DeletionManager;