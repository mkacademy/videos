import React from 'react';
import { Row } from 'react-bootstrap';
import TextColumnWrapper from '../private/ColumnGroupers/TextColumnWrapper';
import DescendantsWrapper from './ColumnGroupers/DescendantsWrapper';
import DescendantsAndOptions from './ColumnGroupers/DescendantsAndOptions';
import { IconKey } from '../../../../Hooks/useIconsAssembler';
import * as tableView from '../../../../styles/tableView.module.css';
import * as indicatorsStyles from '../../../../styles/indicators.module.css';
import { Column, DesktopTable } from '../../../../Hooks/useTabulator';
import { ScreenBuilderTypes } from '../../../../Hooks/useScreensBuilder';

const stylesProps = {
    tablesz: tableView["tablesz"],
    indicators: indicatorsStyles["largeScreenIndicatorsCSS"],
}

interface TableViewProps {
    Actions?: string;
    icons: Record<IconKey, string>;
    variables: [Record<string, ScreenBuilderTypes>[], number, (index: number) => void];
    Constraints?: { CSS: () => string, max: number };
    screenIndex: number;
    padCount: number;
    entity: string;
}

const TableView: React.FC<TableViewProps> = (props) => {
    const { icons, Actions, variables, screenIndex, padCount, Constraints, entity, ...rest } = props;

    return (
        <Row className={stylesProps.tablesz + " " + stylesProps.indicators}>
            <TextColumnWrapper entityName={rest['entityName']} padCount={padCount}/>
            <DescendantsWrapper
                icons={icons || {} as Record<IconKey, string>}
                rest={rest as DesktopTable | Column}
                isTablet={screenIndex === 2}
                variables={variables}
                entity={entity}
                padCount={padCount}
                Constraints={Constraints}
            />
            <DescendantsAndOptions
                icons={icons || {} as Record<IconKey, string>}
                isDesktop={screenIndex > 2}
                padCount={padCount}
                Actions={Actions}
                entity={entity}
            />
        </Row>
    );
};

export default TableView;
