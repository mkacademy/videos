import React, { memo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Table } from "react-bootstrap";
import {
  hideRow,
  hideRows,
  selectAll,
  unselectAll,
  toggleRow as tabularPicker,
  Row,
} from "../../../../../store/slices/rowSlice";
import {
  toggleAction,
  toggleActions,
} from "../../../../../store/slices/actionSlice";
import {
  hideArticle,
  toggleContent as contentPicker,
  hideContent,
} from "../../../../../store/slices/contentSlice";
import { calcCheckBoxProps } from "./TextColumn";
import TableRowActions, { TableHeaderActions } from "../TableActions/Screen";
import { RootState } from "../../../../../store/types";
import { useVisibleRows, useRenderRows } from "../../../../../Hooks/useTabulatorRows";
import { ActionItem, Status } from "../../../../../store/slices/actionSlice";
import * as crudstyles from "../../../../../styles/crudsPrActions.module.css";
import * as styles from "../../../../../styles/tableView.module.css";
import * as actionsWrapper from "../../../../../styles/actionsWrapper.module.css";
import * as orderAndActions from "../../../../../styles/orderAndActions.module.css";

const stylesProps = {
  Cruds: crudstyles["Cruds"],  
  chkbx: styles["chkbx"],
  datas: crudstyles["datas"],
  padder: crudstyles["padder"],
  Cruds_: actionsWrapper["Cruds"],
  Cruds_2: orderAndActions["Cruds"],
}

interface CrudColumnProps {
  entity: string;
  padCount: number;
}

interface CrudColumnRowProps {
  row: Row;
  onCheck: (id: string) => void;
  statusToggler: (status: Status, id: string) => void;
  roleIndex: number;
  statuses: ActionItem[];
  remover: (id: string) => void;
  entity: string;
  roles: string[];
}

const CrudColumnRow = memo(function CrudColumnRow({
  row,
  onCheck,
  statusToggler,
  roleIndex,
  statuses,
  remover,
  entity,
  roles,
}: CrudColumnRowProps) {
  return (
    <tr>
      <td className={stylesProps.chkbx}>
        <input
          type="checkbox"
          checked={row.checked}
          disabled={row.frozen}
          onChange={() => onCheck(row.id)}
        />
      </td>
      <td>
        <TableRowActions
          statusToggler={statusToggler}
          roleIndex={roleIndex}
          statuses={statuses}
          remover={remover}
          entity={entity}
          roles={roles}
          row={row}
        />
      </td>
    </tr>
  );
});

const CrudColumn: React.FC<CrudColumnProps> = ({ entity, padCount }) => {
  const dispatch = useDispatch();
  
  // Using one useSelector per prop as requested
  const roleIndex = useSelector((state: RootState) => state.session.roleIndex);
  const roles = useSelector((state: RootState) => state.session.roles) || [];
  const statuses = useSelector((state: RootState) => state.action);
  const visibles = useVisibleRows();
  const { renderRows } = useRenderRows();
  const [status, setStatus] = useState<Status>({ initial: 2, current: 0 });

  // Action creators converted to dispatch calls
  const statusToggler = (status: Status, id: string) => {
    dispatch(toggleAction({ status, id }));
  };
  const statusToggleAll = (payload: Status) => dispatch(toggleActions(payload));
  const statusResetAll = () => {
    // swapStatuses doesn't exist, implementing a basic reset logic
    // You may need to implement this based on your actual requirements
    console.log('statusResetAll called - implement based on requirements');
  };
  const uncheckAll = () => dispatch(unselectAll());
  const remover = (payload: string) => {
    dispatch(hideRow(payload));
    dispatch(hideArticle(parseInt(payload.toString())));
  };
  const checkToggler = (payload: string) => {
    dispatch(tabularPicker(payload));
    dispatch(contentPicker(parseInt(payload)));
  };
  const removeAll = () => {
    dispatch(hideContent());
    dispatch(hideRows());
  };
  const checkAll = () => dispatch(selectAll());

  const { allchecked, allFrozen } = calcCheckBoxProps(visibles);

  return (
    <Table className={stylesProps.Cruds + " " + stylesProps.Cruds_ + " " + stylesProps.Cruds_2} striped bordered hover size="sm">
      <thead>
        <tr>
          <th className={stylesProps.chkbx}>
            <input
              type="checkbox"
              disabled={allFrozen}
              checked={allchecked}
              onChange={() => {
                if (!allchecked) checkAll();
                else uncheckAll();
              }}
            />
          </th>
          <th>
            <TableHeaderActions
              statusToggleAll={statusToggleAll}
              statusResetAll={statusResetAll}
              removeAll={removeAll}
              setStatus={setStatus}
              roleIndex={roleIndex}
              entity={entity}
              status={status}
              roles={roles}
            />
          </th>
        </tr>
      </thead>
      <tbody>
        <React.Fragment>
          {renderRows.map((row: Row) => (
            <CrudColumnRow
              key={row.id}
              row={row}
              onCheck={checkToggler}
              statusToggler={statusToggler}
              roleIndex={roleIndex}
              statuses={statuses}
              remover={remover}
              entity={entity}
              roles={roles}
            />
          ))}
        </React.Fragment>
        <React.Fragment>
          {renderRows.length - padCount < 0 &&
            Array.from({ length: Math.abs(renderRows.length - padCount) }).map(
              (_, i) => (
                <tr key={i}>
                  <td className={stylesProps.chkbx}></td>
                  <td className={stylesProps.datas + " " + stylesProps.padder}>{"Padding"}</td>
                </tr>
              )
            )}
        </React.Fragment>
      </tbody>
    </Table>
  );
};

export default CrudColumn;
