import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "react-bootstrap";
import { RootState } from "../../../../../store/types";
import {
    mutateRows,
} from "../../../../../store/slices/sessionSlice";
import {
    mutateEntity,
} from "../../../../../library/Thunks";
import { removeRows } from "../../../../../store/slices/rowSlice";
import useSaveInteractions from "../../../../../Hooks/useSaveInteractions";
import { InteractionOption, saveInteractions } from "../../../../../store/slices/interactionSlice";
import { removeContent } from "../../../../../store/slices/contentSlice";
import * as optionsStyles from "../../../../../styles/options.module.css";
import * as descendantsWrapper from "../../../../../styles/descendantsWrapper.module.css";
import * as descendantsAndOptions from "../../../../../styles/descendantsAndOptions.module.css";
import { MutationDataAccumulator } from "../../../../../Hooks/useSaveMutations";
import { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";

const stylesProps = {
    actions: optionsStyles["actions"],
    actions_: descendantsAndOptions["actions"],
    HorizantolFlex: descendantsWrapper["HorizantolFlex"],
};

interface TableHeaderOptionProps {
    parent: string;
    target: string;
    childID: string;
    parentID: string;
    curMailer: number;
    changes: InteractionOption[];
    setResponses: (updater: (prev: number) => number) => void;
}

const TableHeaderOption: React.FC<TableHeaderOptionProps> = ({
    childID,
    changes,
    parent,
    target,
    parentID,
    curMailer,
    setResponses,
}) => {
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();   

    // Individual useSelector hooks for each prop
    const quota = useSelector((state: RootState) => state.session.quota);
    const parentIds = useSelector((state: RootState) => state.view.keyids);
    const curApp = useSelector((state: RootState) => state.session.curApp);
    const feedback = useSelector((state: RootState) => state.session.report);
    const response = useSelector((state: RootState) => state.session.response);
    const curToken = useSelector((state: RootState) => state.session.curToken);
    const fetchRole = useSelector((state: RootState) => state.session.fetchRole);

    // Dispatch functions
    const persistInteractions = () => {
        dispatch(saveInteractions());
    };

    const purgeInteractions = (payload: string[]) => {
        dispatch(removeContent(payload.map((id) => parseInt(id))));
        dispatch(removeRows(payload));
    };

    const mutateTable = (payload: MutationDataAccumulator | null, init?: string) => {
        if (init) dispatch(mutateRows(init));
        const validPayload = payload && payload !== null;
        if (init !== 'completed' && validPayload) dispatch(mutateEntity(payload));
    };

    // console.log(JSON.stringify(changes, null, 2));
    const params = {
        changes,
        childID,
        immutables: {
            persistInteractions,
            purgeInteractions,
            setResponses,
            mutateTable,
            curMailer,
            parentIds,
            fetchRole,
            parentID,
            response,
            curToken,
            feedback,
            curApp,
            parent,
            target,
            quota,
        }
    };
    const predicate = useSaveInteractions(params);

    return (
        <div className={stylesProps.HorizantolFlex + " " + stylesProps.actions + " " + stylesProps.actions_}>
            <Button
                variant="primary"
                onClick={predicate}
                disabled={changes.length === 0}
            >
                Save
            </Button>
        </div>
    );
};

export default TableHeaderOption;
