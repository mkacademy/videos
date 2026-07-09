import React, { memo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Table } from "react-bootstrap";
import {
    selectAll,
    unselectAll,
    toggleRow as tabularPicker,
} from "../../../../../store/slices/rowSlice";
import { getAlias } from "../../../../../utils";
import { RootState } from "../../../../../store/types";
import { Row } from "../../../../../store/slices/rowSlice";
import { toggleContent as contentPicker } from "../../../../../store/slices/contentSlice";
import { useVisibleRows, useRenderRows } from "../../../../../Hooks/useTabulatorRows";
import * as styles from "../../../../../styles/TextColWrapper.module.css";
import * as tableView from "../../../../../styles/tableView.module.css";

const stylesProps = {
    TextCol: styles["TextCol"],
    chkbx: tableView["chkbx"],
    datas: styles["datas"],
    padder: styles["padder"],
    hideOverflow: styles["hideOverflow"],
};

interface TextColumnProps {
    title: string;
    padCount: number;
}

interface CheckBoxProps {
    allchecked: boolean;
    allFrozen: boolean;
}

export const calcCheckBoxProps = (visibles: Row[]): CheckBoxProps => {
    const frozens = visibles.reduce((n, { frozen }) => (frozen ? n + 1 : n), 0);
    const chkds = visibles.reduce((n, { checked }) => (checked ? n + 1 : n), 0);
    const hasVisibles = visibles.length > 0;
    const allchecked = chkds === visibles.length && hasVisibles;
    const allFrozen = frozens === visibles.length && hasVisibles;
    return { allchecked, allFrozen };
};

interface TextColumnRowProps {
    row: Row;
    label: string;
    onToggle: (id: string) => void;
}

const TextColumnRow = memo(function TextColumnRow({ row, label, onToggle }: TextColumnRowProps) {
    const { id, checked, frozen } = row;
    const clickhandler = () => onToggle(id);
    const optionalClickHandler = frozen ? undefined : clickhandler;
    return (
        <tr>
            <td className={stylesProps.chkbx}>
                <input
                    type="checkbox"
                    checked={checked}
                    disabled={frozen}
                    onChange={clickhandler}
                />
            </td>
            <td className={stylesProps.hideOverflow} onClick={optionalClickHandler}>
                <div>{label}</div>
            </td>
        </tr>
    );
});

const TextColumn: React.FC<TextColumnProps> = ({ title, padCount }) => {
    const dispatch = useDispatch();
    const texts = useSelector((state: RootState) => state.text);
    const visibles = useVisibleRows();
    const { renderRows } = useRenderRows();
    const { allchecked, allFrozen } = calcCheckBoxProps(visibles);

    const uncheckAll = () => dispatch(unselectAll());
    const checkAll = () => dispatch(selectAll());
    const checkToggler = (payload: string) => {
        dispatch(tabularPicker(payload));
        dispatch(contentPicker(parseInt(payload)));
    };
    const allClickHandler = () => {
        if (!allchecked) checkAll();
        else uncheckAll();
    };

    const name = title.toLowerCase();
    return (
        <Table className={stylesProps["TextCol"]} striped bordered hover size="sm">
            <thead>
                <tr>
                    <th className={stylesProps.chkbx}>
                        <input
                            type="checkbox"
                            disabled={allFrozen}
                            checked={allchecked}
                            onChange={allClickHandler}
                        />
                    </th>
                    <th onClick={allClickHandler}>
                        <div>{getAlias(title)}</div>
                    </th>
                </tr>
            </thead>
            <tbody>
                <React.Fragment>
                    {renderRows.map((row) => (
                        <TextColumnRow
                            key={row.id}
                            row={row}
                            label={texts[row.index]?.[name] ?? ""}
                            onToggle={checkToggler}
                        />
                    ))}
                </React.Fragment>
                <React.Fragment>
                    {renderRows.length - padCount < 0 &&
                        Array.from({ length: Math.abs(renderRows.length - padCount) }).map(
                            (_, i) => (
                                <tr key={i + "placeholder"}>
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

export default TextColumn;
