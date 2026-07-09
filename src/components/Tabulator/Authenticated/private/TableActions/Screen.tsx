import React from 'react';
import { BASIC, CHIEF, MOD } from "../../../../../utils";
import { AdminActions } from "./AdminActions";
import { ModeratorActions } from "./ModeratorActions";
import BasicActions, { BasicHeaderActions } from "./BasicActions";
import { ActionItem, Status } from "../../../../../store/slices/actionSlice";
import { Row } from '../../../../../store/slices/rowSlice';
import * as crudstyles from "../../../../../styles/crudsPrActions.module.css";
import * as descendantsWrapper from "../../../../../styles/descendantsWrapper.module.css";
import * as actionsWrapper from "../../../../../styles/actionsWrapper.module.css";
import * as orderAndActions from "../../../../../styles/orderAndActions.module.css";

const stylesProps = {
    actions: crudstyles["actions"],
    actions_: actionsWrapper["actions"],
    actions_2: orderAndActions["actions"],
    horizantolFlex: descendantsWrapper["HorizantolFlex"],
}


interface TableHeaderActionsProps {
    statusToggleAll: (status: Status) => void;
    setStatus: (status: Status) => void;
    statusResetAll: () => void;
    removeAll: () => void;
    roleIndex: number;
    roles: string[];
    entity: string;
    status: Status;
}

interface TableRowActionsProps {
    statusToggler: (status: Status, id: string) => void;
    remover: (id: string) => void;
    statuses: ActionItem[];
    roleIndex: number;
    roles: string[];
    entity: string;
    row: Row;
}

export const TableHeaderActions: React.FC<TableHeaderActionsProps> = ({
    statusToggleAll,
    statusResetAll,
    removeAll,
    setStatus,
    roleIndex,
    entity,
    status,
    roles,
}) => {
    const actions = stylesProps.horizantolFlex + " " +
        stylesProps.actions + " " + stylesProps.actions_ + " " + stylesProps.actions_2;
    return (
        <div className={actions}>
            {roles[roleIndex] === CHIEF ? (
                <AdminActions
                    toggler={(status: Status) => {
                        setStatus(status);
                        statusToggleAll(status);
                    }}
                    deleter={removeAll}
                    status={status}
                    id=""
                />
            ) : roles[roleIndex] === BASIC ? (
                <BasicHeaderActions
                    entity={entity}
                    toggler={(status: Status) => {
                        setStatus({ ...status, owner: false });
                        statusResetAll();
                    }}
                    deleter={removeAll}
                    status={status}
                />
            ) : roles[roleIndex] === MOD ? (
                <ModeratorActions
                    status={status}
                    toggler={(status: Status) => {
                        setStatus(status);
                        statusToggleAll(status);
                    }}
                    id=""
                />
            ) : (
                <h1>{"Error"}</h1>
            )}
        </div>
    );
};

const TableRowActions: React.FC<TableRowActionsProps> = ({
    statusToggler,
    roleIndex,
    statuses,
    remover,
    entity,
    roles,
    row,
}) => {
    const actions = stylesProps.horizantolFlex + " " +
        stylesProps.actions + " " + stylesProps.actions_ + " " + stylesProps.actions_2;
    return (
        <div className={actions}>
            {roles[roleIndex] === CHIEF ? (
                <AdminActions
                    status={statuses[row.index].status}
                    toggler={statusToggler}
                    deleter={remover}
                    id={row.id}
                />
            ) : roles[roleIndex] === BASIC ? (
                <BasicActions
                    status={statuses[row.index].status}
                    toggler={statusToggler}
                    deleter={remover}
                    entity={entity}
                    id={row.id}
                />
            ) : (
                <ModeratorActions
                    status={statuses[row.index].status}
                    toggler={statusToggler}
                    id={row.id}
                />
            )}
        </div>
    );
};

export default TableRowActions;
