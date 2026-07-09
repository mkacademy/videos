import React from 'react';
import { Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import RootTags from "../DisplayedTags/RootTags/Screen";
import { exportAlgorithm, importAlgorithm } from "../../library/actions";
import RootsInfo from '../convolayouts/Modals/RootsInfo';

interface RootsProps {
  isShow: boolean;
  headline?: string;
  exAlgorithm: boolean;
  removeRoots: () => void;
  showRoots: (show: boolean) => void;
  setDoAction: (action: string) => void;
}

const Roots: React.FC<RootsProps> = ({ 
  headline, 
  isShow, 
  showRoots, 
  removeRoots, 
  setDoAction, 
  exAlgorithm 
}) => {
  return (
    <Modal
      show={isShow}
      dialogClassName="modal-90w"
      onHide={() => showRoots(false)}
      aria-labelledby="root-modal"
    >
      <Modal.Header closeButton onHide={removeRoots}>
        <Modal.Title id="root-modal">
          {headline ? (
            headline.toUpperCase()
          ) : (
            <Link
              to="#"
              onClick={(e) => {
                e.preventDefault();
                const action = exAlgorithm ? exportAlgorithm.type : importAlgorithm.type;
                showRoots(false);
                setDoAction(action);
              }}
            >
              ALGORITHM
            </Link>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <RootTags setShow={showRoots} shownByShortcut={false} />
        <RootsInfo
          useRouteAlias={true}
          setShow={showRoots}
          showSelectedTotal={true}
          shownByShortcut={false} />
        <RootsInfo
          useRouteAlias={false}
          setShow={showRoots}
          showSelectedTotal={false}
          shownByShortcut={false} />
      </Modal.Body>
    </Modal>
  );
};

export default Roots; 