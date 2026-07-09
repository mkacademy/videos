import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import RootTags from '../../DisplayedTags/RootTags/Screen';
import RootsInfo from './RootsInfo';
import { useRootsJoinShortcut } from '../../../Hooks/useShortcuts';
import { showAlgorithm } from '../../../library/actions';

interface RootsProps {
  isShow: boolean;
  headline: string;
  showRoots: (show: boolean) => void;
}

const Roots: React.FC<RootsProps> = ({ headline, isShow, showRoots }) => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(isShow);
  const [shownByShortcut, setShownByShortcut] = useState(false);
  const visibleRef = useRef(isShow);

  useEffect(() => {
    setIsVisible(isShow);
    visibleRef.current = isShow;
    if (!isShow) setShownByShortcut(false);
  }, [isShow]);

  const handleSetShow = useCallback((show: boolean) => {
    setIsVisible(show);
    visibleRef.current = show;
    if (!show) setShownByShortcut(false);
    showRoots(show);
  }, [showRoots]);

  const handleShortcutToggle = useCallback(() => {
    const next = !visibleRef.current;
    visibleRef.current = next;
    setIsVisible(next);
    setShownByShortcut(next);
    if (next) dispatch(showAlgorithm(pathname));
    showRoots(next);
  }, [dispatch, pathname, showRoots]);

  useRootsJoinShortcut(handleShortcutToggle);

  return (
    <Modal
      show={isVisible}
      dialogClassName="modal-90w"
      onHide={() => handleSetShow(false)}
      aria-labelledby="root-modal"
    >
      <Modal.Header
        closeButton
        onHide={() => console.log("clear ids of selected")}
      >
        <Modal.Title id="root-modal">{headline.toUpperCase()}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <RootTags
          setShow={handleSetShow}
          shownByShortcut={shownByShortcut} />
        <RootsInfo
          useRouteAlias={true}
          setShow={handleSetShow}
          showSelectedTotal={true}
          shownByShortcut={shownByShortcut} />
        <RootsInfo
          useRouteAlias={false}
          setShow={handleSetShow}
          showSelectedTotal={false}
          shownByShortcut={shownByShortcut} />
      </Modal.Body>
    </Modal>
  );
};

export default Roots; 