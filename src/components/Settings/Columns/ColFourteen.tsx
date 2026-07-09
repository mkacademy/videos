import { useSelector } from "react-redux";
import { RootState } from "../../../store/types";
import { Button, Col, Row, ToggleButton } from "react-bootstrap";
import { styleProps } from "./ColEleven";

const tutorialPresetOptions: Record<string, string> = {
    "1_10": "Tutorial_with_10_Steps",
    "5_10": "5_Tutorials_with_10_Steps",
    "5_50": "5_Tutorials_with_50_Steps",
    "10_10": "Tutorial_with_10_Steps",
    "15_10": "Tutorial_with_15_Steps",
    "25_10": "Tutorial_with_25_Steps",
};

const quizPresetOptions: Record<string, string> = {
    "1_10_4_1": "Quiz_with_10_Questions_4_Options_1_reports",
    "5_10_4_1": "5_Quizzes_with_10_Questions_4_Options_1_reports",
    "5_50_4_1": "5_Quizzes_with_50_Questions_4_Options_1_reports",
    "10_10_4_1": "10_Quizzes_with_10_Questions_4_Options_1_reports",
    "15_10_4_1": "15_Quizzes_with_15_Questions_4_Options_1_reports",
    "25_10_4_1": "25_Quizzes_with_25_Questions_4_Options_1_reports",
};

const coursePresetOptions: Record<string, string> = {
    "1_10_4": "Course_with_10_Covers_4_slides",
    "1_50_4": "Course_with_50_Covers_4_slides",
    "5_10_4": "5_Courses_with_10_Covers_4_slides",
    "5_50_4": "5_Courses_with_50_Covers_4_slides",
    "10_10_4": "10_Courses_with_10_Covers_4_slides",
    "15_10_4": "15_Courses_with_15_Covers_4_slides",
    "25_10_4": "25_Courses_with_25_Covers_4_slides",
};
const includeCurrentInTemplatesOptions: Record<string, string> = {
    "tutorial": "Only_Tutorials",
    "quiz": "Only_Quizzes",
    "course": "Only_Courses",
    "tutorial_course": "Tutorial_Course",
    "tutorial_quiz": "Tutorial_Quiz",
    "course_quiz": "Course_Quiz",
    "tutorial_quiz_course": "All Content",
};
interface ColFourteenProps {
    children?: React.ReactNode;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ColFourteen: React.FC<ColFourteenProps> = ({ children, handleSelected, handleSwitchButton, handleButton }) => {
    const createTutorialPreset = useSelector((state: RootState) => state.settings.createTutorialPreset);
    const createQuizPreset = useSelector((state: RootState) => state.settings.createQuizPreset);
    const createCoursePreset = useSelector((state: RootState) => state.settings.createCoursePreset);
    const currentToIncludeInTemplates = useSelector((state: RootState) => state.settings.currentToIncludeInTemplates);
    const isIncludeCurrentIntemplates = useSelector((state: RootState) => state.settings.isIncludeCurrentIntemplates);
    return (
        <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={currentToIncludeInTemplates}
                        id="current-to-include-in-templates-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(includeCurrentInTemplatesOptions).map(([key, label]) => (
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
                        id="toggle-include-current-in-templates_btn"
                        value="toggle-include-current-in-templates_btn"
                        checked={isIncludeCurrentIntemplates}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        {`Include ${includeCurrentInTemplatesOptions[currentToIncludeInTemplates]}`}
                    </ToggleButton>
                </Col>
            </Row>

            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={createTutorialPreset}
                        id="create-tutorial-preset-select"
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
                        id="create-tutorials-btn"
                        onClick={handleButton}
                    >
                        Create Tutorial Templates
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={createCoursePreset}
                        id="create-course-preset-select"
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
                        id="create-courses-btn"
                        onClick={handleButton}
                    >
                        Create Course Templates
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col>
                    <select
                        value={createQuizPreset}
                        id="create-quiz-preset-select"
                        onChange={handleSelected}
                    >
                        {Object.entries(quizPresetOptions).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>            <Row className="mb-2">
                <Col>
                    <Button
                        size="lg"
                        type="button"
                        variant="primary"
                        className="w-100"
                        id="create-quizzes-btn"
                        onClick={handleButton}
                    >
                        Create Quiz Templates
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
                        id="create-mix-btn"
                        onClick={handleButton}
                    >
                        Create Mixed Templates
                    </Button>
                </Col>
            </Row>
            {children}
        </Col>
    );
};

export default ColFourteen;
