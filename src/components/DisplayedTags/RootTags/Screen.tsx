import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  InitLoadingPayload
} from '../../../library/actions';
import RootTag from './RootTag';
import * as menuStyles from '../../../styles/filtertags.module.css';
import { ParentData } from '../../../store/slices/viewSlice';
import { PayloadWithFromTo } from '../../../store/middleware/CrudsManager123';

const styleProps = {
  colsSmAuto: menuStyles["col-sm-auto"],
  rootTags: menuStyles["rootTags"],
  selectedRoot: menuStyles["selectedRoot"],
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

interface RootTagsProps {
  setShow: (show: boolean) => void;
  shownByShortcut: boolean;
}

const RootTags: React.FC<RootTagsProps> = ({ setShow, shownByShortcut }) => {
  const dispatch = useDispatch();
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const crudUrl = useSelector((state: RootState) => state.session.crudUrl);
  const algorithm = useSelector((state: RootState) => state.traversal.algorithm);
  const effectiveCrudUrl = shownByShortcut && (crudUrl === undefined || crudUrl === cpanelJoiner.type)
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
        {algorithm.map((traversal: Traversal, i: number) => {
          const hasCachedIds = traversal.contentIds.length > 0;
          const hasParentIds = traversal.parentData?.IDs && traversal.parentData.IDs.length > 0;
          const selectedCss = hasCachedIds
            ? styleProps.selectedRoot
            : hasParentIds
              ? styleProps.selectedRoot
              : "";
          return (
            <Col key={i} sm="auto" className={styleProps.colsSmAuto + " " + selectedCss}>
              <RootTag
                setShow={setShow}
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
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

export default RootTags; 