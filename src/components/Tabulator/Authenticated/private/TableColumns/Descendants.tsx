import React, { memo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Table } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  selectAll,
  unselectAll,
  toggleRow as tabularPicker,
  Row,
} from "../../../../../store/slices/rowSlice";
import { toggleContent as contentPicker } from "../../../../../store/slices/contentSlice";
import { initLoading } from "../../../../../library/actions";
import {
  Tree,
  cookIngredients,
  capitalizeFirstLetter,
  getAlias,
} from "../../../../../utils";
import { tabluarPrefixes } from "../../../../../constants";
import { calcCheckBoxProps } from "./TextColumn";
import { RootState } from "../../../../../store/types";
import {
  useVisibleRows,
  useRenderRows,
  useRowIndexById,
} from "../../../../../Hooks/useTabulatorRows";
const lockIMG = new URL("../../../../../Images/lock.png", import.meta.url).href;
const addEntity = new URL("../../../../../Images/addEntity.png", import.meta.url).href;
const removeEntity = new URL("../../../../../Images/removeEntity.png", import.meta.url).href;
const tranparentIMG = new URL("../../../../../Images/transparent.png", import.meta.url).href;
import { IconKey } from "../../../../../Hooks/useIconsAssembler";
import * as descendantsWrapper from "../../../../../styles/descendantsWrapper.module.css";
import * as tableView from "../../../../../styles/tableView.module.css";
import * as descendantsAndOptions from "../../../../../styles/descendantsAndOptions.module.css";

const stylesProps = {
  icon: tableView["icon"],
  chkbx: tableView["chkbx"],
  HorizantolFlex: descendantsWrapper["HorizantolFlex"],
  HorizantolFlexCounts: descendantsWrapper["HorizantolFlexCounts"],
  counts: descendantsWrapper["counts"],
  padded: descendantsWrapper["padded"],
  datas: descendantsWrapper["datas"],
  urlLink: descendantsWrapper["urlLink"],
  Descendants: descendantsWrapper["Descendants"],
  iconThumb: descendantsWrapper["iconThumb"],
  padder: descendantsWrapper["padder"],
  Descendants_: descendantsAndOptions["Descendants"],
};

interface DescendantsProps {
  icons: Record<IconKey, string>;
  title: string;
  entity: string;
  padCount: number;
  noOutlier?: string;
}

interface DecendentData {
  entity: string;
  sums?: number[];
  ids?: string[];
}

const stop = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
};

const isFunctionEnable = (func: (e: React.MouseEvent) => void, visible: boolean) =>
  visible ? func : (e: React.MouseEvent) => stop(e);

interface DescendantsRowProps {
  row: Row;
  sum: number;
  isPrivate: boolean;
  isAllowed: boolean;
  onCheckToggle: (rowId: string) => void;
  onCountLink: (e: React.MouseEvent, row: Row) => void;
  onAddLink: (e: React.MouseEvent, row: Row) => void;
  onRemoveLink: (e: React.MouseEvent, row: Row) => void;
}

const DescendantsRow = memo(function DescendantsRow({
  row,
  sum,
  isPrivate,
  isAllowed,
  onCheckToggle,
  onCountLink,
  onAddLink,
  onRemoveLink,
}: DescendantsRowProps) {
  return (
    <tr>
      <td className={stylesProps.chkbx}>
        <input
          type="checkbox"
          disabled={row.frozen}
          checked={row.checked}
          onChange={() => onCheckToggle(row.id)}
        />
      </td>
      <td className={stylesProps.datas}>
        <div
          className={
            isPrivate
              ? stylesProps.HorizantolFlexCounts + " " + stylesProps.counts
              : stylesProps.HorizantolFlex + " " + stylesProps.counts + " " + stylesProps.padded
          }
        >
          <Link
            to="#"
            className={stylesProps.urlLink}
            onClick={isFunctionEnable((e) => {
              if (sum > 0) onCountLink(e, row);
              else e.preventDefault();
            }, isAllowed)}
          >
            {sum}
          </Link>
          {isPrivate && (
            <React.Fragment>
              <Link to="#" onClick={isFunctionEnable((e) => onAddLink(e, row), isAllowed)}>
                <img alt="" className={stylesProps.icon} src={isAllowed ? addEntity : tranparentIMG} />
              </Link>
              <Link to="#" onClick={isFunctionEnable((e) => onRemoveLink(e, row), isAllowed)}>
                <img alt="" className={stylesProps.icon} src={isAllowed ? removeEntity : tranparentIMG} />
              </Link>
            </React.Fragment>
          )}
        </div>
      </td>
    </tr>
  );
});

