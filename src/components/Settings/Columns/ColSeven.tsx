import React from 'react';
import { useSelector } from 'react-redux';
import { Button, Col, Form, Row, ToggleButton } from "react-bootstrap";
import { RootState } from '../../../store/types';
import {
    actionAliases,
    connectsAliases,
    createAliases,
    roleAliases,
    catalinaSizes,
} from "../../../utils";
import { memberApps } from "../../../constants";
import * as styles from "../../../styles/settings.module.css";
import TreeOwnershipAssembleButtons from "../partials/TreeOwnershipAssembleButtons";

const styleProps = {
    settingsCol2: styles["settings-col2"],
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

interface ColSevenProps {
    children?: React.ReactNode;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
    handleSwitch: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleSwitchLabel: (event: React.MouseEvent<HTMLElement>) => void;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ColSeven: React.FC<ColSevenProps> = ({
    children,
    handleButton,
    handleSwitch,
    handleSelected,
    handleSwitchLabel,
    handleSwitchButton,
}) => {
    // Using one useSelector per prop as requested
    const role = useSelector((state: RootState) => state.settings.role);
    const roles = useSelector((state: RootState) => state.session.roles);
    const status = useSelector((state: RootState) => state.settings.status);
    const domain = useSelector((state: RootState) => state.settings.domain);
    const action = useSelector((state: RootState) => state.settings.action);
    const userapp = useSelector((state: RootState) => state.settings.userapp);
    const creates = useSelector((state: RootState) => state.settings.creates);
    const catalina = useSelector((state: RootState) => state.settings.catalina);
    const connects = useSelector((state: RootState) => state.settings.connects);
    const adminapp = useSelector((state: RootState) => state.settings.adminapp);
    const memberapp = useSelector((state: RootState) => state.settings.memberapp);
    const delaccount = useSelector((state: RootState) => state.settings.delaccount);
    const availability = useSelector((state: RootState) => state.settings.availability);
    const inProgress = useSelector((state: RootState) => state.view.requestIsProcessing);

    // Renamed props from original implementation
    const isCognito = domain;
    const isPrivate = availability;

    return (
        <Col className={styleProps.settingsCol2 + " " + styleProps.colLg6} sm={12} lg={6}>
            <Row className="mt-2">
                <Col sm={12} className={styleProps.colSm12}>
                    <ToggleButton
                        id="toggle-account"
                        type="checkbox"
                        value="toggle-account"
                        checked={delaccount}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                    >
                        Restrict Account
                    </ToggleButton>
                </Col>
            </Row>
            <Row className={styleProps.slctbx}>
                <Col>
                    <select id="role-select" value={role} onChange={handleSelected}>
                        {roles?.map((role, i) => (
                            <option key={i} value={role}>
                                {roleAliases[role]}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className="slctbx">
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
                            onClick={isCognito ? handleSwitchLabel : undefined} />
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
                <Col>
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
            <Row className={styleProps.slctbx}>
                <Col>
                    <select
                        value={catalina}
                        id="catalina-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(catalinaSizes).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col sm={4} className="ps-0 pe-0">
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        onClick={handleButton}
                        variant="warning"
                        id="pending_btn"
                        type="button"
                    >
                        {status === 0 ? "Pending (On)" : "Pending"}
                    </Button>
                </Col>
                <Col sm={4}  className="ps-1 pe-1">
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        onClick={handleButton}
                        variant="success"
                        id="approved_btn"
                        type="button"
                    >
                        {status === 1 ? "Approved (On)" : "Approved"}
                    </Button>
                </Col>
                <Col sm={4} className="ps-0 pe-0">
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        onClick={handleButton}
                        id="rejected_btn"
                        variant="danger"
                        type="button"
                    >
                        {status === 2 ? "Rejected (On)" : "Rejected"}
                    </Button>
                </Col>
            </Row>
            <TreeOwnershipAssembleButtons handleButton={handleButton} />
            {children}
        </Col>
    );
};

export default ColSeven; 