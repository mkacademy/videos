import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Carousel, Row } from "react-bootstrap";
import TabledView from "./TableView";
import { Tree as entities } from "../../../../utils";
import ContentBanner from "../../../Banners/Screen";
import RoleToggler from "./TableWidgets/RoleToggler";
import TableViewPager from "../../../Pagination/TableViewPager";
import useTabulator from "../../../../Hooks/useTabulator";
import TableConnector from "./TableWidgets/TablesMutator";
import AddAndInvertBtns from "./TableWidgets/AddAndInvertBtns";
import SaveAndResumeBtns from "./TableWidgets/SaveAndResumeBtns";
import { DOWNWARDS, UPWARDS, VIEW_ROWS } from "../../../../utils";
import { clearInteractions } from "../../../../store/slices/interactionSlice";
import { RootState } from "../../../../store/types";
import { fetchRows } from "../../../../library/actions";
import { UseQueryBuilderProps } from "../../../../Hooks/useQueryBuilder";
import { Column, DesktopTable } from "../../../../Hooks/useTabulator";
import { ViewPayload } from "../../../../store/slices/viewSlice";

interface ScreenProps {
  operation: string;
}

function overrideStandard(arr: Column[]): Column[] {
  const uniqueKeys = arr.reduce((p, c) => ({ ...p, ...c }), {});
  return Object.keys(uniqueKeys).reduce(function (previous, key) {
    return [...previous, { [key]: uniqueKeys[key] }];
  }, [] as Column[]);
}

const getColumns = (target: string): Column[] => {
  const standard = entities.getProperty(target, "columns") ?? [];
  const extras = entities.getProperty(target, "private") ?? [];
  return overrideStandard([...standard, ...extras]);
};

const Screen: React.FC<ScreenProps> = ({ operation }) => {
  const dispatch = useDispatch();

  // Individual useSelector hooks for each prop
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const isFetching = useSelector((state: RootState) => state.session.isFetching);
  const padCount = useSelector((state: RootState) => state.session.padCount);
  const isAppend = useSelector((state: RootState) => state.session.isAppend);
  const parent = useSelector((state: RootState) => state.view.parent);

  // Action creators using dispatch
  const interactionsClearer = (payload: boolean) => dispatch(clearInteractions(payload));
  const contentProvider = (payload: ViewPayload) => dispatch(fetchRows(payload));

  const parameters: [boolean, typeof getColumns, string, string, UseQueryBuilderProps] = [
    false,
    getColumns,
    operation,
    "private",
    {
      isAppend,
      defaultTake,
      isTabled: true,
      interactionsClearer,
      contentProvider
    }
  ];

  const { screenIndex, isSmall, isTablet, ...tabulator } = useTabulator(...parameters);

  if (parent === undefined) return <React.Fragment />;
  const { variables, icons, target } = tabulator;
  const [chunks, activeIndex, handleSelect] = variables;
  const { Constraints, desktopTable } = tabulator;

  return (
    <React.Fragment>
      <Row>
        <ContentBanner entity={target} operation={operation} />
      </Row>
      <AddAndInvertBtns entity={target} isMobile={!isTablet} />
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
                screenIndex={screenIndex}
                Constraints={Constraints}
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
      {operation !== VIEW_ROWS && <TableConnector operation={operation} />}
      <SaveAndResumeBtns />
      <RoleToggler isRolePicker={true} />
    </React.Fragment>
  );
};

export default Screen;
