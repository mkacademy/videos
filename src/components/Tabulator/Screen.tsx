import React from "react";
import Routes from "../navbar/Routes";
import { Col, Container, Row } from "react-bootstrap";
import Navbar from "../navbar/Navbar";
import UiShortcuts from "../navbar/UiShortcuts";
import FileManager from "../views/FileManager";
import DisplayedTags from "../DisplayedTags/MenuTags/Screen";
import { AppGlobal } from "../views/wrappers/appGlobal";
import * as shortcutsStyles from "../../styles/shortcuts.module.css";
import { useCurRoutes } from "../../Hooks/useQueryMedia";

const Screen: React.FC = () => {
    useCurRoutes();
    return (
        <AppGlobal>
            <Container>
                <Row className="rendered">
                    <Col>
                        <Navbar />
                    </Col>
                </Row>
                <DisplayedTags />
                <Routes />
                <FileManager />
                <UiShortcuts convCss={shortcutsStyles["carders"]} loading={false} skeletons={false}/>
            </Container>
        </AppGlobal>

    );
};

export default Screen;
