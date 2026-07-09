import React from "react";
import { Row } from "react-bootstrap";
import OrdersAndActions from "./ColumnGroupers/OrdersAndActions";
import ActionsWrapper from "./ColumnGroupers/ActionsWrapper";
import TextColumnWrapper from "./ColumnGroupers/TextColumnWrapper";
import DescendantsAndOrder from "./ColumnGroupers/DescendantsAndOrder";
import DescendantsWrapper from "./ColumnGroupers/DescendantsWrapper";
import { IconKey } from "../../../../Hooks/useIconsAssembler";
import * as tableView from "../../../../styles/tableView.module.css";
import * as indicatorsStyles from "../../../../styles/indicators.module.css";
import { Column, DesktopTable } from "../../../../Hooks/useTabulator";
import { ScreenBuilderTypes } from "../../../../Hooks/useScreensBuilder";

const stylesProps = {
    tablesz: tableView["tablesz"],
    indicators: indicatorsStyles["largeScreenIndicatorsCSS"],
}

interface TableViewProps {
    entity: string;
    Actions?: string;
    padCount: number;
    FlexTable?: string;
    screenIndex: number;
    icons?: Record<IconKey, string>;
    Constraints?: { CSS: () => string, max: number };
    variables?: [Record<string, ScreenBuilderTypes>[], number, (index: number) => void];
}

const TableView: React.FC<TableViewProps> = (props) => {
    const {
        screenIndex,
        padCount,
        variables,
        icons,
        Actions,
        FlexTable,
        entity, Constraints,
        ...rest } = props;

    return (
        <Row className={stylesProps.tablesz + " " + stylesProps.indicators}>
            <TextColumnWrapper
                entityName={rest['entityName']}
                padCount={padCount} />
            <DescendantsWrapper
                icons={icons || {} as Record<IconKey, string>}
                rest={rest as DesktopTable | Column}
                isTablet={screenIndex === 2}
                variables={variables}
                padCount={padCount}
                entity={entity}
                Constraints={Constraints}
            />
            <DescendantsAndOrder
                icons={icons || {} as Record<IconKey, string>}
                isTablet={screenIndex === 2}
                FlexTable={FlexTable}
                padCount={padCount}
                entity={entity}
            />
            <OrdersAndActions
                FlexTable={FlexTable}
                padCount={padCount}
                entity={entity}
            />
            <ActionsWrapper
                padCount={padCount}
                Actions={Actions}
                entity={entity}
            />
        </Row>
    );
};

export default TableView;
