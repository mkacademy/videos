import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Col, Container, Row } from 'react-bootstrap';
import {
  appendTraversal,
  purgeTraversal,
  uncacheTraversal,
  Traversal,
} from '../../../store/slices/traversalSlice';
import HistoryTag from './HistoryTag';
import { getEntityFromUrl } from '../../../utils';
import { RootState } from '../../../store/types';
import { initNavigator, showAlgorithm } from '../../../library/actions';
import { InitNavigatorPayload } from '../../../store/middleware/NavigationTrackerEFG';

interface ScreenProps {
  setShow: (show: boolean) => void;
}

const Screen: React.FC<ScreenProps> = ({ setShow }) => {
  const dispatch = useDispatch();

  // Use one useSelector per prop as requested
  const traversals = useSelector((state: RootState) => state.traversal.traversals);
  const parent = useSelector((state: RootState) => state.view.parent);

  // Action dispatchers
  const resetAlgorithm = (path: string) => dispatch(showAlgorithm(path));
  const removeTraversal = (urlID: string) => dispatch(purgeTraversal(urlID));
  const unCacheSelected = (urlID: string) => dispatch(uncacheTraversal(urlID));
  const cacheSelected = (payload: Traversal) => dispatch(appendTraversal(payload));
  const navigatorPressed = (data: InitNavigatorPayload) => dispatch(initNavigator(data));

  const entity = getEntityFromUrl();
  const selectedUrlID = parent + entity;
  const { contentIds } = traversals.find(
    (traversal) => traversal.urlID === selectedUrlID
  ) ?? { contentIds: [] };

  return (
    <Container>
      <Row>
        {traversals.map((traversal: Traversal, i: number) => {
          const hasCachedIds = traversal.contentIds.length > 0;
          const selectedCss = hasCachedIds ? "selectedMenu" : "";
          const cacheClearer = hasCachedIds ? unCacheSelected : undefined;
          return (
            <Col key={i} sm="auto" className={selectedCss}>
              <HistoryTag
                to={traversal.to}
                setShow={setShow}
                from={traversal.from}
                toIMG={traversal.toIMG}
                urlID={traversal.urlID}
                contentIds={contentIds}
                search={traversal.search}
                prefix={traversal.prefix}
                fromIMG={traversal.fromIMG}
                cacheClearer={cacheClearer}
                cacheSelected={cacheSelected}
                selectedUrlID={selectedUrlID}
                resetAlgorithm={resetAlgorithm}
                removeTraversal={removeTraversal}
                parentData={traversal.parentData}
                encodedData={traversal.encodedData}
                navigatorPressed={navigatorPressed}
              />
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

export default Screen;
