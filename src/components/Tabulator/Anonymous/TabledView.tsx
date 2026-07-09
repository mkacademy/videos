import React from "react";
import { Row } from "react-bootstrap";
import TextColumnWrapper from "../Authenticated/private/ColumnGroupers/TextColumnWrapper";
import DescendantsWrapper from "./ColumnsGroupers/DescendantsWrapper";
import DescendentsOutlier from "./ColumnsGroupers/DescendantsOuttlier";
import { IconKey } from "../../../Hooks/useIconsAssembler";
import * as tableView from "../../../styles/tableView.module.css";
import * as indicatorsStyles from "../../../styles/indicators.module.css";
import { ScreenBuilderTypes } from "../../../Hooks/useScreensBuilder";
import { Column, DesktopTable } from "../../../Hooks/useTabulator";

const stylesProps = {
    tablesz: tableView["tablesz"],
    indicators: indicatorsStyles["largeScreenIndicatorsCSS"],
};

interface TableViewProps {
    variables: [Record<string, ScreenBuilderTypes>[], number, (index: number) => void];
    Constraints?: { CSS: () => string, max: number };
    icons: Record<IconKey, string>;
    screenIndex: number;
    padCount: number;
    entity: string;
}

const TabledView: React.FC<TableViewProps> = (props) => {
    const { icons, variables, screenIndex, entity, padCount, Constraints, ...rest } = props;
    return (
        <Row className={stylesProps.tablesz + " " + stylesProps.indicators}>
            <TextColumnWrapper entityName={rest['entityName']} padCount={padCount} />
            <DescendantsWrapper
                icons={icons}
                entity={entity}
                padCount={padCount}
                variables={variables}
                Constraints={Constraints}
                isTablet={screenIndex === 2}
                rest={rest as Column | DesktopTable}
            />
            <DescendentsOutlier
                isDesktop={screenIndex > 2}
                icons={icons}
                entity={entity}
                padCount={padCount}
            />
        </Row>
    );
};

export default TabledView;
