import { Button, Col, Row, ToggleButton } from "react-bootstrap";
import * as styles from "../../../styles/settings.module.css";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/types";
const cacheOptions: Record<string, string> = {
    ids: "IDS_ONLY",
    rows: "ROWS_ONLY",
    idsrows: "ROWS_PLUS_IDS",
};

export const styleProps = {
    settingsCol3: styles["settings-col3"],
    colLg6: styles["col-lg-6"],
    colSm12: styles["col-sm-12"],
    buttonLabel: styles["button-label"],
    btnOutlinePrimary: styles["btn-outline-primary"],
    slctbx: styles["slctbx"],
};
export const unzipOptions: Record<string, string> = {
    incoming: "INCOMING_ONLY",
    outgoing: "OUTGOING_ONLY",
    incoming_and_outgoing: "INCOMING_AND_OUTGOING",
};
export interface ColElevenProps {
    children?: React.ReactNode;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
const ColEleven: React.FC<ColElevenProps> = ({ children, handleSelected, handleSwitchButton, handleButton }) => {
    const unzipTutorialsType = useSelector((state: RootState) => state.settings.unzipTutorialsType);
    const unzipCoursesType = useSelector((state: RootState) => state.settings.unzipCoursesType);
    const unzipQuizzesType = useSelector((state: RootState) => state.settings.unzipQuizzesType);
    const isUnzipTutorials = useSelector((state: RootState) => state.settings.isUnzipTutorials_);
    const isUnzipCourses = useSelector((state: RootState) => state.settings.isUnzipCourses_);
    const isUnzipQuizzes = useSelector((state: RootState) => state.settings.isUnzipQuizzes_);
    const clearType = useSelector((state: RootState) => state.settings.clearType);
    const cacher = useSelector((state: RootState) => state.settings.cacher);
    const isDisabled = isUnzipCourses === false && isUnzipTutorials === false && isUnzipQuizzes === false;
    return (
        <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>

            <Row>
                <Col sm={12} className={styleProps.colSm12 + " " + styleProps.buttonLabel}>
                    <ToggleButton
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                        type="checkbox"
                        checked={isUnzipCourses}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                        id="toggle-unzip-coursez_btn"
                        value="toggle-unzip-coursez_btn"
                    >
                        {isUnzipCourses ? "Auto unzip Courses" : "Manual unzip Courses"}
                    </ToggleButton>
                </Col>
            </Row>
            <Row className={styleProps.slctbx}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select value={unzipCoursesType} id="unzip-courses-select" onChange={handleSelected}>
                        {Object.entries(unzipOptions).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {"UNZIP_FROM_" + value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className={styleProps.colSm12 + " " + styleProps.buttonLabel}>
                    <ToggleButton
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                        type="checkbox"
                        variant="outline-primary"
                        checked={isUnzipTutorials}
                        onChange={handleSwitchButton}
                        id="toggle-unzip-tutorialz_btn"
                        value="toggle-unzip-tutorialz_btn"
                    >
                        {isUnzipTutorials ? "Auto unzip Tutorials" : "Manual unzip Tutorials"}
                    </ToggleButton>
                </Col>
            </Row>
            <Row className={styleProps.slctbx}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select value={unzipTutorialsType} id="unzip-tutorials-select" onChange={handleSelected}>
                        {Object.entries(unzipOptions).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {"UNZIP_FROM_" + value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className={styleProps.colSm12 + " " + styleProps.buttonLabel}>
                    <ToggleButton
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                        type="checkbox"
                        id="toggle-unzip-quizz_btn"
                        value="toggle-unzip-quizz_btn"
                        checked={isUnzipQuizzes}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        {isUnzipQuizzes ? "Auto unzip Quizzes" : "Manual unzip Quizzes"}
                    </ToggleButton>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select value={unzipQuizzesType} id="unzip-quizzes-select" onChange={handleSelected}>
                        {Object.entries(unzipOptions).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {"UNZIP_FROM_" + value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className={styleProps.buttonLabel + " " + styleProps.colSm12}>
                    <ToggleButton
                        type="checkbox"
                        checked={clearType}
                        id="toggle-clear-type_btn"
                        value="toggle-clear-type_btn"
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                    >
                        {clearType ? "Clear Highlighted" : "Dismiss Highlighted"}
                    </ToggleButton>
                </Col>
            </Row>
            <Row className={styleProps.slctbx}>
                <Col>
                    <select value={cacher} id="cacher-select" onChange={handleSelected}>
                        {Object.entries(cacheOptions).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {value}
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
                        id="minimum-btn"
                        className="w-100"
                        onClick={handleButton}
                        variant="outline-info"
                        disabled={isDisabled}
                    >
                        Switch To Minimum Features View
                    </Button>
                </Col>
            </Row>
            {children}
        </Col>
    );
};

export default ColEleven;