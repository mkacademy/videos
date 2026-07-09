import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Carousel, Container, Row } from "react-bootstrap";
import UiShortcuts from "../navbar/UiShortcuts";
import { RootState } from "../../store/types";
import memberCarousels from "./Carousels/Member";
import useQueryMedia from "../../Hooks/useQueryMedia";
import anonymousCarousels from "./Carousels/Anonymous";
import moderatorCarousels from "./Carousels/Moderator";
import administratorCarousels from "./Carousels/Administrator";
import useSettings, { UseSettingsReturn } from "../../Hooks/useSettings";
import RoleToggler from "../Tabulator/Authenticated/private/TableWidgets/RoleToggler";
import * as styles from "../../styles/settings.module.css";
import { AppGlobal } from "../views/wrappers/appGlobal";
import * as shortcutsStyles from "../../styles/shortcuts.module.css";
import '../../styles/indicators.module.css';
import enigmaCarousels from "./Carousels/Enigma";
import accountCarousels from "./Carousels/Account";

const characters: ((settings: UseSettingsReturn) => React.ReactNode[][][])[] = [
    anonymousCarousels,
    memberCarousels,
    moderatorCarousels,
    administratorCarousels,
    accountCarousels,
    enigmaCarousels,
];

const Screen: React.FC = () => {
    // Individual useSelector hooks for each prop
    const source = useSelector((state: RootState) => state.settings.source);
    const actor = useSelector((state: RootState) => state.settings.characters);
    const approute = useSelector((state: RootState) => state.settings.approute);
    const timestamp = useSelector((state: RootState) => state.settings.timestamp);
    const dismisstype = useSelector((state: RootState) => state.settings.dismisstype);
    const isParentSelection = useSelector((state: RootState) => state.settings.isParentSelection);
    const isMaximumFeatures = useSelector((state: RootState) =>
        !state.settings.isUnzipCourses
        && !state.settings.isUnzipQuizzes
        && !state.settings.isUnzipTutorials);
    const dispatch = useDispatch();
    const index = isMaximumFeatures ? actor : actor > 0 ? (characters.length - 2) : (characters.length - 1);
    const formations = characters[index];
    const { screen } = useQueryMedia();
    const settings = useSettings({
        dismisstype,
        isParentSelection,
        source: source ?? '',
        approute: approute ?? '',
        timestamp: timestamp ?? '',
        dispatcher: dispatch,
    });

    const [activeIndex, setActiveIndex] = useState<number>(0);
    const activeScreen = screen >= 4 ? 0 : screen === 3 ? 1 : 2;
    useEffect(() => setActiveIndex(0), [activeScreen, index]);

    return (
        <AppGlobal>
            <Carousel
                key={`${index}-${activeScreen}`}
                className={styles["settings-carousel"]}
                indicatorLabels={formations(settings)[activeScreen].map(() => 'carousel-indicator')}
                onSelect={(i: number) => setActiveIndex(i)}
                activeIndex={activeIndex}
                controls={false}
                interval={null}
                touch={false}
                slide={false}
            >
                {formations(settings)[activeScreen].map((columns: React.ReactNode[], k: number) => (
                    <Carousel.Item key={k}>
                        <Container className={styles["settings-container"]}>
                            <Row className={styles["row"]}>
                                {columns.map((component: React.ReactNode, i: number) => (
                                    <React.Fragment key={k + i}>{component}</React.Fragment>
                                ))}
                            </Row>
                        </Container>
                    </Carousel.Item>
                ))}
            </Carousel>
            <UiShortcuts convCss={shortcutsStyles["carders"]} loading={false} skeletons={false}/>
            <RoleToggler isRolePicker={false} />
        </AppGlobal>

    );
};

export default Screen; 