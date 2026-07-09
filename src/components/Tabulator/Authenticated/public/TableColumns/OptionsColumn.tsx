import React, { memo, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Table } from "react-bootstrap";
import {
    selectAll,
    unselectAll,
    toggleRow as tabularPicker,
} from "../../../../../store/slices/rowSlice";
import {
    createInteraction,
    deleteInteraction,
    CreateInteractionPayload,
    DeleteInteractionPayload,
} from "../../../../../store/slices/interactionSlice";
import { getInteractionIDs } from "../../../../../utils";
import TableRowOption from "../TableOptions/TableRowOption";
import TableHeaderOption from "../TableOptions/TableHeaderOption";
import { calcCheckBoxProps } from "../../private/TableColumns/TextColumn";
import { toggleContent as contentPicker } from "../../../../../store/slices/contentSlice";
import { RootState } from "../../../../../store/types";
import { useVisibleRows, useRenderRows } from "../../../../../Hooks/useTabulatorRows";
import * as options from "../../../../../styles/options.module.css";
import * as descendantsAndOptions from "../../../../../styles/descendantsAndOptions.module.css";
import * as tableViewStyles from "../../../../../styles/tableView.module.css";

const stylesProps = {
    Options: options["Options"],
    Options_: descendantsAndOptions["Options"],
    chkbx: tableViewStyles["chkbx"],
    padder: options["padder"],
    datas: options["datas"],
};

interface Option {
    owner: boolean | null;
    undone: boolean;
    [key: string]: unknown;
}

interface OptionsColumnProps {
    entity: string;
    padCount: number;
}

const getPlaceholder = (parentID: string): Option => {
    const placeholder: Option = { owner: null, undone: false };
    placeholder[parentID] = null;
    return placeholder;
};

interface OptionsColumnRowProps {
    rowId: string;
    rowNum: number;
    checked: boolean;
    frozen: boolean;
    resolvedOption: Option;
    responses: number;
    parentID: string;
    childID: string;
    clicked: number[];
    onCheck: (id: string) => void;
    create: (payload: CreateInteractionPayload) => void;
    remove: (payload: DeleteInteractionPayload) => void;
}

const OptionsColumnRow = memo(function OptionsColumnRow({
    rowId,
    rowNum,
    checked,
    frozen,
    resolvedOption,
    responses,
    parentID,
    childID,
    clicked,
    onCheck,
    create,
    remove,
}: OptionsColumnRowProps) {
    return (
        <tr>
            <td className={stylesProps.chkbx}>
                <input
                    type="checkbox"
                    disabled={frozen}
                    checked={checked}
                    onChange={() => onCheck(rowId)}
                />
            </td>
            <td>
                <TableRowOption
                    row={rowNum}
                    responses={responses}
                    parentID={parentID}
                    childID={childID}
                    clicked={clicked}
                    options={[]}
                    resolvedOption={resolvedOption}
                    create={create}
                    remove={remove}
                />
            </td>
        </tr>
    );
});

const OptionsColumn: React.FC<OptionsColumnProps> = ({ entity, padCount }) => {
    const dispatch = useDispatch();

    const options = useSelector((state: RootState) => state.interaction.options);
    const clicked = useSelector((state: RootState) => state.interaction.clicked);
    const parentData = useSelector((state: RootState) => state.view.parentData);
    const curMailer = useSelector((state: RootState) => state.session.curMailer);
    const visibles = useVisibleRows();
    const { renderRows } = useRenderRows();

    const creater = (payload: CreateInteractionPayload) => dispatch(createInteraction(payload));
    const deleter = (payload: DeleteInteractionPayload) => dispatch(deleteInteraction(payload));
    const uncheckAll = () => dispatch(unselectAll());
    const checkAll = () => dispatch(selectAll());
    const checkToggler = (payload: string) => {
        dispatch(tabularPicker(payload));
        dispatch(contentPicker(parseInt(payload)));
    };

    const { parent } = parentData || {};
    const changes = options.filter((o) => o.undone);
    const { allchecked, allFrozen } = calcCheckBoxProps(visibles);
    const { parentID, childID } = getInteractionIDs(parent || "", entity);
    const [responses, setResponses] = useState<number>(-1);

    const optionByRow = useMemo(() => {
        const map = new Map<number, Option>();
        if (!childID || !parentID) return map;
        for (const o of options as Option[]) {
            const rowKey = o[childID];
            if (typeof rowKey === "number") map.set(rowKey, o);
        }
        return map;
    }, [options, childID, parentID]);

    if (!parentID || !childID || !parent) return null;
    return (
        <Table className={stylesProps.Options + " " + stylesProps.Options_} striped bordered hover size="sm">
            <thead>
                <tr>
                    <th className={stylesProps.chkbx}>
                        <input
                            type="checkbox"
                            disabled={allFrozen}
                            checked={allchecked}
                            onChange={() => {
                                if (!allchecked) checkAll();
                                else uncheckAll();
                            }}
                        />
                    </th>
                    <th>
                        <TableHeaderOption
                            setResponses={setResponses}
                            parentID={parentID}
                            childID={childID}
                            changes={changes}
                            parent={parent}
                            target={entity}
                            curMailer={curMailer}
                        />
                    </th>
                </tr>
            </thead>
            <tbody>
                <React.Fragment>
                    {renderRows.map((row) => {
                        const rowNum = parseInt(row.id);
                        const resolvedOption =
                            optionByRow.get(rowNum) ?? getPlaceholder(parentID);
                        return (
                            <OptionsColumnRow
                                key={row.id}
                                rowId={row.id}
                                rowNum={rowNum}
                                checked={row.checked}
                                frozen={row.frozen}
                                resolvedOption={resolvedOption}
                                responses={responses}
                                parentID={parentID}
                                childID={childID}
                                clicked={clicked}
                                onCheck={checkToggler}
                                create={creater}
                                remove={deleter}
                            />
                        );
                    })}
                </React.Fragment>
                <React.Fragment>
                    {renderRows.length - padCount < 0 &&
                        Array.from({ length: Math.abs(renderRows.length - padCount) }).map(
                            (_, i) => (
                                <tr key={i}>
                                    <td className={stylesProps.chkbx}></td>
                                    <td className={stylesProps.datas + " " + stylesProps.padder}>{"Padding"}</td>
                                </tr>
                            )
                        )}
                </React.Fragment>
            </tbody>
        </Table>
    );
};

export default OptionsColumn;
