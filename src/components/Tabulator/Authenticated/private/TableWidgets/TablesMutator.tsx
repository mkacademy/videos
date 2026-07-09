import React, { MouseEventHandler } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    linkRows as pleaseWait,
} from '../../../../../store/slices/sessionSlice';
import {
    setFoundationRows, matchKeyId
} from '../../../../../library/actions';
import { mutateEntity } from '../../../../../library/Thunks';
import {
    updateRowMetadata,
} from '../../../../../store/slices/textSlice';
import { contentDelay } from '../../../../../constants';
import { ADD_ROWS } from '../../../../../utils';
import useSaveLinkToParent, { UpdateSelectedParams } from '../../../../../Hooks/useSaveLinkToParent';
import { appendContentMetadataIds } from '../../../../../store/slices/contentSlice';
import { RootState } from '../../../../../store/types';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { MutationDataAccumulator } from '../../../../../Hooks/useSaveMutations';
import * as styles from '../../../../../styles/tablesConnector.module.css';


const stylesProps = {
    tablesConnector: styles["tablesConnector"],
}

const redc = (p: string, c: string): string => p + "|" + c;

interface TablesMutatorProps {
    operation: string;
}

const TablesMutator: React.FC<TablesMutatorProps> = ({ operation }) => {
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();

    // Using individual useSelector hooks as requested
    const curMailer = useSelector((state: RootState) => state.session.curMailer);
    const mutateRole = useSelector((state: RootState) => state.session.fetchRole);
    const parentData = useSelector((state: RootState) => state.view.parentData);
    const indeces = useSelector((state: RootState) => state.view.parentIndeces);
    const response = useSelector((state: RootState) => state.session.response);
    const curToken = useSelector((state: RootState) => state.session.curToken);
    const curApp = useSelector((state: RootState) => state.session.curApp);
    const quota = useSelector((state: RootState) => state.session.quota);
    const rows = useSelector((state: RootState) => state.row);

    // Return early if required data is not available
    if (!parentData || quota === undefined || !mutateRole) {
        return null;
    }

    // Create props object to match the original structure
    const props = {
        curMailer,
        mutateRole,
        parentData,
        indeces,
        response,
        curToken,
        curApp,
        quota,
        rows,
        operation,
        mutateTable: (payload: MutationDataAccumulator) => {
            dispatch(pleaseWait('pending'));
            setTimeout(() => dispatch(mutateEntity(payload)), contentDelay);
        },
        updateSelected: (payload: UpdateSelectedParams) => {
            dispatch(updateRowMetadata(payload));
            dispatch(appendContentMetadataIds(payload));
        },
        upadteFoundation: (payload: { operation: string }) => dispatch(setFoundationRows(payload)),
        freezeSelected: (parentId: string) => dispatch(matchKeyId(parentId)),
    };

    const {
        callback,
        target,
        parents,
        parentEntity,
        response: hookResponse,
        operation: hookOperation,
    } = useSaveLinkToParent(props);

    const isFoundation = parentEntity.toLowerCase() === "foundation";

    // Type the callback correctly for React MouseEvent
    const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
        callback(event.nativeEvent);
    };

    return isFoundation || parents.length > 0 ? (
        <div className={stylesProps.tablesConnector}>
            {hookResponse === 'pending' ? (
                <span>Please wait</span>
            ) : hookOperation === ADD_ROWS ? (
                <Link to="#" onClick={handleClick}>
                    {`Add selected ${target} to ${!isFoundation ? parents.reduce(redc, "") : "foundation"}`}
                </Link>
            ) : (
                <Link to="#" onClick={handleClick}>
                    {`Remove  selected ${target} from ${!isFoundation ? parents.reduce(redc, "") : "foundation"}`}
                </Link>
            )}
        </div>
    ) : (
        <div className={stylesProps.tablesConnector}>
            {hookOperation === ADD_ROWS ? (
                <span>{`Select ${parentEntity} to add ${target}`}</span>
            ) : (
                <span>{`Select ${parentEntity} to remove ${target}`}</span>
            )}
        </div>
    );
};

export default TablesMutator;
