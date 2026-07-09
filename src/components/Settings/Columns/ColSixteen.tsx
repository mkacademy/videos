import { useSelector } from "react-redux";
import { RootState } from "../../../store/types";
import { Button, Col, Row, ToggleButton } from "react-bootstrap";
import { styleProps } from "./ColEleven";

const tutorialCommentsPresetOptions: Record<string, string> = {
    "within_10_hours": "Tutorial_within_10_hours",
    "within_50_hours": "Tutorial_within_50_hours",
    "within_10_days": "Tutorial_within_10_days",
};

const quizCommentsPresetOptions: Record<string, string> = {
    "within_10_hours": "Quiz_within_10_hours",
    "within_50_hours": "Quiz_within_50_hours",
    "within_10_days": "Quiz_within_10_days",
};

const courseCommentsPresetOptions: Record<string, string> = {
    "within_10_hours": "Course_within_10_hours",
    "within_50_hours": "Course_within_50_hours",
    "within_10_days": "Course_within_10_days",
};

const fetchCommentsTypeOptions: Record<string, string> = {
    tutorial: "TUTORIAL_COMMENTS",
    quiz: "QUIZ_COMMENTS",
    course: "COURSE_COMMENTS",
};

const exportCommentsOptions: Record<string, string> = {
    tutorial: "Only_Tutorials",
    quiz: "Only_Quizzes",
    course: "Only_Courses",
    tutorial_course: "Tutorial_Course",
    tutorial_quiz: "Tutorial_Quiz",
    course_quiz: "Course_Quiz",
    tutorial_quiz_course: "All Content",
};

interface ColSixteenProps {
    children?: React.ReactNode;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleDatetimeInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ColSixteen: React.FC<ColSixteenProps> = ({ children, handleSelected, handleSwitchButton, handleDatetimeInput, handleButton }) => {
    const fetchTutorialCommentsPreset = useSelector((state: RootState) => state.settings.fetchTutorialCommentsPreset);
    const fetchCourseCommentsPreset = useSelector((state: RootState) => state.settings.fetchCourseCommentsPreset);
    const currentToExportComments = useSelector((state: RootState) => state.settings.currentToExportComments);
    const fetchQuizCommentsPreset = useSelector((state: RootState) => state.settings.fetchQuizCommentsPreset);
    const fetchCommentsType = useSelector((state: RootState) => state.settings.fetchCommentsType);
    const isExportComments = useSelector((state: RootState) => state.settings.isExportComments);
    const commentsFrom = useSelector((state: RootState) => state.settings.commentsFrom);
    const aquiredClipboardConsent = useSelector((state: RootState) => state.settings.aquiredClipboardConsent);

    const inputCommentsFrom = commentsFrom ? commentsFrom.replace(" ", "T") : "";

    return (
        <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <input
                        id="comments-from-datetime-input"
                        type="datetime-local"
                        className="form-control"
                        value={inputCommentsFrom}
                        onChange={handleDatetimeInput}
                    />
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={currentToExportComments}
                        id="current-to-export-comments-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(exportCommentsOptions).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
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
                        id="toggle-export-comments_btn"
                        value="toggle-export-comments_btn"
                        checked={isExportComments}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        {`Export ${exportCommentsOptions[currentToExportComments]}`}
                    </ToggleButton>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={fetchTutorialCommentsPreset}
                        id="fetch-tutorial-comments-preset-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(tutorialCommentsPresetOptions).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
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
                        variant="primary"
                        className="w-100"
                        id="fetch-tutorial-comments-btn"
                        onClick={handleButton}
                    >
                        Fetch Tutorial Comments
                    </Button>
                </Col>
            </Row>

            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={fetchCourseCommentsPreset}
                        id="fetch-course-comments-preset-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(courseCommentsPresetOptions).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
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
                        variant="primary"
                        className="w-100"
                        id="fetch-course-comments-btn"
                        onClick={handleButton}
                    >
                        Fetch Course Comments
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={fetchQuizCommentsPreset}
                        id="fetch-quiz-comments-preset-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(quizCommentsPresetOptions).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
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
                        variant="primary"
                        className="w-100"
                        id="fetch-quiz-comments-btn"
                        onClick={handleButton}
                    >
                        Fetch Quiz Comments
                    </Button>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col>
                    <Button
                        size="lg"
                        type="button"
                        variant="danger"
                        className="w-100"
                        id="clear-comments-btn"
                        onClick={handleButton}
                    >
                        {`CLEAR ${fetchCommentsType.toUpperCase()} COMMENTS`}
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={fetchCommentsType}
                        id="fetch-comments-type-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(fetchCommentsTypeOptions).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
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
                        variant="secondary"
                        className="w-100"
                        id="import-comments-from-clipboard-btn"
                        disabled={!aquiredClipboardConsent}
                        onClick={handleButton}
                    >
                        import comments from clipboard
                    </Button>
                </Col>
            </Row>
            {children}
        </Col>
    );
};

export default ColSixteen;
