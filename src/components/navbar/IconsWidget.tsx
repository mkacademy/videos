import React from "react";
import { Image } from "react-bootstrap";
const lockIMG = new URL("../../Images/lock.png", import.meta.url).href;
import {
    Tree,
    getEntityFromUrl,
    cookIngredients,
    getEntity,
    CookIngredientsProps
} from "../../utils";
import { ParentData } from "../../store/slices/viewSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { IconKey } from "../../Hooks/useIconsAssembler";
import { DataRow } from "../Core/types";
import * as styles from "../../styles/iconsWidgets.module.css";
import * as pagerStyles from "../../styles/TableViewPager.module.css";
import * as instructionStyles from "../../styles/instruction.module.css";
import * as commsStyles from "../../styles/avatar.module.css";
import { InitLoadingPayload } from "../../library/actions";

const stylesProps = {
    queued: styles["queued"],
    stacked: styles["stacked"],
    widget: pagerStyles["widget"],
    container: styles["container"],
    dimensions: styles["dimensions"],
    previewqwidget: commsStyles["widget"],
    previewqdimensions: commsStyles["dimensions"],
    widgetinstruction: instructionStyles["widget"],
    inlinecontraints: pagerStyles["inlinecontraints"],
    dimensionsinstruction: instructionStyles["dimensions"],
    previewqinlinecontraints: commsStyles["inlinecontraints"],
    inlinecontraintsinstruction: instructionStyles["inlinecontraints"],
};

interface IconsWidgetProps {
    data?: DataRow;
    curApp: number;
    inline?: boolean;
    defaultTake?: number;
    icons?: Record<IconKey, string>;
    preserveIngredients: (ingredients: InitLoadingPayload) => void;
}

export default function IconsWidget({
    data,
    icons,
    inline,
    curApp,
    defaultTake,
    preserveIngredients,
}: IconsWidgetProps): React.ReactElement {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const entity: string = getEntityFromUrl(pathname);
    const parentData: ParentData = data
        ? {
            IDs: [data.id.toString()],
            parent: entity,
            curApp,
        }
        : {
            parent: entity,
            curApp: 0,
            IDs: [],
        };
    const widgetClasses: string = stylesProps.widget + " " + stylesProps.widgetinstruction + " " + stylesProps.previewqwidget;
    const inlineClasses: string = stylesProps.inlinecontraints + " " + stylesProps.inlinecontraintsinstruction + " " + stylesProps.previewqinlinecontraints;
    const classes: string = inline ? widgetClasses + " " + inlineClasses : stylesProps.widget + " " + 'contraints';
    const reducedIcons: { [key: string]: string } = icons && !Array.isArray(icons) ? icons : {};
    const connections: string[] = Tree.getProperty(entity, "unlocked") || [];

    return (
        <div className={stylesProps.container + (inline ? " " + stylesProps.queued : " " + stylesProps.stacked) + " " + classes}>
            {Object.keys(reducedIcons).map((key: string) => {
                const tittle: string = getEntity(key);
                const isAllowed: boolean = connections.indexOf(tittle) > -1;
                return (
                    <Image
                        key={key}
                        className={stylesProps.dimensions + " " + stylesProps.dimensionsinstruction + " " + stylesProps.previewqdimensions + " " + stylesProps.previewqwidget}
                        src={isAllowed ? reducedIcons[key] : lockIMG}
                        onClick={
                            isAllowed
                                ? (e: React.MouseEvent<HTMLImageElement>) => {
                                    e.preventDefault();
                                    const ingredients: CookIngredientsProps = {
                                        entity: tittle,
                                        search: undefined,
                                        defaultTake,
                                        parentData,
                                    };
                                    const spread = cookIngredients(ingredients);
                                    if (spread) {
                                        ingredients.search = spread.pfx;
                                        ingredients.prefix = spread.pfx;
                                        preserveIngredients(ingredients);
                                        navigate(spread.url);
                                    }
                                }
                                : undefined
                        }
                    />
                );
            })}
        </div>
    );
}
