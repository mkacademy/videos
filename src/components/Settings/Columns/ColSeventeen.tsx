import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../store/types";
import { Button, Col, Row, ToggleButton } from "react-bootstrap";
import { styleProps } from "./ColEleven";
import { queryLimits, capitalizeFirstLetter, getCurAppName, randomizedTypeAliases } from "../../../utils";
import {
    isSequentialThunkQueueSessionActive,
    stopQueuedSequentialThunks,
} from "../../../store/middleware/sequentialThunkQueues";
import {
    isFetchSequenceConfigured,
    toggleFetchSequenceConfiguration,
} from "../../../library/convolutionNavSearch";
import AudioImportExportButtons from "../partials/AudioImportExportButtons";
import VideoImportExportButtons from "../partials/VideoImportExportButtons";

interface ColSeventeenProps {
    children?: React.ReactNode;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
    handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ColSeventeen: React.FC<ColSeventeenProps> = ({ children, handleSelected, handleButton, handleSwitchButton }) => {
    const dispatch = useDispatch();
    const shouldHydrate = useSelector((state: RootState) => state.settings.shouldHydrate);
    const queryLimit = useSelector((state: RootState) => state.settings.queryLimit);
    const fsq = useSelector((state: RootState) => state.settings.fsq);
    const includeBase64 = useSelector((state: RootState) => state.settings.includeBase64);
    const randomizedType = useSelector((state: RootState) => state.settings.randomizedType);
    const message = useSelector((state: RootState) => state.view.message);
    const requestIsProcessing = useSelector((state: RootState) => state.view.requestIsProcessing);
    const curApp = useSelector((state: RootState) => state.session.curApp);
    const curAppName = getCurAppName(curApp);
    const [hydrateDisabled, setHydrateDisabled] = useState(false);
    useSelector((state: RootState) => state.session.hydrationQueries);

    const isSequentialQueueActive = isSequentialThunkQueueSessionActive(message, requestIsProcessing);
    const isFetchSequenceConfiguredState = isFetchSequenceConfigured(shouldHydrate, fsq);

    const handleConfigureFetchSequence = () => {
        toggleFetchSequenceConfiguration(dispatch, { shouldHydrate, fsq });
    };

    const handleHydrateClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setHydrateDisabled(true);
        handleButton(event);
    };

    return (
        <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>
            <Row className="mb-2">
                <Col>
                    <Button
                        size="lg"
                        type="button"
                        id="toggle-should-hydrate-btn"
                        className="w-100"
                        onClick={handleButton}
                        variant={shouldHydrate ? "outline-success" : "outline-secondary"}
                    >
                        {shouldHydrate ? "Hydration (On)" : "Hydration (Off)"}
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select value={queryLimit} id="query-limit-select" onChange={handleSelected}>
                        {Object.entries(queryLimits).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select id="randomized-type-select" value={randomizedType} onChange={handleSelected}>
                        {Object.entries(randomizedTypeAliases).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col>
                    <Button
                        size="lg"
                        type="button"
                        id="configure-fetch-sequence-btn"
                        className="w-100"
                        variant={isFetchSequenceConfiguredState ? "outline-danger" : "outline-primary"}
                        onClick={handleConfigureFetchSequence}
                    >
                        {isFetchSequenceConfiguredState ? "UnConfigure Fetch Sequence" : "Configure Fetch Sequence"}
                    </Button>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col sm={12} className={styleProps.buttonLabel + " " + styleProps.colSm12}>
                    <ToggleButton
                        type="checkbox"
                        checked={includeBase64}
                        id="toggle-include-base64"
                        value="toggle-include-base64"
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                        className={styleProps.btnOutlinePrimary}
                    >
                        {includeBase64 ? "Included Media" : "Exclude Media"}
                    </ToggleButton>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col>
                    <Button
                        size="lg"
                        type="button"
                        id="stop-queued-saves-btn"
                        className="w-100"
                        variant="outline-danger"
                        disabled={!isSequentialQueueActive}
                        onClick={() => stopQueuedSequentialThunks(dispatch)}
                    >
                        Stop Queued Saves or Hydration
                    </Button>
                </Col>
            </Row>
            <AudioImportExportButtons />
            <VideoImportExportButtons />
            <Row className="mb-2">
                <Col>
                    <Button
                        size="lg"
                        type="button"
                        variant="secondary"
                        className="w-100"
                        id="generate-link-btn"
                        onClick={handleButton}
                    >
                        Generate URL Link
                    </Button>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col>
                    <Button
                        id="hydrate-btn"
                        size="lg"
                        type="submit"
                        variant="primary"
                        className="w-100"
                        onClick={handleHydrateClick}
                        disabled={curApp === 0 || curApp > 3 || hydrateDisabled || shouldHydrate}
                    >
                        {`Hydrate ${capitalizeFirstLetter(curAppName)}`}
                    </Button>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col>
                    <Button
                        size="lg"
                        type="button"
                        id="maximun-btn"
                        className="w-100"
                        onClick={handleButton}
                        variant="outline-warning"
                    >
                        Switch To Maximun Features View
                    </Button>
                </Col>
            </Row>
            {children}
        </Col>
    );
};

export default ColSeventeen;
