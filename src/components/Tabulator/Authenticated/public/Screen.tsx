import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Carousel, Row } from "react-bootstrap";
import TabledView from "./TableView";
import TableViewPager from "../../../Pagination/TableViewPager";
import ContentBanner from "../../../Banners/Screen";
import useTabulator from "../../../../Hooks/useTabulator";
import { fetchRows } from "../../../../library/actions";
import RoleToggler from "../private/TableWidgets/RoleToggler";
import QueryConnector from "./TableWidgets/ClickAllAndResumeBtns";
import { DOWNWARDS, UPWARDS, VIEW_ROWS, Tree as entities } from "../../../../utils";
import { clearInteractions } from "../../../../store/slices/interactionSlice";
import { RootState } from "../../../../store/types";
import { UseQueryBuilderProps } from "../../../../Hooks/useQueryBuilder";
import { ViewPayload } from "../../../../store/slices/viewSlice";
import { Column, DesktopTable } from "../../../../Hooks/useTabulator";

const getColumns = (target: string): Column[] => {
  const standard = entities.getProperty(target, "columns") || [];
  const extras = entities.getProperty(target, "public") || [];
  return [...standard, ...extras];
};

const Screen: React.FC = () => {
  const dispatch = useDispatch();
  
  // Individual useSelector calls for each prop
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const isFetching = useSelector((state: RootState) => state.session.isFetching);
  const padCount = useSelector((state: RootState) => state.session.padCount);
  const isAppend = useSelector((state: RootState) => state.session.isAppend);
  const parent = useSelector((state: RootState) => state.view.parent);
  const isTabled = true;

  // Action dispatchers
  const interactionsClearer = (payload: boolean) => dispatch(clearInteractions(payload));
  const contentProvider = (payload: ViewPayload) => dispatch(fetchRows(payload));

  const props = {
    defaultTake,
    isFetching,
    padCount,
    isAppend,
    parent,
    isTabled,
    interactionsClearer,
    contentProvider,
  };

  const parameters: [boolean, typeof getColumns, string, string, UseQueryBuilderProps] = [
    true,
    getColumns,
    VIEW_ROWS,
    "public",
    props,
  ];
  
  const tabulator = useTabulator(...parameters);

  if (parent === undefined) return <React.Fragment />;
  const { screenIndex, variables, icons, isSmall } = tabulator;
  const { Constraints, desktopTable, target } = tabulator;
  const [chunks, activeIndex, handleSelect] = variables;

  return (
    <React.Fragment>
      <Row>
        <ContentBanner entity={target} operation={VIEW_ROWS} />
      </Row>
      <TableViewPager operation={UPWARDS} isLoading={isFetching} icons={icons} />
      {!isSmall ? (
        <Carousel
          indicatorLabels={chunks.map(() => 'carousel-indicator')}
          activeIndex={activeIndex}
          onSelect={handleSelect}
          controls={false}
          interval={null}
          touch={false}
          slide={false}
        >
            {chunks.length > 0 && (
            <Carousel.Item key={activeIndex}>
              <TabledView
                Constraints={Constraints}
                screenIndex={screenIndex}
                variables={variables}
                {...(chunks[activeIndex] as Column)}
                padCount={padCount}
                entity={target}
                icons={icons}
              />
            </Carousel.Item>
          )}
        </Carousel>
      ) : (
        <TabledView
          icons={icons}
          entity={target}
          padCount={padCount}
          variables={variables}
          screenIndex={screenIndex}
          Constraints={Constraints}
          {...desktopTable as DesktopTable}
        />
      )}
      <TableViewPager operation={DOWNWARDS} isLoading={isFetching} icons={icons} />
      <RoleToggler isRolePicker={false} />
      <QueryConnector />
    </React.Fragment>
  );
};

export default Screen;
