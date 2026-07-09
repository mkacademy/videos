import React from "react";
import { Link } from "react-router-dom";
const deleteIMG = new URL("../../../../../Images/delete.png", import.meta.url).href;
const creatorIMG = new URL("../../../../../Images/Creater.png", import.meta.url).href;
const approveIMG = new URL("../../../../../Images/thumbs_up.png", import.meta.url).href;
const editPencil = new URL("../../../../../Images/editPencil.png", import.meta.url).href;
const rejectIMG = new URL("../../../../../Images/thumbs_down.png", import.meta.url).href;
const duplicateIMG = new URL("../../../../../Images/duplicate.png", import.meta.url).href;
const pendingIMG = new URL("../../../../../Images/pending-mark.png", import.meta.url).href;
import { Status } from "../../../../../store/slices/actionSlice";
import * as crudstyles from "../../../../../styles/crudsPrActions.module.css";
import * as tableview from "../../../../../styles/tableView.module.css";

const stylesProps = {
  icon: tableview["icon"],
  middle: crudstyles["middle"],
}
const sequences = [pendingIMG, approveIMG, rejectIMG];

interface BasicHeaderActionsProps {
  status: Status;
  entity: string;
  deleter: () => void;
  toggler: (status: Status) => void;
}

interface BasicActionsProps {
  id: string;
  status: Status;
  entity: string;
  deleter: (id: string) => void;
  toggler: (status: Status, id: string) => void;
}

export const BasicHeaderActions: React.FC<BasicHeaderActionsProps> = ({
  status,
  entity,
  deleter,
  toggler,
}) => {
  const { initial, current } = status;
  return (
    <React.Fragment>
      <div onClick={() => toggler({ initial: current, current: initial })}>
        <img className={stylesProps.icon} alt="change status" src={sequences[current]} />
      </div>
      <Link
        to={`/formulator/${entity}`}
        className={stylesProps.middle}
      >
        <img className={stylesProps.icon} alt="" src={editPencil} />
      </Link>
      <div onClick={() => deleter()}>
        <img className={stylesProps.icon} alt="" src={deleteIMG} />
      </div>
    </React.Fragment>
  );
};

const BasicActions: React.FC<BasicActionsProps> = ({
  id,
  status,
  entity,
  deleter,
  toggler,
}) => {
  // console.log(JSON.stringify(status, null, 2), id);
  const { initial, current, owner } = status;
  const inverted: Status = { initial: current, current: initial, owner };
  
  return (
    <React.Fragment>
      {owner ? (
        <React.Fragment>
          <div onClick={() => toggler(inverted, id)}>
            <img
              className={stylesProps.icon}
              alt="change status"
              src={sequences[current]}
            />
          </div>
          <Link
            to={`/formulator/${entity}`}
            state={{ editID: id }}
            className={stylesProps.middle}
          >
            <img className={stylesProps.icon} alt="" src={editPencil} />
          </Link>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <div onClick={() => console.log("not implemented")}>
            <img className={stylesProps.icon} alt="" src={duplicateIMG} />
          </div>
          <div
            className={stylesProps.middle}
            onClick={() => console.log("not implemented")}
          >
            <img className={stylesProps.icon} alt="" src={creatorIMG} />
          </div>
        </React.Fragment>
      )}
      <div onClick={() => deleter(id)}>
        <img className={stylesProps.icon} alt="" src={deleteIMG} />
      </div>
    </React.Fragment>
  );
};

export default BasicActions;
