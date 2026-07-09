import { useSelector } from "react-redux";
import { RootState } from "../../../store/types";
import { Button, Col, Row, ToggleButton } from "react-bootstrap";
import { styleProps } from "./ColEleven";

const tutorialPresetOptions: Record<string, string> = {
    "1_10": "Tutorial_with_10_Steps",
    "5_10": "5_Tutorials_with_10_Steps",
    "5_50": "5_Tutorials_with_50_Steps",
};

const quizPresetOptions: Record<string, string> = {
    "1_10": "Quiz_with_10_Questions_4_Options",
    "5_10": "5_Quizzes_with_10_Questions_4_Options",
    "5_50": "5_Quizzes_with_50_Questions_4_Options",
};

const coursePresetOptions: Record<string, string> = {
    "1_10": "Course_with_10_Steps",
    "1_50": "Course_with_50_Steps",
    "5_10": "5_Courses_with_10_Steps",
    "5_50": "5_Courses_with_50_Steps",
};

const includeCurrentInSkeletonsOptions: Record<string, string> = {
    "tutorial": "Only_Tutorials",
    "quiz": "Only_Quizzes",
    "course": "Only_Courses",
    "tutorial_course": "Tutorial_Course",
    "tutorial_quiz": "Tutorial_Quiz",
    "course_quiz": "Course_Quiz",
    "tutorial_quiz_course": "All Content",
};

interface ColFifteenProps {
    children?: React.ReactNode;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleDatetimeInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ColFifteen: React.FC<ColFifteenProps> = ({ children, handleSelected, handleSwitchButton, handleDatetimeInput, handleButton }) => {
    const skeletonsFrom = useSelector((state: RootState) => state.settings.skeletonsFrom);
    const fetchQuizPreset = useSelector((state: RootState) => state.settings.fetchQuizPreset);
    const fetchCoursePreset = useSelector((state: RootState) => state.settings.fetchCoursePreset);
    const fetchTutorialPreset = useSelector((state: RootState) => state.settings.fetchTutorialPreset);
    const currentToIncludeInSkeletons = useSelector((state: RootState) => state.settings.currentToIncludeInSkeletons);
    const isIncludeCurrentInSkeletons = useSelector((state: RootState) => state.settings.isIncludeCurrentInSkeletons);

    const inputSkeletonsFrom = skeletonsFrom ? skeletonsFrom.replace(" ", "T") : "";
    return (
        <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <input
                        id="skeletons-from-datetime-input"
                        type="datetime-local"
                        className="form-control"
                        value={inputSkeletonsFrom}
                        onChange={handleDatetimeInput}
                    />
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={currentToIncludeInSkeletons}
                        id="current-to-include-in-skeletons-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(includeCurrentInSkeletonsOptions).map(([key, label]) => (
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
                        id="toggle-include-current-in-skeletons_btn"
                        value="toggle-include-current-in-skeletons_btn"
                        checked={isIncludeCurrentInSkeletons}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        {`Include ${includeCurrentInSkeletonsOptions[currentToIncludeInSkeletons]}`}
                    </ToggleButton>
                </Col>
            </Row>

            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={fetchTutorialPreset}
                        id="fetch-tutorial-preset-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(tutorialPresetOptions).map(([key, label]) => (
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
                        id="fetch-tutorials-btn"
                        onClick={handleButton}
                    >
                        Fetch Tutorial Skeletons
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={fetchCoursePreset}
                        id="fetch-course-preset-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(coursePresetOptions).map(([key, label]) => (
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
                        id="fetch-courses-btn"
                        onClick={handleButton}
                    >
                        Fetch Course Skeletons
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={fetchQuizPreset}
                        id="fetch-quiz-preset-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(quizPresetOptions).map(([key, label]) => (
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
                        id="fetch-quizzes-btn"
                        onClick={handleButton}
                    >
                        Fetch Quiz Skeletons
                    </Button>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col>
                    <Button
                        size="lg"
                        type="button"
                        variant="outline-primary"
                        className="w-100"
                        id="fetch-mix-btn"
                        onClick={handleButton}
                    >
                        Fetch Mixed Skeletons
                    </Button>
                </Col>
            </Row>
            <Row >
                <Col>
                    <Button
                        size="lg"
                        type="submit"
                        variant="secondary"
                        className="w-100 mb-2"
                        id="generate-attachments-btn"
                        onClick={handleButton}
                    >
                        Generate Attachments
                    </Button>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col>
                    <Button
                        size="lg"
                        type="button"
                        variant="info"
                        className="w-100"
                        id="copy-comments-to-clipboard-btn"
                        onClick={handleButton}
                    >
                        copy comments to clipboard
                    </Button>
                </Col>
            </Row>
            {children}
        </Col>
    );
};

export default ColFifteen;
