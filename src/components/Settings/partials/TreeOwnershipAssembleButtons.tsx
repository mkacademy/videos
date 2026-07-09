import React from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/types';
import * as styles from '../../../styles/settings.module.css';

const styleProps = {
  colSm12: styles['col-sm-12'],
  btnBlock: styles['btn-block'],
  reset: styles['reset'],
};

interface TreeOwnershipAssembleButtonsProps {
  handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const TreeOwnershipAssembleButtons: React.FC<TreeOwnershipAssembleButtonsProps> = ({ handleButton }) => {
  const isInsertTrees = useSelector((state: RootState) => state.settings.isInsertTrees);
  const isRemoveTrees = useSelector((state: RootState) => state.settings.isRemoveTrees);
  const assertOwnership = useSelector((state: RootState) => state.settings.assertOwnership);
  const isAssembleTexts = useSelector((state: RootState) => state.settings.isAssembleTexts);
  const isAssembleBase64 = useSelector((state: RootState) => state.settings.isAssembleBase64);

  return (
    <>
      <Row className="mb-1">
        <Col sm={6} className={styleProps.colSm12 + ' ps-0 pe-1'}>
          <Button
            className={styleProps.btnBlock + ' ' + styleProps.reset + ' w-100'}
            id="toggle-insert-trees_btn"
            onClick={handleButton}
            variant="success"
            type="button"
          >
            {isInsertTrees ? 'Plant Trees (On)' : 'Plant Trees'}
          </Button>
        </Col>
        <Col sm={6} className={styleProps.colSm12 + ' ps-0 pe-1'}>
          <Button
            className={styleProps.btnBlock + ' ' + styleProps.reset + ' w-100'}
            id="toggle-remove-trees_btn"
            onClick={handleButton}
            variant="danger"
            type="button"
          >
            {isRemoveTrees ? 'Uproot Trees (On)' : 'Uproot Trees'}
          </Button>
        </Col>
      </Row>
      <Row className="mb-1">
        <Col sm={6} className={styleProps.colSm12 + ' ps-0 pe-1'}>
          <Button
            className={styleProps.btnBlock + ' ' + styleProps.reset + ' w-100'}
            id="assert-ownership-btn"
            onClick={handleButton}
            variant="primary"
            type="button"
          >
            {assertOwnership === true ? 'Assert Ownership (On)' : 'Assert Ownership'}
          </Button>
        </Col>
        <Col sm={6} className={styleProps.colSm12 + ' ps-0 pe-1'}>
          <Button
            className={styleProps.btnBlock + ' ' + styleProps.reset + ' w-100'}
            id="unassert-ownership-btn"
            onClick={handleButton}
            variant="outline-secondary"
            type="button"
          >
            {assertOwnership === false ? 'Unassert Ownership (On)' : 'Unassert Ownership'}
          </Button>
        </Col>
      </Row>
      <Row className="mb-1">
        <Col sm={6} className={styleProps.colSm12 + ' ps-0 pe-1'}>
          <Button
            className={styleProps.btnBlock + ' ' + styleProps.reset + ' w-100'}
            id="toggle-assemble-texts_btn"
            onClick={handleButton}
            variant="secondary"
            type="button"
          >
            {isAssembleTexts ? 'Assemble Texts (On)' : 'Assemble Texts'}
          </Button>
        </Col>
        <Col sm={6} className={styleProps.colSm12 + ' ps-0 pe-1'}>
          <Button
            className={styleProps.btnBlock + ' ' + styleProps.reset + ' w-100'}
            id="toggle-assemble-base64_btn"
            onClick={handleButton}
            variant="info"
            type="button"
          >
            {isAssembleBase64 ? 'Assemble Base64 (On)' : 'Assemble Base64'}
          </Button>
        </Col>
      </Row>
    </>
  );
};

export default TreeOwnershipAssembleButtons;
