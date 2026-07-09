import React from "react";
import { Modal } from "react-bootstrap";
import { Link } from "react-router-dom";
import HistoryTags from "../DisplayedTags/HistoryTags/Screen";
import HistoryInfo from "./HistoryInfo";
import { exportTraversals, importTraversals } from "../../library/actions";

interface HistoryProps {
  isShow: boolean;
  setDoAction: (action: string) => void;
  showHistory: (show: boolean) => void;
  exTraversals: boolean;
  removeHistory: () => void;
}

const History: React.FC<HistoryProps> = ({
  isShow,
  setDoAction,
  showHistory,
  exTraversals,
  removeHistory,
}) => {
  return (
    <Modal
      show={isShow}
      dialogClassName="modal-90w"
      onHide={() => showHistory(false)}
      aria-labelledby="history-modal"
    >
      <Modal.Header closeButton onHide={removeHistory}>
        <Modal.Title id="history-modal">
          <Link
            to="#"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              const action = exTraversals
                ?  exportTraversals.type
                :  importTraversals.type;
              showHistory(false);
              setDoAction(action);
            }}
          >
            HISTORY
          </Link>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <HistoryTags setShow={showHistory} />
        <HistoryInfo
          useRouteAlias={true}
          setShow={showHistory}
          showSelectedTotal={true}
          shownByShortcut={false} />
        <HistoryInfo
          useRouteAlias={false}
          setShow={showHistory}
          showSelectedTotal={false}
          shownByShortcut={false} />
      </Modal.Body>
    </Modal>
  );
};

export default History;
