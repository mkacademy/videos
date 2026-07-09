import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "react-bootstrap";
import {
    appendRows,
    EntityTypeMap,
    invertSelection,
} from "../../../../../store/slices/rowSlice";
import { appendContent } from "../../../../../store/slices/contentSlice";
import { Tree, getAlias, getInteractionIDs, SUCCESS, incrementID } from "../../../../../utils";
import { RootState } from "../../../../../store/types";
import * as addAndInvertBtnsStyles from "../../../../../styles/AddAndIvertBtns.module.css";
import * as menutagsStyles_ from "../../../../../styles/menutags.module.css";
import { DataRow, Metadata, MockedDataReturn, MockedDataReturnTypes } from "../../../../Core/types";

const stylesProps = {
    container: addAndInvertBtnsStyles["addAndInvertBtns"],
    HorizantolFlex: menutagsStyles_["HorizantolFlex"],
    flexxing: addAndInvertBtnsStyles["flexxing"],
    headerAbove: addAndInvertBtnsStyles["header-above"],
    headerBetween: addAndInvertBtnsStyles["header-between"],
    btnWarning: addAndInvertBtnsStyles["btn-warning"],
    btn: addAndInvertBtnsStyles["btn"],
}

interface AddAndInvertBtnsProps {
    entity: string;
    isMobile?: boolean;
}

const levelize = (unlevelizedstr: string): string => {
    const levelizedStr: string[] = [];
    const odds = ["g", "j", "q", "p"];
    for (let i = 0; i < unlevelizedstr.length; i++) {
        const char = unlevelizedstr.charAt(i);
        const index = odds.findIndex((c) => c === char);
        const c = index > -1 ? char.toUpperCase() : char;
        levelizedStr.push(c);
    }
    return levelizedStr.join("");
};

const AddAndInvertBtns: React.FC<AddAndInvertBtnsProps> = ({
    entity,
    isMobile = false,
}) => {
    const dispatch = useDispatch();

    const texts = useSelector((state: RootState) => state.text);
    const parent = useSelector((state: RootState) => state.view.parent);
    const length = useSelector((state: RootState) => state.session.addCount);
    const IDs = useSelector((state: RootState) => state.view.parentData?.IDs || []);

    const invertor = () => dispatch(invertSelection());

    const appendData = (entity: string, parent: string, payload: DataRow[]) => {
        dispatch(appendRows({ entity: entity as keyof EntityTypeMap, parent, payload, isAppend: true }));
        dispatch(appendContent({ entity, parent, payload, isAppend: true }));
    };

    const add = () => {
        const { parentID, childID } = getInteractionIDs(parent || '', entity || '');

        if (!parentID || !childID) return;
        const nextOrdinal = Math.max(...texts.map((text) => text.metadata?.ordinal ?? 0)) + 1;
        const connections = Tree.getProperty(entity, "connections") ?? [];
        const mockedData = Tree.getProperty(entity, "mockedData");
        const metadatas = Array.from({ length }).map((_, i) => ({
            [childID]: incrementID(),
            ordinal: nextOrdinal + i,
            [parentID]: IDs,
            owner: true,
        }));
        const mockedResults: MockedDataReturn = mockedData?.(metadatas, connections) ?? [];
        const dataRows: DataRow[] = mockedResults.map((row: MockedDataReturnTypes) => ({
            ...row,
            metadata: row.metadata as Metadata,
        }));
        appendData(entity, parent || '', dataRows);
    };

    return (
        <div className={stylesProps.container}>
            <div className={stylesProps.HorizantolFlex + " " + stylesProps.flexxing}>
                {isMobile ? (
                    <React.Fragment>
                        <div className={stylesProps.headerAbove}>
                            <span>{levelize(getAlias(entity))}</span>
                        </div>
                        <Button onClick={invertor} variant="warning" className={stylesProps.btn + " " + stylesProps.btnWarning}>
                            INVERT
                        </Button>
                        <Button variant={SUCCESS} onClick={add} className={stylesProps.btn}>
                            ADD
                        </Button>
                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        <Button onClick={invertor} variant="warning" className={stylesProps.btn + " " + stylesProps.btnWarning}>
                            INVERT
                        </Button>
                        <span className={stylesProps.headerBetween}>{getAlias(entity)}</span>
                        <Button variant={SUCCESS} onClick={add} className={stylesProps.btn}>
                            ADD
                        </Button>
                    </React.Fragment>
                )}
            </div>
        </div>
    );
};

export default AddAndInvertBtns;
