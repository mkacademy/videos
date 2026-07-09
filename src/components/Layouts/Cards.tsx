import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Row, Col } from "react-bootstrap";
import ContentBanner from "../Banners/Screen";
import TableViewPager from "../Pagination/TableViewPager";
import useDbQuery, { UseQueryBuilderProps } from "../../Hooks/useQueryBuilder";
import { viewPayload as escrowPayload, ViewPayload } from "../../store/slices/viewSlice";
import { fetchContents } from "../../library/actions";
import { clearInteractions } from "../../store/slices/interactionSlice";
import DataNotAvailable from "../views/404";
import useMenuBuilder, { useIconsPicker } from "../../Hooks/useIconsAssembler";
import { capitalizeFirstLetter, timeout, getAlias, DOWNWARDS, UPWARDS } from "../../utils";
import RoleToggler from "../Tabulator/Authenticated/private/TableWidgets/RoleToggler";
import { RootState } from "../../store/types";
import * as styles404 from "../../styles/404.module.css";
import * as stylesInstructions from "../../styles/instructions.module.css";
import * as commsStyles from "../../styles/avatar.module.css";
import { DataRow } from "../Core/types";

const stylesProps = {
  stylesheet: stylesInstructions["stylesheet"],
  avatar: commsStyles["avatar"],
};

interface CardsProps {
  children?: React.ReactNode;
  prefix?: string;
}

const getToUnderboss = (prefix: string | undefined, entity: string): string => {
  if (prefix === undefined) return entity;
  switch (prefix.toLowerCase()) {
    case "lower":
      return "lowerunderbosses";
    case "higher":
      return "higherunderbosses";
    default:
      return "underbosses";
  }
};

const Cards: React.FC<CardsProps> = ({
  children,
  prefix,
}) => {
  const dispatch = useDispatch();

  // Individual useSelector hooks for each prop
  const parent = useSelector((state: RootState) => state.view.parent);
  const isAppend = useSelector((state: RootState) => state.session.isAppend);
  const isRetrying = useSelector((state: RootState) => state.view.isFetching);
  const operation = useSelector((state: RootState) => state.session.operation);
  const isFetching = useSelector((state: RootState) => state.session.isFetching);
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const scalarValue = useSelector((state: RootState) =>
    state.content.filter((row: DataRow) => !row.deleted).length
  );

  // Dispatch actions
  const interactionsClearer = (payload: boolean) => dispatch(clearInteractions(payload));
  const contentProvider = (payload: ViewPayload) => dispatch(fetchContents(payload));
  const cachePayload = (payload: ViewPayload) => dispatch(escrowPayload(payload));

  // Construct proper props for useDbQuery
  const queryBuilderProps: UseQueryBuilderProps = {
    isTabled: false,
    isAppend,
    defaultTake,
    contentProvider,
    interactionsClearer,
  };

  // Move all hooks to the top before any conditional logic
  const rawEntity = useDbQuery(queryBuilderProps, operation);
  const entity = getToUnderboss(prefix, rawEntity);
  const icons = useIconsPicker(useMenuBuilder(entity), true);

  // Now handle conditional logic after all hooks are called
  if (parent === undefined) return <React.Fragment />;

  setTimeout(() => cachePayload({ entity, icons }), 0);

  const settled = !isFetching && scalarValue > 0;
  const alias = getAlias(entity).toUpperCase();
  const msg = capitalizeFirstLetter(entity);

  return (
    <React.Fragment>
      {settled && (
        <TableViewPager
          operation={UPWARDS}
          isLoading={isFetching}
          icons={icons}
        />
      )}
              <Row className={stylesProps.stylesheet + ' ' + 'hasBorders' + ' ' + styles404["hasBorders"] + ' ' + stylesProps.avatar} >
          <ContentBanner entity={entity} operation={operation} />
          {scalarValue === 0 ? (
            <Col xs={12} className={styles404["notFound"]}>
            <DataNotAvailable
              msg={
                isFetching || isRetrying
                  ? `Fetching ${msg}. Please wait...`
                  : `ITS EMPTY IN HERE, NO ${alias}`
              }
              maxDurartion={isFetching || isRetrying ? timeout : 0}
            />
          </Col>
        ) : (
          children
        )}
      </Row>
      {settled && (
        <TableViewPager
          operation={DOWNWARDS}
          isLoading={isFetching}
          icons={icons}
        />
      )}
      <RoleToggler isRolePicker={false} />
    </React.Fragment>
  );
};

export default Cards;
