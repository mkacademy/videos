import { useSelector } from "react-redux";
import { RootState } from "../../../store/types";
import { Button, Col, Form, Row, ToggleButton } from "react-bootstrap";
import { styleProps, unzipOptions } from "./ColEleven";
import { fsqAliases, takeAliases } from "../../../utils";

interface ColTwelveProps {
    children?: React.ReactNode;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
const clearContentOptions: Record<string, string> = {
    tutorial: "TUTORIAL_CONTENT",
    course: "COURSE_CONTENT",
    quiz: "QUIZ_CONTENT",
};

const ColTwelve: React.FC<ColTwelveProps> = ({ children, handleSelected, handleSwitchButton, handleButton }) => {
    const unzipTutorialsType = useSelector((state: RootState) => state.settings.unzipTutorialsType);
    const unzipCoursesType = useSelector((state: RootState) => state.settings.unzipCoursesType);
    const unzipQuizzesType = useSelector((state: RootState) => state.settings.unzipQuizzesType);
    const isUnzipTutorials = useSelector((state: RootState) => state.settings.isUnzipTutorials);
    const clearContentType = useSelector((state: RootState) => state.settings.clearContentType);
    const isUnzipCourses = useSelector((state: RootState) => state.settings.isUnzipCourses);
    const isUnzipQuizzes = useSelector((state: RootState) => state.settings.isUnzipQuizzes);
    const tutorialTrees = useSelector((state: RootState) => state.settings.TutorialTrees);
    const courseTrees = useSelector((state: RootState) => state.settings.CourseTrees);
    const quizTrees = useSelector((state: RootState) => state.settings.QuizTrees);
    const showCopyIcons = useSelector((state: RootState) => state.settings.showCopyIcons);
    const aquiredClipboardConsent = useSelector((state: RootState) => state.settings.aquiredClipboardConsent);
    const shouldHydrate = useSelector((state: RootState) => state.settings.shouldHydrate);
    const fsq = useSelector((state: RootState) => state.settings.fsq);
    const take = useSelector((state: RootState) => state.settings.take);
    const isDisabled = (clearContentType === "tutorial" && Object.keys(tutorialTrees).length === 0)
        || (clearContentType === "course" && Object.keys(courseTrees).length === 0)
        || (clearContentType === "quiz" && Object.keys(quizTrees).length === 0);

    return (
        <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>
            <Row>
                <Col sm={12} className={styleProps.colSm12 + " " + styleProps.buttonLabel}>
                    <ToggleButton
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                        type="checkbox"
                        id="toggle-unzip-courses_btn"
                        value="toggle-unzip-courses_btn"
                        checked={isUnzipCourses}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
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
                        id="toggle-unzip-tutorials_btn"
                        value="toggle-unzip-tutorials_btn"
                        checked={isUnzipTutorials}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
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
                        id="toggle-unzip-quizzes_btn"
                        value="toggle-unzip-quizzes_btn"
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
            <Row className="mb-2">
                <Col>
                    <Button
                        size="lg"
                        type="submit"
                        variant="danger"
                        className="w-100"
                        id="clear-content-btn"
                        disabled={isDisabled}
                        onClick={handleButton}
                    >
                        {`CLEAR ${clearContentType.toUpperCase()} CONTENT`}
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select value={clearContentType} id="clear-content-type-select" onChange={handleSelected}>
                        {Object.entries(clearContentOptions).map(([key, value], i) => (
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
                        variant="info"
                        className="w-100"
                        id="toggle-show-copy-icons_btn"
                        disabled={!aquiredClipboardConsent}
                        onClick={handleButton}
                    >
                        {showCopyIcons ? "Show copy to clipboard icons (On)" : "Show copy to clipboard icons (Off)"}
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select id="fsq-select" value={fsq} onChange={handleSelected} disabled={shouldHydrate}>
                        {Object.entries(fsqAliases).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select id="take-select" value={take} onChange={handleSelected}>
                        {Object.entries(takeAliases).map(([key, value], i) => (
                            <option key={i} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col>
                    <Form.Check
                        type="checkbox"
                        id="toggle-aquired-clipboard-consent"
                    >
                        <Form.Check.Input
                            type="checkbox"
                            id="toggle-aquired-clipboard-consent_btn"
                            value="toggle-aquired-clipboard-consent_btn"
                            checked={aquiredClipboardConsent}
                            onChange={handleSwitchButton}
                        />
                        <Form.Check.Label htmlFor="toggle-aquired-clipboard-consent_btn">
                            I consent to have mkacademy.ca read my clipboard
                        </Form.Check.Label>
                    </Form.Check>
                </Col>
            </Row>

            {children}
        </Col>
    );
};

export default ColTwelve;