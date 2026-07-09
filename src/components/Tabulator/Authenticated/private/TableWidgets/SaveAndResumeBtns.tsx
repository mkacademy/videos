import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button, Spinner } from 'react-bootstrap';
import {
    unhideRows,
    updateIds,
    removeRows,
    updateOrdinals,
    UpdateOrdinalsPayload,
} from '../../../../../store/slices/rowSlice';
import {
    removeContent,
    unhideContent,
} from '../../../../../store/slices/contentSlice';
import {
    updateStatuses,
    UpdateStatusesPayload,
} from '../../../../../store/slices/actionSlice';
import {
    updateTexts,
    UpdateTextsPayload,
} from '../../../../../store/slices/textSlice';
import {
    mutateRows,
    pauseFetchers,
} from '../../../../../store/slices/sessionSlice';
import { beginQueuedTabulatorSave } from '../../../../../library/actions';
import useSaveMutations, { MutationDataAccumulator } from '../../../../../Hooks/useSaveMutations';
import { contentDelay } from '../../../../../constants';
import { RootState } from '../../../../../store/types';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import * as saveAndResume from '../../../../../styles/saveAndResume.module.css';
import * as styles from '../../../../../styles/descendantsWrapper.module.css';


const stylesProps = {
    container: saveAndResume["container"],
    HorizantolFlex: styles["HorizantolFlex"],
    flexxing: saveAndResume["flexxing"],
    btn: saveAndResume["btn"],
    btnPrimary: saveAndResume["btn-primary"],
    btnWarning: saveAndResume["btn-warning"],
    spinnerBorderSm: saveAndResume["spinner-border-sm"],
}

const COMPLETED = 'completed';

interface SaveAndResumeProps { }

const SaveAndResumeBtns: React.FC<SaveAndResumeProps> = () => {
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();
    // Individual useSelector hooks for each piece of state
    const requestIsProcessing = useSelector((state: RootState) => state.view.requestIsProcessing);
    const mutateRole = useSelector((state: RootState) => state.session.mutateRole);
    const curMailer = useSelector((state: RootState) => state.session.curMailer);
    const pause = useSelector((state: RootState) => state.session.pauseFetchers);
    const parentData = useSelector((state: RootState) => state.view.parentData);
    const curToken = useSelector((state: RootState) => state.session.curToken);
    const response = useSelector((state: RootState) => state.session.report);
    const curApp = useSelector((state: RootState) => state.session.curApp);
    const quota = useSelector((state: RootState) => state.session.quota);
    const statuses = useSelector((state: RootState) => state.action);
    const texts = useSelector((state: RootState) => state.text);
    const rows = useSelector((state: RootState) => state.row);

    // Action dispatchers
    const mutateTable = (payload: MutationDataAccumulator | null, init?: string) => {
        if (init) dispatch(mutateRows(init));
        const validPayload = payload && payload !== null;
        if (init !== 'completed' && validPayload)
            setTimeout(() => dispatch(beginQueuedTabulatorSave(payload)), contentDelay);
    };

    const syncIDs = (payload: string[]) => dispatch(updateIds(payload));
    const resetStatuses = (payload: UpdateStatusesPayload[]) => dispatch(updateStatuses(payload));
    const resetOrdinals = (payload: UpdateOrdinalsPayload[]) => dispatch(updateOrdinals(payload));
    const resetTexts = (payload: UpdateTextsPayload[]) => dispatch(updateTexts(payload));
    const pauseToggler = () => dispatch(pauseFetchers());

    const purgeRows = (payload: string[]) => {
        dispatch(removeContent(payload.map((id) => parseInt(id))));
        dispatch(removeRows(payload));
    };

    const restoreRows = () => {
        dispatch(unhideContent());
        dispatch(unhideRows());
    };

    // Props object for useSaveMutations hook with proper defaults
    const props = {
        mutateTable,
        syncIDs,
        resetStatuses,
        resetOrdinals,
        resetTexts,
        purgeRows,
        restoreRows,
        requestIsProcessing,
        mutateRole: mutateRole || '',
        curMailer,
        pause,
        parentData: parentData || { curApp, IDs: [] },
        curToken: curToken || '',
        response,
        curApp,
        quota,
        statuses,
        texts,
        rows,
    };

    const predicate = useSaveMutations(props);

    return (
        <div className={stylesProps.container}>
            <div className={stylesProps.HorizantolFlex + " " + stylesProps.flexxing}>
                {!requestIsProcessing && response && response !== COMPLETED ? (
                    <Button variant="primary" disabled className={stylesProps.btn + " " + stylesProps.btnPrimary}>
                        <Spinner
                            as="span"
                            size="sm"
                            role="status"
                            animation="border"
                            aria-hidden="true"
                            className={stylesProps.spinnerBorderSm}
                        />
                    </Button>
                ) : (
                    <Button
                        variant="primary"
                        onClick={predicate}
                        disabled={requestIsProcessing}
                        className={stylesProps.btn + " " + stylesProps.btnPrimary}
                    >
                        Save
                    </Button>
                )}
                <Button variant="warning" onClick={pauseToggler} className={stylesProps.btn + " " + stylesProps.btnWarning}>
                    {pause ? "Resume" : "Pause"}
                </Button>
            </div>
        </div>
    );
};

export default SaveAndResumeBtns;

interface SaveAndCancelBtnsProps {
    onCancel: () => void;
    disabled: boolean;
}

export const SaveAndCancelBtns: React.FC<SaveAndCancelBtnsProps> = ({ onCancel, disabled }) => {
    return (
        <div className={stylesProps.container}>
            <div className={stylesProps.HorizantolFlex + " " + stylesProps.flexxing}>
                <Button disabled={disabled}
                    type="submit"
                    variant="primary"
                    className={stylesProps.btn + " " + stylesProps.btnPrimary}>
                    Save
                </Button>
                <Button disabled={disabled}
                    onClick={onCancel}
                    variant="warning"
                    className={stylesProps.btn + " " + stylesProps.btnWarning}>
                    Cancel
                </Button>
            </div>
        </div>
    );
};
