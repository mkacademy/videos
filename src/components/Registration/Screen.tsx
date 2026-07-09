import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import UiShortcuts from "../navbar/UiShortcuts";
import RoleToggler from "../Tabulator/Authenticated/private/TableWidgets/RoleToggler";
import Register from "./Register";
import Login from "./Login";
import { RootState } from "../../store/types";
import {
    initSettings,
    accountMutation,
} from "../../library/actions";
import { FormData } from "../../library/types";
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
    const dispatch = useDispatch();
    const email = useSelector((state: RootState) => state.settings.email);
    const actor = useSelector((state: RootState) => state.settings.characters);
    const username = useSelector((state: RootState) => state.settings.username);
    const mutateRole = useSelector((state: RootState) => state.session.mutateRole);
    const amendAttempts = useSelector((state: RootState) => state.settings.amendAttempts);
    const registerAttempts = useSelector((state: RootState) => state.settings.registerAttempts);

    // Local state
    const [isLogin, setIsLogin] = useState<boolean>(false);

    // Action dispatchers
    const reloadSettings = () => setTimeout(() => dispatch(initSettings()));
    const mutateAccount = (payload: FormData) => dispatch(accountMutation(payload));
    return (
        <AppGlobal>
            <React.Fragment>
                <Container className={stylesProps.settingscontainer}>
                    <Row className={stylesProps.row}>
                        <Col className={stylesProps.settingsCol1 + " " + stylesProps.colSm12 + " " + stylesProps.colLg6} sm={12} lg={6}>
                            {!isLogin && (
                                <Register
                                    actor={actor}
                                    email={email}
                                    username={username}
                                    amendAttempts={amendAttempts}
                                    mutateAccount={mutateAccount}
                                    reloadSettings={reloadSettings}
                                    registerAttempts={registerAttempts}
                                    mutateRole={mutateRole ?? "ROLE_USER"}
                                    setIsLogin={setIsLogin}
                                />
                            )}
                            {isLogin && (
                                <Login
                                    actor={actor}
                                    mutateAccount={mutateAccount}
                                    reloadSettings={reloadSettings}
                                    registerAttempts={registerAttempts}
                                    setIsLogin={setIsLogin}
                                />
                            )}
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
