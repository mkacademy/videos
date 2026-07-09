import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
    finalizeAdd,
    unfinalizeAdd,
    saveCourseEdits,
    saveTutorsEdits,
    saveOutgoingEdits,
    saveTutorialEdits,
    saveIncomingEdits,
    saveQuizEdits,
} from "../../library/actions";
import { ADD_ROWS } from "../../utils";
import responseHandler from "../../library/responseHandler";
import {
    getAddsFromTutorsStash,
    getAddsFromIncomingStash,
    getAddsFromOutgoingStash,
    getAddsFromTutorialStash,
    getAddsFromQuizStash,
    getAddsFromCourseStash,
    excludeAddsCollidingWithDeletes,
    AddResponse,
    AddedItem,
    DeletedItem,
} from "../../library/DeletionManagerUtils";
import { linkRows as linkRowz } from '../../library/actions';
import { shouldSkipSaveEditsEnrichment } from './saveEditsQueue';

const hasAddResponse = (obj: AddResponse | {}): obj is AddResponse => {
    return obj && typeof obj === 'object' && 'added' in obj;
};

const hasStashedAdds = (freight: AddResponse | {}): freight is AddResponse =>
    hasAddResponse(freight) &&
    Object.values(freight.added).some((ids) => ids && ids.length > 0);

const hasNonEmptyAdded = (added: Record<string, AddedItem[]>) =>
    Object.values(added).some((ids) => ids && ids.length > 0);

const getDeletedFromPayload = (
    payload: { deleted?: Record<string, DeletedItem[]> } | undefined | null
): Record<string, DeletedItem[]> =>
    (payload?.deleted as Record<string, DeletedItem[]> | undefined) ?? {};

const prepareAdded = (freight: AddResponse, payload: unknown) =>
    excludeAddsCollidingWithDeletes(
        freight.added,
        getDeletedFromPayload(payload as { deleted?: Record<string, DeletedItem[]> } | undefined)
    );

const AdditionManager: Middleware<{}, RootState> = ({ dispatch, getState }) => {
    return (next) => (action) => {
        if (saveTutorsEdits.match(action)) {
            const state = getState();
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getAddsFromTutorsStash(state);
            if (!hasStashedAdds(freight)) return next(action);
            const { payload } = action;
            const added = prepareAdded(freight, payload);
            if (!hasNonEmptyAdded(added)) return next(action);
            return next(saveTutorsEdits({
                ...payload,
                added,
            }));
        }

        if (saveIncomingEdits.match(action)) {
            const state = getState();
            const { payload } = action;
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getAddsFromIncomingStash(state);
            if (!hasStashedAdds(freight)) return next(action);
            const added = prepareAdded(freight, payload);
            if (!hasNonEmptyAdded(added)) return next(action);
            return next(saveIncomingEdits({
                ...payload,
                added,
            }));
        }

        if (saveOutgoingEdits.match(action)) {
            const state = getState();
            const { payload } = action;
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getAddsFromOutgoingStash(state);
            if (!hasStashedAdds(freight)) return next(action);
            const added = prepareAdded(freight, payload);
            if (!hasNonEmptyAdded(added)) return next(action);
            return next(saveOutgoingEdits({ ...freight, ...payload, added }));
        }

        if (saveTutorialEdits.match(action)) {
            const state = getState();
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getAddsFromTutorialStash(state);
            if (!hasStashedAdds(freight)) return next(action);
            const { payload } = action;
            const added = prepareAdded(freight, payload);
            if (!hasNonEmptyAdded(added)) return next(action);
            return next(saveTutorialEdits({
                ...payload,
                added,
            }));
        }

        if (saveQuizEdits.match(action)) {
            const state = getState();
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getAddsFromQuizStash(state);
            if (!hasStashedAdds(freight)) return next(action);
            const { payload } = action;
            const added = prepareAdded(freight, payload);
            if (!hasNonEmptyAdded(added)) return next(action);
            return next(saveQuizEdits({
                ...payload,
                added,
            }));
        }

        if (saveCourseEdits.match(action)) {
            const state = getState();
            const { requestIsProcessing } = state.view;
            if (shouldSkipSaveEditsEnrichment(requestIsProcessing)) return next(action);
            const freight = getAddsFromCourseStash(state);
            if (!hasStashedAdds(freight)) return next(action);
            const { payload } = action;
            const added = prepareAdded(freight, payload);
            if (!hasNonEmptyAdded(added)) return next(action);
            return next(saveCourseEdits({
                ...payload,
                added,
            }));
        }

        if (linkRowz.match(action)) {
            const { payload } = action;
            const { route, ...response } = payload;
            if (response.task === ADD_ROWS) {
                const purgeRows = (purgePayload: string[]) =>
                    dispatch(finalizeAdd({ route: route!, ids: purgePayload }));
                const restoreRows = () =>
                    dispatch(unfinalizeAdd(route!));
                const freight = { purgeRows, restoreRows, response };
                setTimeout(() => responseHandler(freight));
            } else return next(action);
            return next(action);
        }

        return next(action);
    };
};

export default AdditionManager;
