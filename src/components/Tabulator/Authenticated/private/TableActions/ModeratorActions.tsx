import React from "react";
const duplicateIMG = new URL("../../../../../Images/duplicate.png", import.meta.url).href;
const approveIMG = new URL("../../../../../Images/thumbs_up.png", import.meta.url).href;
const rejectIMG = new URL("../../../../../Images/thumbs_down.png", import.meta.url).href;
const pendingIMG = new URL("../../../../../Images/pending-mark.png", import.meta.url).href;
import { Status } from "../../../../../store/slices/actionSlice";
import * as crudstyles from "../../../../../styles/crudsPrActions.module.css";
import * as tableview from "../../../../../styles/tableView.module.css";

const stylesProps = {
  icon: tableview["icon"],
  middle: crudstyles["middle"],
}
interface ModeratorActionsProps {
  toggler: (status: Status, id: string) => void;
  id: string;
  status: Status;
}

const sq = [
  { left: approveIMG, leftA: 1, right: rejectIMG, riteA: 2 },
  { left: pendingIMG, leftA: 0, right: rejectIMG, riteA: 2 },
  { left: approveIMG, leftA: 1, right: pendingIMG, riteA: 0 },
];

export const ModeratorActions: React.FC<ModeratorActionsProps> = ({ toggler, id, status }) => {
  const { initial, current, owner } = status;
  return (
    <React.Fragment>
      <div onClick={() => console.log(`duplicate ${id}`)}>
        <img className={stylesProps.icon} alt="" src={duplicateIMG} />
      </div>
      <div
        className={stylesProps.middle}
        onClick={() =>
          toggler({ current: sq[current].leftA, initial, owner }, id)
        }
      >
        <img className={stylesProps.icon} alt="" src={sq[current].left} />
      </div>
      <div
        onClick={() =>
          toggler({ current: sq[current].riteA, initial, owner }, id)
        }
      >
        <img className={stylesProps.icon} alt="" src={sq[current].right} />
      </div>
    </React.Fragment>
  );
};