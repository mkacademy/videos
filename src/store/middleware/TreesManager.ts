import {
    clearIncoming,
    clearOutgoing,
    eraseIncoming,
    eraseOutgoing,
    IncomingMessage,
    OutgoingMessage
} from "../slices/commsSlice";
import { RootState } from "../types";
import { Middleware } from "@reduxjs/toolkit";
import { eraseDeletedTreeIDs } from "../slices/settingsSlice";
import { FI, instructionTypes } from "../../library/commsUtils";

const treesManager: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
    if (eraseIncoming.match(action)) {
        const state = getState();
        const { incoming } = state.comms;
        const { Ids = [], isShow } = action.payload;
        const filterPred = ({ id, type, isDismissed }: IncomingMessage) => {
            const identifier = id + type;
            return isDismissed === isShow
                && type !== FI
                && (Ids as string[]).includes(identifier);
        };
        const TreeIds = incoming.filter(filterPred);
        if (TreeIds.length > 0) dispatch(eraseDeletedTreeIDs(TreeIds.map(({ id }) => id)));
    } if (eraseOutgoing.match(action)) {
        const state = getState();
        const { outgoing } = state.comms;
        const { Ids = [], isShow } = action.payload;
        const filterPred = ({ id, type, isDismissed }: OutgoingMessage) => {
            const identifier = id + type;
            return isDismissed === isShow
                && !instructionTypes.includes(type)
                && (Ids as string[]).includes(identifier);
        };
        const TreeIds = outgoing.filter(filterPred);
        if (TreeIds.length > 0) dispatch(eraseDeletedTreeIDs(TreeIds.map(({ id }) => id)));
    }
    if (clearIncoming.match(action)) {
        const state = getState();
        const { incoming } = state.comms;
        const undismissed = action.payload;
        const TreeIds = incoming.filter(({ isDismissed, type }) =>
            isDismissed === undismissed && type !== FI);
        if (TreeIds.length > 0) dispatch(eraseDeletedTreeIDs(TreeIds.map(({ id }) => id)));
    }
    if (clearOutgoing.match(action)) {
        const state = getState();
        const { outgoing } = state.comms;
        const undismissed = action.payload;
        const TreeIds = outgoing.filter(({ isDismissed, type }) =>
            isDismissed === undismissed && !instructionTypes.includes(type));
        if (TreeIds.length > 0) dispatch(eraseDeletedTreeIDs(TreeIds.map(({ id }) => id)));
    }
    return next(action);
};

export default treesManager;