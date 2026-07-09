import React from 'react';
import { Col, Button, Row } from 'react-bootstrap';
import * as styles from '../../../styles/settings.module.css';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/types';

const styleProps = {
    settingsCol3: styles['settings-col3'],
    colLg6: styles['col-lg-6'],
    btnBlock: styles['btn-block'],
    reset: styles['reset'],
};

interface ColThirteenProps {
    children?: React.ReactNode;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
const ColThirteen: React.FC<ColThirteenProps> = ({
    children,
    handleButton,
}) => {
    const status = useSelector((state: RootState) => state.settings.status);
    return (
        <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>
                       <Row className="mb-1">
                <Col sm={4} className="ps-0 pe-0">
                    <Button
                        className={styleProps.btnBlock + " " + styleProps.reset + " " + "w-100"}
                        disabled={status === 0}
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
                        disabled={status === 1}
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
                        disabled={status === 2}
                        onClick={handleButton}
                        id="rejected_btn"
                        variant="danger"
                        type="button"
                    >
                        {status === 2 ? "Rejected (On)" : "Rejected"}
                    </Button>
                </Col>
            </Row>
            {children}
        </Col>
    );
};

export default ColThirteen;