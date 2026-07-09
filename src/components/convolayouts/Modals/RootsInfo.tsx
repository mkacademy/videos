import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Badge from 'react-bootstrap/Badge';
import { Col, Container, Row } from 'react-bootstrap';
import { RootState } from '../../../store/index';
import {
  destroyOverview,
  extractMocks,
  simpleClearer,
  simpleInverter,
  cpanelJoiner,
  shortcutJoiner,
  simpleSelector,
  cpanelUnjoiner,
  simpleUnselector,
  zipOverview,
  initLoading,
  escrowConvolution,
  viewConvolutionPayload,
  InitLoadingPayload,
} from '../../../library/actions';
import * as menuStyles from '../../../styles/filtertags.module.css';
import * as menutags from '../../../styles/menutags.module.css';
import * as searchTagStyles from '../../../styles/searchtags.module.css';
import { ParentData } from '../../../store/slices/viewSlice';
import { PayloadWithFromTo } from '../../../store/middleware/CrudsManager123';
import { doCrudUrlAction } from '../../../store/middleware/UiuxManager';
import { capitalizeFirstLetter, getAlias, getCurAppName, getRouteAlias } from '../../../utils';

const stayUrl = '#';

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
  /** When set and > 0, show a pill count like SearchResults (only for routes with selections). */
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

interface Traversal {
  contentIds: number[];
  parentData?: ParentData;
  to: string;
  from: string;
  toIMG: string;
  fromIMG: string;
  prefix?: string;
  encodedData: string;
  search?: string;
}

interface RootsInfoRowProps extends Traversal {
  setShow: (show: boolean) => void;
  useRouteAlias: boolean;
  showSelectedTotal: boolean;
  curAppName: string;
  crudUrl?: string;
  curApp: number;
  saveConvolution: (payload: viewConvolutionPayload) => void;
  preserveIngredients: (payload: InitLoadingPayload) => void;
  joiner?: (payload: PayloadWithFromTo) => void;
  addMocks?: (payload: PayloadWithFromTo) => void;
  zipOutgoing?: (payload: PayloadWithFromTo) => void;
  unjoiner?: (payload: PayloadWithFromTo) => void;
  inverter?: (payload: PayloadWithFromTo) => void;
  highlighter?: (payload: PayloadWithFromTo) => void;
  selectClearer?: (payload: PayloadWithFromTo) => void;
  unhighlighter?: (payload: PayloadWithFromTo) => void;
  purgeOverview?: (payload: PayloadWithFromTo) => void;
}

const RootsInfoRow: React.FC<RootsInfoRowProps> = (props) => {
  const navigate = useNavigate();
  const {
    to,
    from,
    search,
    curApp,
    prefix,
    setShow,
    crudUrl,
    parentData,
    contentIds,
    encodedData,
    saveConvolution,
    preserveIngredients,
    useRouteAlias,
    showSelectedTotal,
    curAppName,
    ...remainingprops
  } = props;

  const appUrl = (prefix ?? '') + to + '/' + encodedData + (search ?? '');
  let nextUrl = appUrl;
  if (crudUrl) {
    if (crudUrl.indexOf('formulator') > -1) nextUrl = crudUrl + to;
    else nextUrl = stayUrl;
  }

  const handleActivate = () => {
    if (contentIds.length > 0) saveConvolution({ from, to, contentIds, curApp });
    if (crudUrl) doCrudUrlAction({ crudUrl, from, to, ...remainingprops });
    const _parentData = {
      IDs: parentData?.IDs || [],
      parent: parentData?.parent || '',
      curApp: parentData?.curApp || 1,
    };
    preserveIngredients({ parentData: _parentData, entity: to, search, prefix: prefix ?? '' });
    if (nextUrl !== stayUrl) navigate(nextUrl);
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

interface RootsInfoProps {
  setShow: (show: boolean) => void;
  shownByShortcut: boolean;
  useRouteAlias: boolean;
  showSelectedTotal: boolean;
}

const RootsInfo: React.FC<RootsInfoProps> = ({
  setShow,
  shownByShortcut,
  useRouteAlias,
  showSelectedTotal,
}) => {
  const dispatch = useDispatch();
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const curAppName = getCurAppName(curApp);
  const crudUrl = useSelector((state: RootState) => state.session.crudUrl);
  const algorithm = useSelector((state: RootState) => state.traversal.algorithm);
  const effectiveCrudUrl =
    shownByShortcut && (crudUrl === undefined || crudUrl === cpanelJoiner.type)
      ? shortcutJoiner.type
      : crudUrl;
  const Joiner = (payload: PayloadWithFromTo) =>
    dispatch((shownByShortcut ? shortcutJoiner : cpanelJoiner)(payload));
  const AddMocks = (payload: PayloadWithFromTo) => dispatch(extractMocks(payload));
  const ZipOutgoing = (payload: PayloadWithFromTo) => dispatch(zipOverview(payload));
  const Unjoiner = (payload: PayloadWithFromTo) => dispatch(cpanelUnjoiner(payload));
  const Inverter = (payload: PayloadWithFromTo) => dispatch(simpleInverter(payload));
  const Highlighter = (payload: PayloadWithFromTo) => dispatch(simpleSelector(payload));
  const SelectClearer = (payload: PayloadWithFromTo) => dispatch(simpleClearer(payload));
  const Unhighlighter = (payload: PayloadWithFromTo) => dispatch(simpleUnselector(payload));
  const PurgeOverview = (payload: PayloadWithFromTo) => dispatch(destroyOverview(payload));
  const PreserveIngredients = (payload: InitLoadingPayload) => dispatch(initLoading(payload));
  const SaveConvolution = (payload: viewConvolutionPayload) => dispatch(escrowConvolution(payload));

  return (
    <Container>
      <Row className={styleProps.rootTags}>
        {algorithm.map((traversal: Traversal, i: number) => (
          <RootsInfoRow
            key={i}
            setShow={setShow}
            useRouteAlias={useRouteAlias}
            showSelectedTotal={showSelectedTotal}
            curAppName={curAppName}
            {...traversal}
            crudUrl={effectiveCrudUrl}
            curApp={curApp}
            joiner={Joiner}
            addMocks={AddMocks}
            zipOutgoing={ZipOutgoing}
            unjoiner={Unjoiner}
            inverter={Inverter}
            highlighter={Highlighter}
            selectClearer={SelectClearer}
            unhighlighter={Unhighlighter}
            purgeOverview={PurgeOverview}
            saveConvolution={SaveConvolution}
            preserveIngredients={PreserveIngredients}
          />
        ))}
      </Row>
    </Container>
  );
};

export default RootsInfo;
