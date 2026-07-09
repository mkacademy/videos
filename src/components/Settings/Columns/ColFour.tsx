import React from 'react';
import { Action } from "@reduxjs/toolkit";
import { Button, Col, Form, Row } from "react-bootstrap";
import { acceptedFiles } from "../../../utils";
import TimestampEdit from "../Forms/TimestampEdit";
import * as styles from "../../../styles/settings.module.css";
import {
    isDirectoryExportSupported,
    isDirectoryPickerSupported,
} from '../../../library/directoryTreeUtils';
import { useColFour, zipables, unzipables } from '../../../Hooks/useColFour';

export { zipables, unzipables };

const styleProps = {
    settingsCol3: styles["settings-col3"],
    slctbx: styles["slctbx"],
    buttonsContainer: styles["buttons-container"],
    buttonLabel: styles["button-label"],
    reset: styles["reset"],
    colLg6: styles["col-lg-6"],
    colSm12: styles["col-sm-12"],
    btnBlock: styles["btn-block"],
    formControlFile: styles["form-control-file"],
};

export const formatOptions: Record<string, string> = {
    app: "APP_ONLY",
    cpanel: "CPANEL_ONLY",
    cpanelapp: "CPANEL_PLUS_APP",
};

interface ColFourProps {
    children?: React.ReactNode;
    handleSubmitBtn: (payload: Action) => void;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ColFour: React.FC<ColFourProps> = ({
    children,
    handleButton,
    handleFileInput,
    handleSelected,
    handleSubmitBtn,
}) => {
    const {
        source,
        approute,
        timestamp,
        formatters,
        seltype,
        inProgress,
        btnMsg,
        clrDisbaled,
        zipDisabled,
        unzipDisabled,
        uplDisbaled,
        uplMsg0,
        uplMsg1,
        zipVariant,
        curapps,
        routeAliases,
        timestamps,
        name,
        fromto,
        params,
        handleBrowseDirectory,
        handleExportDirectory,
        handleBrowseTextFolder,
        handleExportTextFolder,
    } = useColFour({ handleSubmitBtn });

    return (
        <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>
            <Row className={styleProps.slctbx + " mt-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select value={source} id="source-select" onChange={handleSelected}>
                        {curapps.map(([key, value], i) => (
                            <option key={i} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mt-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select
                        value={approute}
                        id="approute-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(routeAliases).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mt-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select
                        value={timestamp}
                        id="timestamp-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(timestamps).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {i > 0 ? key : value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        disabled={fromto === undefined}
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        id="create-timestamp_btn"
                        onClick={handleButton}
                        variant="success"
                        type="button"
                    >
                        Create Timestamp
                    </Button>
                </Col>
                <Col>
                    <Button
                        disabled={name === undefined}
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        id="remove-timestamp_btn"
                        onClick={handleButton}
                        variant="danger"
                        type="button"
                    >
                        Remove Timestamp
                    </Button>
                </Col>
            </Row>
            <TimestampEdit {...params} />
            <Row className="mb-1">
                <Col className={styleProps.colLg6 + " " + styleProps.colSm12 + " " + "m-auto"} sm={12} md={5} lg={6}>
                    <Form.Control
                        multiple
                        size="lg"
                        className={styleProps.formControlFile}
                        type="file"
                        id="images_select"
                        disabled={inProgress}
                        accept={acceptedFiles}
                        onChange={handleFileInput}
                    />
                </Col>
                <Col>
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        id="onboard-images_btn"
                        onClick={handleButton}
                        disabled={uplDisbaled}
                        type="button"
                    >
                        {uplMsg0}
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col sm={6} className={styleProps.colSm12 + " ps-0 pe-1"}>
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " w-100"}
                        onClick={handleBrowseDirectory}
                        variant="outline-secondary"
                        type="button"
                        disabled={inProgress || !isDirectoryPickerSupported()}
                    >
                        Import Albums
                    </Button>
                </Col>
                <Col sm={6} className={styleProps.colSm12 + " ps-0 pe-1"}>
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " w-100"}
                        onClick={handleExportDirectory}
                        variant="outline-secondary"
                        type="button"
                        disabled={inProgress || !isDirectoryExportSupported()}
                    >
                        Export Directory
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col sm={6} className={styleProps.colSm12 + " ps-0 pe-1"}>
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " w-100"}
                        onClick={handleBrowseTextFolder}
                        variant="outline-secondary"
                        type="button"
                        disabled={inProgress || !isDirectoryPickerSupported()}
                    >
                        Import Files
                    </Button>
                </Col>
                <Col sm={6} className={styleProps.colSm12 + " ps-0 pe-1"}>
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " w-100"}
                        onClick={handleExportTextFolder}
                        variant="outline-secondary"
                        type="button"
                        disabled={inProgress || !isDirectoryExportSupported()}
                    >
                        Export Folder
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        disabled={clrDisbaled}
                        onClick={handleButton}
                        id="clear-images_btn"
                        variant="danger"
                        type="button"
                    >
                        Discard All
                    </Button>
                </Col>
                <Col>
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        disabled={clrDisbaled}
                        onClick={handleButton}
                        id="insert-steps_btn"
                        variant="secondary"
                        type="button"
                    >
                        {uplMsg1}
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        id="extract-dismissed_btn"
                        onClick={handleButton}
                        variant="info"
                        type="button"
                    >
                        {seltype ? "Stash Highlighted" : "Stash Dismissed"}
                    </Button>
                </Col>
                <Col>
                    <Button
                        id="extract-undismissed_btn"
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        onClick={handleButton}
                        variant="secondary"
                        type="button"
                    >
                        {seltype ? "Stash unHighlighted" : "Stash unDismissed"}
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        id="extract-selected_btn"
                        onClick={handleButton}
                        variant="secondary"
                        type="button"
                    >
                        unStash Selected
                    </Button>
                </Col>
                <Col>
                    <Button
                        id="extract-unselected_btn"
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        onClick={handleButton}
                        variant="info"
                        type="button"
                    >
                        unStash unSelected
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col sm={6} md={2} className="ps-0 pe-1">
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        disabled={zipDisabled}
                        onClick={handleButton}
                        variant="info"
                        type="button"
                        id="zip_btn"
                    >
                        Zip
                    </Button>
                </Col>
                <Col sm={6} md={4} className="ps-0 pe-1">
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        disabled={unzipDisabled}
                        onClick={handleButton}
                        variant="secondary"
                        id="unzip_btn"
                        type="button"
                    >
                        Unzip
                    </Button>
                </Col>
                <Col>
                    <Button
                        id="toggle-dismissType_btn"
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        onClick={handleButton}
                        variant={zipVariant}
                        type="button"
                    >
                        {btnMsg}
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mt-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select
                        value={formatters}
                        id="formatters-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(formatOptions).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {"TRANSFTER_TO_" + value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            {children}
        </Col>
    );
};

export default ColFour;
