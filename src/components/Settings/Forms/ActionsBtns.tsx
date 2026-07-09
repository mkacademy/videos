import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Row, Button, Col } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";

import {
    discardPayloads,
} from "../../../library/actions";
import { RootState } from "../../../store/types";
import * as styles from "../../../styles/settings.module.css";
import { useSignOut } from "../../../Hooks/useSignOut";

const styleProps = {
    applyText: styles["apply-text"],
    exit: styles["exit"],
    buttonsContainer: styles["buttons-container"],
    colSm12: styles["col-sm-12"],
    btnBlock: styles["btn-block"],
    reset: styles["reset"],
};

interface EnterAndExitProps {
    isValid: boolean;
    isStartup: boolean;
    inProgress: boolean;
    goBack: (e: React.MouseEvent) => void;
    onEnter: (proceed: React.MouseEvent) => void;
}

interface ApplyActionButtonsProps {
    inProgress: boolean;
    apply: (e: React.MouseEvent) => void;
    onWait: (e: React.MouseEvent) => void;
}

export const ShutdownAndExitLink: React.FC = () => {
    const dispatch = useDispatch();
    const { pathname, search } = useLocation();

    // One useSelector per prop
    const requestIsProcessing = useSelector((state: RootState) => state.view.requestIsProcessing);
    const authenticated = useSelector((state: RootState) => state.session.authenticated);

    const inProgress = requestIsProcessing;
    const signOut = useSignOut();

    const cancelPending = () => dispatch(discardPayloads());

    const handleShutdownAndExit = (e: React.MouseEvent) => {
        e.preventDefault();
        signOut(pathname + search);
    };

    return (
        <React.Fragment>
            {inProgress ? (
                <Row>
                    <Col className={styleProps.applyText}>
                        <Link className={styleProps.exit} to="#" onClick={cancelPending}>
                            Cancel pending background actions
                        </Link>
                    </Col>
                </Row>
            ) : (
                <Row>
                    <Col className={styleProps.applyText}>
                        <Link
                            to="#"
                            className={styleProps.exit}
                            onClick={handleShutdownAndExit}
                        >
                            {`Shutdown session and ${authenticated ? "Exit" : "Login"}`}
                        </Link>
                    </Col>
                </Row>
            )}
        </React.Fragment>
    );
};

export const EnterAndExit: React.FC<EnterAndExitProps> = ({
    inProgress,
    isStartup,
    goBack,
    isValid,
    onEnter,
}) => {
    return (
        <Row>
            <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={5} lg={4}>
                <Button
                    variant="warning"
                    className={styleProps.btnBlock + " " + styleProps.reset}
                    disabled={isStartup}
                    onClick={goBack}
                >
                    Exit
                </Button>
            </Col>
            <Col>
                <Button
                    onClick={onEnter}
                    variant="success"
                    disabled={!isValid || inProgress}
                    className={styleProps.btnBlock + " " + styleProps.reset}
                >
                    Enter
                </Button>
            </Col>
        </Row>
    );
};

export const ApplyActionButtons: React.FC<ApplyActionButtonsProps> = ({ inProgress, apply, onWait }) => {
    if (inProgress) return null;

    return (
        <Row className="mb-1">
            <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                <Button
                    type="button"
                    variant="primary"
                    className="reset w-100"
                    onClick={apply}
                >
                    Apply and Exit
                </Button>
            </Col>
            <Col>
                <Button
                    type="button"
                    variant="success"
                    className="reset w-100"
                    onClick={onWait}
                >
                    Apply and wait
                </Button>
            </Col>
        </Row>
    );
};
