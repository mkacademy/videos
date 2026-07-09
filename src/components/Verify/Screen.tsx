import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import UiShortcuts from "../navbar/UiShortcuts";
import RoleToggler from "../Tabulator/Authenticated/private/TableWidgets/RoleToggler";
import Verify from "./Verify";
import { VerifyFormData } from "../../library/types";
import { verification } from "../../library/Thunks";
import { RootState } from "../../store/types";
import { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { AppGlobal } from "../views/wrappers/appGlobal";
import * as styles from "../../styles/verifyOrRegister.module.css";
import * as shortcutsStyles from "../../styles/shortcuts.module.css";

const stylesProps = {
    settingscontainer: styles["settingscontainer"],
    settingsCol1: styles["settings-col1"],
    colSm12: styles["col-sm-12"],
    colLg6: styles["col-lg-6"],
    row: styles["row"],
} 

const Screen: React.FC = () => {
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();
  
  // Using one useSelector per prop as requested
  const actor = useSelector((state: RootState) => state.settings.characters);
  const verifyAttempts = useSelector((state: RootState) => state.settings.verifyAttempts);
  
  // Modern Redux dispatch function
  const verifyAccount = (payload: VerifyFormData) => {
    dispatch(verification(payload));
  };

  return (
    <AppGlobal> 
    <React.Fragment>
      <Container className={stylesProps.settingscontainer}>
        <Row className={stylesProps.row}>
          <Col className={stylesProps.settingsCol1 + " " + stylesProps.colSm12 + " " + stylesProps.colLg6} sm={12} lg={6}>
            <Verify 
              actor={actor} 
              verifyAttempts={verifyAttempts} 
              verifyAccount={verifyAccount} 
            />
          </Col>
        </Row>
      </Container>
      <UiShortcuts convCss={shortcutsStyles["carders"]} loading={false} skeletons={false}/>
      <RoleToggler isRolePicker={false} />
    </React.Fragment>
    </AppGlobal>
  );
};

export default Screen;
