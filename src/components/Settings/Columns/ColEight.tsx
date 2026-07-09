import {
  actionAliases,
  createAliases,
  connectsAliases,
} from "../../../utils";
import React from "react";
import { memberApps } from "../../../constants";
import { useSelector } from "react-redux";
import { Col, Form, Row, ToggleButton } from "react-bootstrap";
import { RootState } from '../../../store/types';
import * as styles from "../../../styles/settings.module.css";
import TreeOwnershipAssembleButtons from "../partials/TreeOwnershipAssembleButtons";

const styleProps = {
  settingsCol3: styles["settings-col3"],
  slctbx: styles["slctbx"],
  buttonsContainer: styles["buttons-container"],
  buttonLabel: styles["button-label"],
  selectedFocus: styles["selectedFocus"],
  btnOutlinePrimary: styles["btn-outline-primary"],
  colLg6: styles["col-lg-6"],
  formCheck: styles["form-check"],
  colSm12: styles["col-sm-12"],
  row: styles["row_"],
  btnBlock: styles["btn-block"],
  reset: styles["reset"],
};

interface ColEightProps {
  children?: React.ReactNode;
  handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleSwitchLabel: (event: React.MouseEvent<HTMLElement>) => void;
  handleSwitch: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ColEight: React.FC<ColEightProps> = ({
  children,
  handleButton,
  handleSwitch,
  handleSelected,
  handleSwitchLabel,
  handleSwitchButton,
}) => {
  // Using one useSelector per prop as requested
  const txtimg = useSelector((state: RootState) => state.settings.txtimg);
  const domain = useSelector((state: RootState) => state.settings.domain);
  const action = useSelector((state: RootState) => state.settings.action);
  const txtswap = useSelector((state: RootState) => state.settings.txtswap);
  const creates = useSelector((state: RootState) => state.settings.creates);
  const userapp = useSelector((state: RootState) => state.settings.userapp);
  const adminapp = useSelector((state: RootState) => state.settings.adminapp);
  const connects = useSelector((state: RootState) => state.settings.connects);
  const memberapp = useSelector((state: RootState) => state.settings.memberapp);
  const delaccount = useSelector((state: RootState) => state.settings.delaccount);
  const availability = useSelector((state: RootState) => state.settings.availability);
  const inProgress = useSelector((state: RootState) => state.view.requestIsProcessing);

  const isCognito = domain;
  const isPrivate = availability;

  return (
    <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>
      <Row className={styleProps.colSm12 + " " + "mt-2"}>
        <Col sm={12} className={styleProps.colSm12}>
          <ToggleButton
            className={styleProps.btnOutlinePrimary + " mb-2"}
            id="toggle-account"
            type="checkbox"
            value="toggle-account"
            checked={delaccount}
            variant="outline-primary"
            onChange={handleSwitchButton}
          >
            Restrict Account
          </ToggleButton>
        </Col>
      </Row>
      <Row className={styleProps.slctbx}>
        <Col>
          <select id="action-select" value={action} onChange={handleSelected}>
            {Object.entries(actionAliases).map(([key, value], i) => (
              <option key={i} value={key}>
                {value}
              </option>
            ))}
          </select>
        </Col>
      </Row>
      <Row className={styleProps.slctbx}>
        <Col>
          <select
            id="create-select"
            value={creates}
            onChange={handleSelected}
          >
            {Object.entries(createAliases).map(([key, value], i) => (
              <option key={i} value={key}>
                {value}
              </option>
            ))}
          </select>
        </Col>
      </Row>
      <Row className={styleProps.slctbx}>
        <Col>
          <select
            id="connects-select"
            value={connects}
            disabled={inProgress}
            onChange={handleSelected}
          >
            {Object.entries(connectsAliases).map(([key, value], i) => (
              <option key={i} value={key}>
                {value}
              </option>
            ))}
          </select>
        </Col>
      </Row>
      <Row className={styleProps.row}>
        <Col>
          <h3
            id="incognito_lbl"
            onClick={handleSwitchLabel}
            className={isCognito ? "" : styleProps.selectedFocus}
          >
            Incognito
          </h3>
        </Col>
        <Col>
          <Form.Check
            type="switch"
            id="domain-switch"
          >
            <Form.Check.Input
              type="radio"
              checked={isCognito}
              className={styleProps.formCheck}
              onChange={!isCognito ? handleSwitch : () => { }}
              onClick={isCognito ? handleSwitchLabel : undefined}
            />
          </Form.Check>
        </Col>
        <Col>
          <h3
            id="cognito_lbl"
            onClick={!inProgress ? handleSwitchLabel : undefined}
            className={isCognito ? styleProps.selectedFocus : ""}
          >
            cognito
          </h3>
        </Col>
      </Row>
      <Row className={styleProps.row}>
        <Col>
          <h3
            id="public_lbl"
            onClick={handleSwitchLabel}
            className={isPrivate ? "" : styleProps.selectedFocus}
          >
            Public
          </h3>
        </Col>
        <Col>
          <Form.Check
            type="switch"
            id="availability-switch"
          >
            <Form.Check.Input
              type="radio"
              checked={isPrivate}
              className={styleProps.formCheck}
              onChange={!isPrivate ? handleSwitch : () => { }}
              onClick={isPrivate ? handleSwitchLabel : undefined} />
          </Form.Check>
        </Col>
        <Col>
          <h3
            id="private_lbl"
            onClick={handleSwitchLabel}
            className={isPrivate ? styleProps.selectedFocus : ""}
          >
            Private
          </h3>
        </Col>
      </Row>
      <Row className={styleProps.slctbx}>
        <Col sm={12} className={styleProps.colSm12}>
          <select
            value={memberapp}
            id="memberapp-select"
            onChange={handleSelected}
            disabled={userapp !== 0 || adminapp !== 0}
          >
            {Object.entries(memberApps).map(([key, value], i) => (
              <option key={i} value={key}>
                {value}
              </option>
            ))}
          </select>
        </Col>
      </Row>
      <Row>
        <Col sm={12} className={styleProps.buttonLabel + " " + styleProps.colSm12}>
          <ToggleButton
            type="checkbox"
            className={styleProps.btnOutlinePrimary + " mb-2"}
            checked={txtswap}
            id="toggle-txtswap"
            value="toggle-txtswap"
            variant="outline-primary"
            onChange={handleSwitchButton}
          >
            Swap Selected Texts
          </ToggleButton>
        </Col>
      </Row>
      <Row>
        <Col sm={12} className={styleProps.buttonLabel + " " + styleProps.colSm12}>
          <ToggleButton
            type="checkbox"
            checked={txtimg}
            className={styleProps.btnOutlinePrimary + " mb-2"}
            id="toggle-txtimg"
            value="toggle-txtimg"
            variant="outline-primary"
            onChange={handleSwitchButton}
          >
            Selected Text To Image
          </ToggleButton>
        </Col>
      </Row>
      <TreeOwnershipAssembleButtons handleButton={handleButton} />
      {children}
    </Col>
  );
};

export default ColEight;
