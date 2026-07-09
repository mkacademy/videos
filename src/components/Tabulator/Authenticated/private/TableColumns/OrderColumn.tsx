import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Dropdown, DropdownButton, Table } from "react-bootstrap";
import {
  selectAll,
  unselectAll,
  toggleRow as tabularPicker,
} from "../../../../../store/slices/rowSlice";
import { calcCheckBoxProps } from "./TextColumn";
import { toggleContent as contentPicker } from "../../../../../store/slices/contentSlice";
import {
  useVisibleRows,
  useRenderRows,
  toGlobalRowIndex,
} from "../../../../../Hooks/useTabulatorRows";
import { RootState } from "../../../../../store/types";
import {
  TABULATOR_ORDER_START_PREFIX,
  TABULATOR_ORDER_END_PREFIX,
  TABULATOR_ORDER_GROUP_END_PREFIX,
  TABULATOR_ORDER_RESET,
} from "../../../../../store/middleware/TabulatorOrderingUtils";
import * as styles from "../../../../../styles/tableView.module.css";
import * as orderStyles from "../../../../../styles/orderCol.module.css";
import * as orderAndActions from "../../../../../styles/orderAndActions.module.css";
import * as descendantsWrapper from "../../../../../styles/descendantsWrapper.module.css";

const stylesProps = {
  chkbx_: orderStyles["chkbx"],
  chkbx: styles["chkbx"],
  ranks: orderStyles["ranks"],
  orderDropdown: orderStyles["orderDropdown"],
  inputBox: orderStyles["inputBox"],
  HorizantolFlex: descendantsWrapper["HorizantolFlex"],
  datas: orderStyles["datas"],
  Orders: orderStyles["Orders"],
  btn: orderStyles["btn"],
  btn_primary: orderStyles["btn-primary"],
  Orders_: orderAndActions["Orders"],
  padder: orderStyles["padder"],
};

interface OrderColumnProps {
  title: string;
  padCount: number;
}

const formatRank = (index: number) => ("00" + index).slice(-3);

const OrderColumn: React.FC<OrderColumnProps> = ({ title, padCount }) => {
  const dispatch = useDispatch();
  const visibles = useVisibleRows();
  const { renderRows, renderOffset } = useRenderRows();
  const { allchecked, allFrozen } = calcCheckBoxProps(visibles);
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const parent = useSelector((state: RootState) => state.session.parent ?? "");
  const entity = useSelector((state: RootState) => state.view.entity ?? "");
  const tabulatorOrderStartId = useSelector(
    (state: RootState) => state.session.tabulatorOrderStartId,
  );
  const routeKey = `${parent}${entity}`;
  const anchorActive = tabulatorOrderStartId[routeKey] != null;

  const handleCheckAll = () => {
    if (!allchecked) dispatch(selectAll());
    else dispatch(unselectAll());
  };

  const handleCheckToggle = (id: string) => {
    dispatch(tabularPicker(id));
    dispatch(contentPicker(parseInt(id)));
  };

  return (
    <Table className={stylesProps.Orders + " " + stylesProps.Orders_} striped bordered hover size="sm">
      <thead>
        <tr>
          <th className={stylesProps.chkbx + " " + stylesProps.chkbx_}>
            <input
              type="checkbox"
              checked={allchecked}
              disabled={allFrozen}
              onChange={handleCheckAll}
            />
          </th>
          <th className={stylesProps.ranks}>{title}</th>
        </tr>
      </thead>
      <tbody>
        <React.Fragment>
          {renderRows.map((row, localIndex) => {
            const globalIndex = toGlobalRowIndex(localIndex, renderOffset);
            const isOpen = openRowId === row.id;
            return (
              <tr key={row.id}>
                <td className={stylesProps.chkbx + " " + stylesProps.chkbx_}>
                  <input
                    type="checkbox"
                    disabled={row.frozen}
                    checked={row.checked}
                    onChange={() => handleCheckToggle(row.id)}
                  />
                </td>
                <td className={stylesProps.ranks}>
                  <div className={stylesProps.orderDropdown + " " + stylesProps.HorizantolFlex}>
                    <input
                      type="text"
                      readOnly={true}
                      className={stylesProps.inputBox}
                      value={formatRank(globalIndex)}
                      tabIndex={-1}
                    />
                    <DropdownButton
                      title=""
                      align="end"
                      show={isOpen}
                      onToggle={(next) => setOpenRowId(next ? row.id : null)}
                      id={`order-dropdown-${row.id}`}
                      className={stylesProps.btn + " " + stylesProps.btn_primary}
                    >
                      {isOpen && (
                        <>
                          <Dropdown.Item disabled>{formatRank(globalIndex)}</Dropdown.Item>
                          <Dropdown.Item
                            disabled={anchorActive}
                            onClick={() => {
                              dispatch(tabularPicker(`${TABULATOR_ORDER_START_PREFIX}${row.id}`));
                              setOpenRowId(null);
                            }}
                          >
                            Start
                          </Dropdown.Item>
                          <Dropdown.Item
                            disabled={!anchorActive}
                            onClick={() => {
                              dispatch(tabularPicker(`${TABULATOR_ORDER_END_PREFIX}${row.id}`));
                              setOpenRowId(null);
                            }}
                          >
                            End
                          </Dropdown.Item>
                          <Dropdown.Item
                            disabled={!anchorActive}
                            onClick={() => {
                              dispatch(
                                tabularPicker(`${TABULATOR_ORDER_GROUP_END_PREFIX}${row.id}`),
                              );
                              setOpenRowId(null);
                            }}
                          >
                            Group
                          </Dropdown.Item>
                          <Dropdown.Item
                            disabled={!anchorActive}
                            onClick={() => {
                              dispatch(tabularPicker(TABULATOR_ORDER_RESET));
                              setOpenRowId(null);
                            }}
                          >
                            Reset
                          </Dropdown.Item>
                        </>
                      )}
                    </DropdownButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </React.Fragment>
        <React.Fragment>
          {renderRows.length - padCount < 0 &&
            Array.from({ length: Math.abs(renderRows.length - padCount) }).map((_, i) => (
              <tr key={`pad-${i}`}>
                <td className={stylesProps.chkbx + " " + stylesProps.chkbx_}></td>
                <td className={stylesProps.datas + " " + stylesProps.padder}>{"Padding"}</td>
              </tr>
            ))}
        </React.Fragment>
      </tbody>
    </Table>
  );
};

export default OrderColumn;
