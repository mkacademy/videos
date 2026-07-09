import React from "react";
import { Row, Col } from "react-bootstrap";
import { FaExclamationCircle } from "react-icons/fa";
import * as commentsStyles from "../../styles/comments.module.css";
import * as modalStyles from "../../styles/modal.module.css";

export interface FormErrorMessageProps {
  children: React.ReactNode;
}

const FormErrorMessage: React.FC<FormErrorMessageProps> = ({ children }) => {
  return (
    <div className={commentsStyles["root"]}>
      <Row>
        <Col lg={12}>
          <div className={modalStyles["modal"]}>
            <div className={`card ${modalStyles["card"]}`}>
              <div
                className={`new-message-box-danger ${modalStyles["new-message-box-danger"]}`}
              >
                <div
                  className={`info-tab tip-icon-danger ${modalStyles["info-tab"]} ${modalStyles["tip-icon-danger"]}`}
                >
                  <FaExclamationCircle
                    className={`notification-icon ${modalStyles["notification-icon"]}`}
                  />
                  <i></i>
                </div>
                <div className={`tip-box-danger ${modalStyles["tip-box-danger"]}`}>
                  {children}
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default FormErrorMessage;

