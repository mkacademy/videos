import React from 'react';
import { useSelector } from 'react-redux';
import { Button, Col, Row, ToggleButton } from "react-bootstrap";
import { RootState } from '../../../store/types';
import {
    deltionSizes,
    quotaOptions,
    sessionSizes,
} from "../../../utils";
import { adminsApps } from "../../../constants";
import { algorithmsAliases } from "./ColTwo";
import * as styles from "../../../styles/settings.module.css";

const styleProps = {
    settingsCol3: styles["settings-col3"],
    buttonLabel: styles["button-label"],
    slctbx: styles["slctbx"],
    buttonsContainer: styles["buttons-container"],
    colLg6: styles["col-lg-6"],
    colSm12: styles["col-sm-12"],
    btnOutlinePrimary: styles["btn-outline-primary"],
};

interface ColNineProps {
    isStartup?: boolean;
    children?: React.ReactNode;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ColNine: React.FC<ColNineProps> = ({
    children,
    isStartup,
    handleButton,
    handleSelected,
    handleSwitchButton,
}) => {
    // Using one useSelector per prop as requested
    const quota = useSelector((state: RootState) => state.settings.quota);
    const txtimg = useSelector((state: RootState) => state.settings.txtimg);
    const dowTok = useSelector((state: RootState) => state.settings.dowTok);
    const userapp = useSelector((state: RootState) => state.settings.userapp);
    const txtswap = useSelector((state: RootState) => state.settings.txtswap);
    const seconds = useSelector((state: RootState) => state.settings.seconds);
    const adminapp = useSelector((state: RootState) => state.settings.adminapp);
    const algorithm = useSelector((state: RootState) => state.settings.algorithm);
    const memberapp = useSelector((state: RootState) => state.settings.memberapp);
    const isEnabled = useSelector((state: RootState) => state.settings.isEnabled);
    const isDemoted = useSelector((state: RootState) => state.settings.isDemoted);
    const isPromoted = useSelector((state: RootState) => state.settings.isPromoted);
    const isDisabled = useSelector((state: RootState) => state.settings.isDisabled);
    const isExtractAlgo = useSelector((state: RootState) => state.settings.isExtractAlgo);
    const deletedOrphans = useSelector((state: RootState) => state.settings.deletedOrphans);

    return (
        <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>
            <Row className=" mt-2">
                <Col sm={12} className={styleProps.buttonLabel + " " + styleProps.colSm12}>
                    <ToggleButton
                        type="checkbox"
                        checked={txtswap}
                        id="toggle-txtswap"
                        value="toggle-txtswap"
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                        className={styleProps.btnOutlinePrimary + " mb-2"}
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
                        id="toggle-txtimg"
                        value="toggle-txtimg"
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                    >
                        Selected Text To Image
                    </ToggleButton>
                </Col>
            </Row>
            <Row className={styleProps.slctbx}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select value={quota} id="quota-select" onChange={handleSelected}>
                        {Object.entries(quotaOptions).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        disabled={isPromoted === true}
                        className="reset w-100"
                        id="promote-selected_btn"
                        onClick={handleButton}
                        variant="success"
                        type="button"
                    >
                        Promote Selected
                    </Button>
                </Col>
                <Col>
                    <Button
                        disabled={isDemoted === true}
                        className="reset w-100"
                        id="demote-selected_btn"
                        onClick={handleButton}
                        variant="danger"
                        type="button"
                    >
                        Demote Selected
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        disabled={isEnabled === true}
                        className="reset w-100"
                        id="enable-selected_btn"
                        onClick={handleButton}
                        variant="success"
                        type="button"
                    >
                        DeRestrict Selected
                    </Button>
                </Col>
                <Col>
                    <Button
                        disabled={isDisabled === true}
                        className="reset w-100"
                        id="disable-selected_btn"
                        onClick={handleButton}
                        variant="danger"
                        type="button"
                    >
                        Restrict Selected
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mt-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select
                        value={adminapp}
                        id="adminapp-select"
                        onChange={handleSelected}
                        disabled={userapp !== 0 || memberapp !== 0}
                    >
                        {Object.entries(adminsApps).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className="slctbx">
                <Col sm={12} className={styleProps.colSm12}>
                    <select
                        value={deletedOrphans}
                        onChange={handleSelected}
                        id="orphansdeletion-select"
                    >
                        {Object.entries(deltionSizes).map(([key, value], i) => (
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
                        checked={dowTok}
                        id="toggle-dowTok"
                        value="toggle-dowTok"
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                    >
                        Download Voucher
                    </ToggleButton>
                </Col>
            </Row>
            <Row className={styleProps.slctbx}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select
                        value={seconds}
                        id="seconds-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(sessionSizes).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mt-2"}>
                <Col className={styleProps.colSm12}>
                    <select
                        value={algorithm}
                        id="algorithm-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(algorithmsAliases).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className={styleProps.colSm12}>
                    <ToggleButton
                        type="checkbox"
                        disabled={isStartup}
                        id="toggle-algorithm"
                        checked={isExtractAlgo}
                        value="toggle-algorithm"
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                    >
                        Extract Algorithm
                    </ToggleButton>
                </Col>
            </Row>
            {children}
        </Col>
    );
};

export default ColNine; 