const Descendants: React.FC<DescendantsProps> = ({
  icons,
  title,
  entity,
  padCount,
  noOutlier,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const isPrivate = useSelector((state: RootState) => state.session.isPrivate);
  const action = useSelector((state: RootState) => state.session.tableAction);
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const decendents = useSelector((state: RootState) => state.decendent);
  const visibles = useVisibleRows();
  const { renderRows } = useRenderRows();
  const { allchecked, allFrozen } = calcCheckBoxProps(visibles);
  const classNames = noOutlier ? stylesProps.Descendants + " " + noOutlier : stylesProps.Descendants;
  const connections: string[] = Tree.getProperty(entity, "unlocked") || [];
  const iconUrl = icons[capitalizeFirstLetter(getAlias(title)) as IconKey];
  const isAllowed = connections.indexOf(title) > -1;

  const decendent = decendents.find((d: DecendentData) => d.entity === title);
  const sums = decendent?.sums || [];
  const ids = decendent?.ids;
  const idToIndex = useRowIndexById(ids);

  const onLinkClickEventHandler = (e: React.MouseEvent, row: Row, prefix: string) => {
    e.preventDefault();
    const ingredients = {
      parentData: { curApp, IDs: [row.id], parent: entity },
      entity: title,
      search: undefined,
      defaultTake,
      prefix,
    };
    const spread = cookIngredients(ingredients);
    if (spread) {
      dispatch(initLoading(ingredients));
      navigate(spread.url);
    }
  };

  const onIMGClickEventHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    const chkds = visibles.filter((v: Row) => v.checked);
    const IDs = chkds.map((chkd: Row) => chkd.id);
    const ingredients = {
      prefix: tabluarPrefixes.find((p: string) => p.includes(action)),
      parentData: { curApp, IDs, parent: entity },
      entity: title,
      search: undefined,
    };
    const spread = cookIngredients(ingredients);
    if (spread) {
      dispatch(initLoading(ingredients));
      navigate(spread.url);
    }
  };

  const handleCheckAll = () => {
    if (!allchecked) dispatch(selectAll());
    else dispatch(unselectAll());
  };

  const handleCheckToggle = (rowId: string) => {
    dispatch(tabularPicker(rowId));
    dispatch(contentPicker(parseInt(rowId)));
  };

  return (
    <Table className={classNames + " " + stylesProps.Descendants_} striped bordered hover size="sm">
      <thead>
        <tr>
          <th className={stylesProps.chkbx}>
            <input
              type="checkbox"
              disabled={allFrozen}
              checked={allchecked}
              onChange={handleCheckAll}
            />
          </th>
          <th className={stylesProps.datas + " " + stylesProps.iconThumb}>
            <div>
              <Link
                to="#"
                className={stylesProps.urlLink}
                onClick={isFunctionEnable(onIMGClickEventHandler, isAllowed)}
              >
                <img alt={title} src={isAllowed ? iconUrl : lockIMG} />
              </Link>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <React.Fragment>
          {renderRows.map((row) => {
            const rowIndex = idToIndex.get(row.id) ?? -1;
            const sum = rowIndex >= 0 ? sums[rowIndex] ?? 0 : 0;
            return (
              <DescendantsRow
                key={row.id}
                row={row}
                sum={sum}
                isPrivate={isPrivate}
                isAllowed={isAllowed}
                onCheckToggle={handleCheckToggle}
                onCountLink={(e, r) => onLinkClickEventHandler(e, r, tabluarPrefixes[0])}
                onAddLink={(e, r) => onLinkClickEventHandler(e, r, tabluarPrefixes[1])}
                onRemoveLink={(e, r) => onLinkClickEventHandler(e, r, tabluarPrefixes[2])}
              />
            );
          })}
        </React.Fragment>
        <React.Fragment>
          {renderRows.length - padCount < 0 &&
            Array.from({ length: Math.abs(renderRows.length - padCount) }).map((_, i) => (
              <tr key={i}>
                <td className={stylesProps.chkbx}></td>
                <td className={stylesProps.datas + " " + stylesProps.padder}>
                  <div className={stylesProps.HorizantolFlex + " " + stylesProps.counts}>
                    <Link className={stylesProps.urlLink} to="#" onClick={(e) => stop(e)}></Link>
                    <Link to="#">
                      <img className={stylesProps.icon} alt="" src={tranparentIMG} onClick={(e) => stop(e)} />
                    </Link>
                    <Link to="#">
                      <img className={stylesProps.icon} alt="" src={tranparentIMG} onClick={(e) => stop(e)} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
        </React.Fragment>
      </tbody>
    </Table>
  );
};

export default Descendants;
