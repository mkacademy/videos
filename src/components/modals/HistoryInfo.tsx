import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Badge from 'react-bootstrap/Badge';
import { Col, Container, Row } from 'react-bootstrap';
import { Traversal } from '../../store/slices/traversalSlice';
import { RootState } from '../../store/types';
import { initNavigator, showAlgorithm } from '../../library/actions';
import { InitNavigatorPayload } from '../../store/middleware/NavigationTrackerEFG';
import * as menuStyles from '../../styles/filtertags.module.css';
import * as menutags from '../../styles/menutags.module.css';
import * as searchTagStyles from '../../styles/searchtags.module.css';
import {
  capitalizeFirstLetter,
  getAlias,
  getCurAppName,
  getRouteAlias,
} from '../../utils';

const styleProps = {
  colsSmAuto: menuStyles['col-sm-auto'],
  rootTags: menuStyles['rootTags'],
  selectedRoot: menuStyles['selectedRoot'],
};

const horizontalFlex = menutags['HorizantolFlex'];

interface ModalRouteAlertTagProps {
  routeAlias: string;
  horizontalFlex: string;
  selected?: boolean;
  onActivate: () => void;
  selectedContentTotal?: number;
}

const ModalRouteAlertTag: React.FC<ModalRouteAlertTagProps> = ({
  routeAlias,
  horizontalFlex: horizontalFlexClass,
  selected,
  onActivate,
  selectedContentTotal,
}) => {
  const selectedClass = selected ? searchTagStyles['selectedCss'] : '';
  const tagClass = `${searchTagStyles['greyCss']} ${selectedClass} ${searchTagStyles['clickable']} fade alert text-nowrap show`;
  const routeBadgeBg = selected ? 'success' : 'secondary';
  const showTotalBadge = typeof selectedContentTotal === 'number' && selectedContentTotal > 0;
  return (
    <div role="alert" className={tagClass} onClick={onActivate}>
      <div className={horizontalFlexClass}>
        {showTotalBadge ? (
          <div>
            <span className={`me-3 ${searchTagStyles['searchTagText']}`}>{routeAlias}</span>
            <Badge pill bg={routeBadgeBg}>
              {selectedContentTotal}
            </Badge>
          </div>
        ) : (
          <span className={searchTagStyles['searchTagText']}>{routeAlias}</span>
        )}
      </div>
    </div>
  );
};

interface HistoryInfoRowProps {
  traversal: Traversal;
  setShow: (show: boolean) => void;
  useRouteAlias: boolean;
  showSelectedTotal: boolean;
  curAppName: string;
  resetAlgorithm: (path: string) => void;
  navigatorPressed: (data: InitNavigatorPayload) => void;
}

const HistoryInfoRow: React.FC<HistoryInfoRowProps> = ({
  traversal,
  setShow,
  useRouteAlias,
  showSelectedTotal,
  curAppName,
  resetAlgorithm,
  navigatorPressed,
}) => {
  const navigate = useNavigate();
  const {
    to,
    from,
    search,
    prefix,
    parentData,
    contentIds,
    encodedData,
  } = traversal;

  const preUrl = (prefix ?? '') + to + '/' + encodedData + (search ?? '');
  const appname = getCurAppName(parentData.curApp);

  const handleActivate = () => {
    navigatorPressed({ entity: to, encodedData });
    resetAlgorithm('/convolution/' + appname);
    navigate(preUrl);
    setShow(false);
  };

  const routeAlias = useRouteAlias
    ? getRouteAlias((from ?? '') + (to ?? ''), curAppName)
    : (from ? getAlias(from) : '') + (to ? capitalizeFirstLetter(getAlias(to)) : '');

  const hasCachedIds = contentIds.length > 0;
  const hasParentIds = !!(parentData?.IDs && parentData.IDs.length > 0);
  const selectedCss = hasCachedIds || hasParentIds ? styleProps.selectedRoot : '';
  const tagSelected = hasCachedIds || hasParentIds;
  const selectedContentTotal =
    showSelectedTotal && hasCachedIds ? contentIds.length : undefined;

  return (
    <Col sm="auto" className={`${styleProps.colsSmAuto} ${selectedCss}`}>
      <div style={{ paddingLeft: '0.1875rem', paddingRight: '0.1875rem' }}>
        <ModalRouteAlertTag
          routeAlias={routeAlias}
          horizontalFlex={horizontalFlex}
          selected={tagSelected}
          onActivate={handleActivate}
          selectedContentTotal={selectedContentTotal}
        />
      </div>
    </Col>
  );
};

export interface HistoryInfoProps {
  setShow: (show: boolean) => void;
  useRouteAlias: boolean;
  showSelectedTotal: boolean;
  /** Optional; accepted for parity with `RootsInfo` call sites (unused). */
  shownByShortcut?: boolean;
}

const HistoryInfo: React.FC<HistoryInfoProps> = ({
  setShow,
  useRouteAlias,
  showSelectedTotal,
}) => {
  const dispatch = useDispatch();
  const traversals = useSelector((state: RootState) => state.traversal.traversals);
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const curAppName = getCurAppName(curApp);

  const resetAlgorithm = (path: string) => dispatch(showAlgorithm(path));
  const navigatorPressed = (data: InitNavigatorPayload) => dispatch(initNavigator(data));

  return (
    <Container>
      <Row className={styleProps.rootTags}>
        {traversals.map((traversal: Traversal, i: number) => (
          <HistoryInfoRow
            key={traversal.urlID ?? i}
            traversal={traversal}
            setShow={setShow}
            useRouteAlias={useRouteAlias}
            showSelectedTotal={showSelectedTotal}
            curAppName={curAppName}
            resetAlgorithm={resetAlgorithm}
            navigatorPressed={navigatorPressed}
          />
        ))}
      </Row>
    </Container>
  );
};

export default HistoryInfo;
