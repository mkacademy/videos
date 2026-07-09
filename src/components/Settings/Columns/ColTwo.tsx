import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { Button, Col, Row, ToggleButton } from "react-bootstrap";
import { RootState } from '../../../store/types';
import { userApps } from "../../../constants";
import { capitalizeFirstLetter, getAlias } from "../../../utils";
import * as styles from "../../../styles/settings.module.css";
import { formatOptions } from './ColFour';

const styleProps = {
    settingsCol1: styles["settings-col1"],
    slctbx: styles["slctbx"],
    settingsColLg6: styles["col-lg-6"],
    colSm12: styles["col-sm-12"],
    btnOutlinePrimary: styles["btn-outline-primary"],
    buttonLabel: styles["button-label"],
};

export const paddAliases: Record<number, string> = {
    5: "PAD_FIVE_ITEMS",
    10: "PAD_TEN_ITEMS",
    15: "PAD_FIFTHTEEN_ITEMS",
    25: "PAD_TWENTY_FIVE_ITEMS",
    50: "PAD_FIFTY_ITEMS",
    100: "PAD_HUNDRED_ITEMS",
};

export const algorithmsAliases: Record<string, string> = {
    none: "NO_ALGORITHM_SELECTED",
    sessionAlgorithm: "SESSION_ALGORITHM",
    allRoots: "ALL_ROOTS_ALGORITHM",
    usersRoots: "USERS_ROOTS_ALGORITHM",
    contentsRoots: "CONTENT_ROOTS_ALGORITHM",
    minions: "MEMBERS_ROOTS_ALGORITHM",
    underbosses: "MEDIATORS_ROOTS_ALGORITHM",
    bosses: "ADMINS_ROOTS_ALGORITHM",
    dashboards: "PARTITIONS_ROOTS_ALGORITHM",
    sifters: "CLASSIFIERS_ROOTS_ALGORITHM",
    filters: "FILTERS_ROOTS_ALGORITHM",
    instructions: "STEPS_ROOTS_ALGORITHM",
};



interface ColTwoProps {
    children?: React.ReactNode;
    handleButton: (e: React.MouseEvent<HTMLButtonElement>) => void;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isStartup?: boolean;
}

const ColTwo: React.FC<ColTwoProps> = ({
    children,
    handleButton: _handleButton,
    handleSelected,
    handleSwitchButton,
    isStartup,
}) => {
    const navigate = useNavigate();

    // Using one useSelector per prop as requested
    const child = useSelector((state: RootState) => state.view.entity);
    const iMport = useSelector((state: RootState) => state.settings.iMport);
    const eXport = useSelector((state: RootState) => state.settings.eXport);
    const exRoots = useSelector((state: RootState) => state.settings.exRoots);
    const userapp = useSelector((state: RootState) => state.settings.userapp);
    const adminapp = useSelector((state: RootState) => state.settings.adminapp);
    const memberapp = useSelector((state: RootState) => state.settings.memberapp);
    const exHistory = useSelector((state: RootState) => state.settings.exHistory);
    const formatters = useSelector((state: RootState) => state.settings.formatters);
    const characters = useSelector((state: RootState) => state.settings.characters);
    const isExtractKeys = useSelector((state: RootState) => state.settings.isExtractKeys);

    const data = capitalizeFirstLetter(getAlias(child ?? "instructions"));

    return (
        <Col className={styleProps.settingsCol1 + " " + styleProps.settingsColLg6} sm={12} lg={6}>
            <Row className="slctbx">
                <Col sm={12} className={styleProps.colSm12}>
                    <select
                        value={userapp}
                        id="userapp-select"
                        onChange={handleSelected}
                        disabled={adminapp !== 0 || memberapp !== 0}
                    >
                        {Object.entries(userApps).map(([key, value], i) => (
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
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                        id="toggle-export"
                        type="checkbox"
                        value="toggle-export"
                        checked={eXport}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        {`Export ${data}`}
                    </ToggleButton>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className={styleProps.colSm12}>
                    <ToggleButton
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                        id="toggle-import"
                        type="checkbox"
                        value="toggle-import"
                        checked={iMport}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        {`Import ${data}`}
                    </ToggleButton>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className={styleProps.colSm12}>
                    <ToggleButton
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                        id="toggle-history"
                        type="checkbox"
                        value="toggle-history"
                        checked={exHistory}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        {exHistory ? "Export History" : "Import History"}
                    </ToggleButton>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className={styleProps.colSm12 + " " + styleProps.buttonLabel}>
                    <ToggleButton
                        className={styleProps.btnOutlinePrimary}
                        id="toggle-roots"
                        type="checkbox"
                        value="toggle-roots"
                        checked={exRoots}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        {exRoots ? "Export Algorithm" : "Import Algorithm"}
                    </ToggleButton>
                </Col>
            </Row>
            {characters > 0 && (
                <Row className="mt-2">
                    <Col>
                        <Button
                            size="lg"
                            type="submit"
                            variant="primary"
                            className="w-100"
                            onClick={() => navigate("/pricingplans")}
                        >
                            View Pricing
                        </Button>
                    </Col>
                </Row>
            )}

            <Row className={styleProps.slctbx + " mt-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select value={formatters} id="formatters-select" onChange={handleSelected}>
                        {Object.entries(formatOptions).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {"HYDRATE_TO_" + value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className={styleProps.colSm12}>
                    <ToggleButton
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                        id="toggle-keywords"
                        type="checkbox"
                        value="toggle-keywords"
                        disabled={isStartup}
                        checked={isExtractKeys}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        Extract Keywords
                    </ToggleButton>
                </Col>
            </Row>
            {children}
        </Col>
    );
};

export default ColTwo; 