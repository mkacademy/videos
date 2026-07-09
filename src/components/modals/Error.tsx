import { useEffect, useState } from "react";
import { Modal, Row } from "react-bootstrap";
import type { RootState } from "../../store/types";
import { FaExclamationCircle } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { clearOnlyErrors, clearOnlyWarnings, removeError } from "../../store/slices/errorSlice";
import * as styles from "../../styles/modal.module.css";
type ActivityVariant = "error" | "warning";

interface ActivityStyleProps {
    card: string;
    dismissBtn: string;
    infoTab: string;
    tipBox: string;
    tipIcon: string;
    notificationIcon: string;
    messageBox: string;
}

interface ActivityProps {
    variant: ActivityVariant;
    dismisser: (id: number) => void;
    message: string;
    id: number;
}

const errorActivityStyles: ActivityStyleProps = {
    card: styles["card"],
    dismissBtn: styles["dismissBtn"],
    infoTab: styles["info-tab"],
    tipBox: styles["tip-box-danger"],
    tipIcon: styles["tip-icon-danger"],
    notificationIcon: styles["notification-icon"],
    messageBox: styles["new-message-box-danger"],
};

const warningActivityStyles: ActivityStyleProps = {
    card: styles["card"],
    dismissBtn: styles["dismissBtn"],
    infoTab: styles["info-tab"],
    tipBox: styles["tip-box-warning"],
    tipIcon: styles["tip-icon-warning"],
    notificationIcon: styles["notification-icon"],
    messageBox: styles["new-message-box-warning"],
};

const Activity = ({ message, dismisser, id, variant }: ActivityProps) => {
    const dismissHandler = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dismisser(id);
    };

    const styleProps: ActivityStyleProps =
        variant === "warning" ? warningActivityStyles : errorActivityStyles;
    const messageBoxClass =
        variant === "warning" ? "new-message-box-warning" : "new-message-box-danger";
    const tipIconClass = variant === "warning" ? "tip-icon-warning" : "tip-icon-danger";
    const tipBoxClass = variant === "warning" ? "tip-box-warning" : "tip-box-danger";

    return (
        <div className={`card ${styleProps.card}`}>
            <span className={`dismissBtn ${styleProps.dismissBtn}`} onClick={dismissHandler}>
                x
            </span>
            <div className={`${messageBoxClass} ${styleProps.messageBox}`}>
                <div className={`info-tab ${tipIconClass} ${styleProps.infoTab} ${styleProps.tipIcon}`}>
                    <FaExclamationCircle className={`notification-icon ${styleProps.notificationIcon}`} />
                    <i></i>
                </div>
                <div className={`${tipBoxClass} ${styleProps.tipBox}`}>
                    <p>{message}</p>
                </div>
            </div>
        </div>
    );
};

const ErrorModal = () => {
    const dispatch = useDispatch();
    const [show, setShow] = useState(false);
    const errors = useSelector((state: RootState) => state.error.errors);
    const warnings = useSelector((state: RootState) => state.error.warnings);
    const showCount = useSelector((state: RootState) => state.error.showCount);

    useEffect(() => setShow(showCount > 0), [showCount]);
    const handleDismiss = (id: number) => {
        dispatch(removeError(id));
    };
    const handleDismissErrors = () => {
        dispatch(clearOnlyErrors());
    };
    const handleDismissWarnings = () => {
        dispatch(clearOnlyWarnings());
    };

    return (
        <Modal
            show={show}
            dialogClassName="modal-90w"
            onHide={() => setShow(false)}
            aria-labelledby="root-modal"
        >
            <Modal.Header
                closeButton
                onHide={handleDismissErrors}
                onClick={handleDismissWarnings}>
                <Modal.Title id="root-modal">ACTIVITY</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row className={styles["modal"]}>
                    {errors.map((message: string, i: number) => (
                        <div key={`err-${i}`} className={styles["col-12"]}>
                            <Activity
                                message={message}
                                id={i}
                                dismisser={handleDismiss}
                                variant="error"
                            />
                        </div>
                    ))}
                    {warnings.map((message: string, i: number) => (
                        <div key={`warn-${i}`} className={styles["col-12"]}>
                            <Activity
                                message={message}
                                id={errors.length + i}
                                dismisser={handleDismiss}
                                variant="warning"
                            />
                        </div>
                    ))}
                </Row>
            </Modal.Body>
        </Modal>
    );
};

export default ErrorModal;
