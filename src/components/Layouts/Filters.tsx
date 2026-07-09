import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Col, Row } from "react-bootstrap";
import ContentBanner from "../Banners/Screen";
import TableViewPager from "../Pagination/TableViewPager";
import useDbQuery from "../../Hooks/useQueryBuilder";
import { viewPayload as escrowPayload, ViewPayload } from "../../store/slices/viewSlice";
import { fetchContents } from "../../library/actions";
import { clearInteractions } from "../../store/slices/interactionSlice";
import DataNotAvailable from "../views/404";
import useMenuBuilder, { useIconsPicker } from "../../Hooks/useIconsAssembler";
import RoleToggler from "../Tabulator/Authenticated/private/TableWidgets/RoleToggler";
import { timeout, capitalizeFirstLetter, getAlias, BORDERLESS_UPWARDS, BORDERLESS_DOWNWARDS } from "../../utils";
import { RootState } from "../../store/types";
import * as styles from "../../styles/splitters.module.css";
import * as styles404 from "../../styles/404.module.css";
import { DataRow } from "../../components/Core/types";

interface FiltersProps {
  children?: React.ReactNode;
  prefix?: string;
}

const getToSifter = (prefix: string | undefined, entity: string): string => {
  if (prefix === undefined) return entity;
  switch (prefix.toLowerCase()) {
    case "lower":
      return "lowersifters";
    case "higher":
      return "highersifters";
    default:
      return "sifters";
  }
};

const Filters: React.FC<FiltersProps> = ({
  children,
  prefix,
}) => {
  const dispatch = useDispatch();
  
  const parent = useSelector((state: RootState) => state.view.parent);
  const isAppend = useSelector((state: RootState) => state.session.isAppend);
  const isRetrying = useSelector((state: RootState) => state.view.isFetching);
  const operation = useSelector((state: RootState) => state.session.operation);
  const isFetching = useSelector((state: RootState) => state.session.isFetching);
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const scalarValue = useSelector((state: RootState) => 
    state.content.filter((row: DataRow) => !row.deleted).length
  );

  const interactionsClearer = (payload: boolean) => dispatch(clearInteractions(payload));
  const contentProvider = (payload: ViewPayload) => dispatch(fetchContents(payload));
  const cachePayload = (payload: ViewPayload) => dispatch(escrowPayload(payload));

  if (parent === undefined) return <React.Fragment />;

  const queryBuilderProps = {
    isTabled: false,
    isAppend,
    defaultTake,
    contentProvider,
    interactionsClearer,
  };

  const entity = getToSifter(prefix, useDbQuery(queryBuilderProps, operation));
  const alias = getAlias(entity).toUpperCase();
  const msg = capitalizeFirstLetter(entity);
  const menu = useMenuBuilder(entity);
  const icons = useIconsPicker(menu, false);
  const wIcons = useIconsPicker(menu, true);
  const settled = !isFetching && scalarValue > 0;

  setTimeout(() => cachePayload({ entity, icons }));

  return (
    <React.Fragment>
      {settled && (
        <TableViewPager
          operation={BORDERLESS_UPWARDS}
          isLoading={isFetching}
          icons={wIcons}
        />
      )}
      <div className={styles["screenFlex"]}>
        <ContentBanner operation={operation} entity={entity} />
        {settled && children}
      </div>
      { scalarValue === 0 && (
        <Row className={'hasBorders' +' '+ styles404["hasBorders"]} >
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
        </Row>
      )}
      {settled && (
        <TableViewPager
          operation={BORDERLESS_DOWNWARDS}
          isLoading={isFetching}
          icons={wIcons}
        />
      )}
      <div className="padded-bottom"></div>
      <RoleToggler isRolePicker={false} />
    </React.Fragment>
  );
};

export default Filters;
