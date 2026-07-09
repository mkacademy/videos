import { Button, Col, Row, ToggleButton } from "react-bootstrap";
import * as styles from "../../../styles/settings.module.css";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../store/types";
import { capitalizeFirstLetter, getCurAppName } from "../../../utils";
import {
    SNAPSHOT_INTERVAL_SEC_OPTIONS,
    formatSnapshotIntervalLabel,
} from "../../../library/courseSnapshotCaptureUtils";
import { ApplyActionButtons } from "../Forms/ActionsBtns";
import useSettingsWait from "../../../Hooks/useSettingsWait";
import { useAnonymousSettingsApply } from "../../../Hooks/useSettings/useAnonymousSettings";
import { viewPayload as escrowPayload, ParentData, ViewPayload } from "../../../store/slices/viewSlice";
import { clearEscrow } from "../../../store/slices/viewSlice";
import {
    initLoading,
    extractKeywords,
    showAlgorithm,
    appendTraversals,
    InitLoadingPayload,
} from "../../../library/actions";
import { initializedLoading as mutateSession, SessionState } from "../../../store/slices/sessionSlice";

const styleProps = {
    slctbx: styles["slctbx"],
    colLg6: styles["col-lg-6"],
    colSm12: styles["col-sm-12"],
    buttonLabel: styles["button-label"],
    settingsCol3: styles["settings-col3"],
    buttonsContainer: styles["buttons-container"],
    btnOutlinePrimary: styles["btn-outline-primary"],
};

const ApplyLinks: React.FC = () => {
    const dispatch = useDispatch();

    const child = useSelector((state: RootState) => state.view.entity);
    const settings = useSelector((state: RootState) => state.settings);
    const parent = useSelector((state: RootState) => state.view.parent);
    const curPrefix = useSelector((state: RootState) => state.session.prefix);
    const parentData = useSelector((state: RootState) => state.view.parentData);
    const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
    const selectedRoutes = useSelector((state: RootState) => state.settings.selectedRoutes);
    const inProgress = useSelector((state: RootState) => state.view.requestIsProcessing);

    const clearView = (options: ViewPayload) => {
        dispatch(clearEscrow());
        dispatch(escrowPayload(options));
    };
    const extract = () => dispatch(extractKeywords());
    const launchAlgorithm = (pathname: string) => dispatch(showAlgorithm(pathname));
    const setAlgorithmTraversals = (payload: string) => dispatch(appendTraversals(payload));
    const updateMenuItem = (payload: Partial<SessionState> & { parentData: ParentData | undefined }) =>
        dispatch(mutateSession(payload));
    const preserveIngredients = (payload: InitLoadingPayload) => dispatch(initLoading(payload));

    const props = {
        child,
        settings,
        parent,
        curPrefix,
        parentData,
        defaultTake,
        clearView,
        extract,
        dispatch,
        updateMenuItem,
        preserveIngredients,
        launchAlgorithm,
        setAlgorithmTraversals,
    };

    const apply = useAnonymousSettingsApply(props);
    const onWait = useSettingsWait({ selectedRoutes, baseApply: apply });

    return <ApplyActionButtons apply={apply} onWait={onWait} inProgress={inProgress} />;
};

interface ColTenProps {
    children?: React.ReactNode;
    handleButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
    handleSwitchButton: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleSelected: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}
const ColTen: React.FC<ColTenProps> = ({ children, handleButton, handleSwitchButton, handleSelected }) => {
    const isTutorialsToCourses = useSelector((state: RootState) => state.settings.isTutorialsToCourses);
    const isCoursesToQuizzes = useSelector((state: RootState) => state.settings.isCoursesToQuizzes);
    const isBreathSelection = useSelector((state: RootState) => state.settings.isBreathSelection);
    const isDepthSelection = useSelector((state: RootState) => state.settings.isDepthSelection);
    const snapshotIntervalSec = useSelector((state: RootState) => state.settings.snapshotIntervalSec);
    const editMode = useSelector((state: RootState) => state.settings.editMode);
    const curApp = useSelector((state: RootState) => state.session.curApp);
    const curAppName = capitalizeFirstLetter(getCurAppName(curApp));
    const snapshotIntervalLabel = formatSnapshotIntervalLabel(snapshotIntervalSec);
    return (
        <Col className={styleProps.settingsCol3 + " " + styleProps.colLg6} sm={12} lg={6}>

            <Row>
                <Col sm={12} className={styleProps.colSm12 + " " + styleProps.buttonLabel}>
                    <ToggleButton
                        className={styleProps.btnOutlinePrimary + " mb-2"}
                        id="toggle-courses-to-quizzes_btn"
                        type="checkbox"
                        value="toggle-courses-to-quizzes_btn"
                        checked={isCoursesToQuizzes}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        {isCoursesToQuizzes ? "Courses to Quizzes" : "Quizzes to Courses"}
                    </ToggleButton>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className={styleProps.colSm12 + " " + styleProps.buttonLabel}>
                    <ToggleButton
                        className={styleProps.btnOutlinePrimary}
                        id="toggle-tutorials-to-courses_btn"
                        type="checkbox"
                        value="toggle-tutorials-to-courses_btn"
                        checked={isTutorialsToCourses}
                        variant="outline-primary"
                        onChange={handleSwitchButton}
                    >
                        {isTutorialsToCourses ? "Tutorials to Courses" : "Courses to Tutorials"}
                    </ToggleButton>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        className="reset w-100"
                        id="convert-stash-btn"
                        type="button"
                        variant="primary"
                        onClick={handleButton}
                    >
                        Convert Stash
                    </Button>
                </Col>
                <Col>
                    <Button
                        className="reset w-100"
                        id="view-stash_btn"
                        type="button"
                        variant="secondary"
                        onClick={handleButton}
                    >
                        View Stash
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        className="reset w-100"
                        id="toggle-breath-selection_btn"
                        onClick={handleButton}
                        variant="info"
                        type="button"
                    >
                        {isBreathSelection ? "Breath Selection (On)" : "Breath Selection"}
                    </Button>
                </Col>
                <Col>
                    <Button
                        className="reset w-100"
                        id="toggle-depth-selection_btn"
                        onClick={handleButton}
                        variant="secondary"
                        type="button"
                    >
                        {isDepthSelection ? "Depth Selection (On)" : "Depth Selection"}
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        className="reset w-100"
                        id="separate-trees_btn"
                        onClick={handleButton}
                        variant="secondary"
                        type="button"
                    >
                        Separate {curAppName}
                    </Button>
                </Col>
                <Col>
                    <Button
                        className="reset w-100"
                        id="combine-trees_btn"
                        onClick={handleButton}
                        variant="info"
                        type="button"
                    >
                        Combine {curAppName}
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        className="reset w-100"
                        id="stash-inventory-prev_btn"
                        onClick={handleButton}
                        variant="secondary"
                        type="button"
                        disabled={curApp === 0}
                    >
                        Prev Stash Group
                    </Button>
                </Col>
                <Col>
                    <Button
                        className="reset w-100"
                        id="stash-inventory-next_btn"
                        onClick={handleButton}
                        variant="info"
                        type="button"
                        disabled={curApp === 0}
                    >
                        Next Stash Group
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col className={styleProps.buttonsContainer + " " + styleProps.colSm12} sm={12} md={6}>
                    <Button
                        className="reset w-100"
                        id="stash_btn"
                        onClick={handleButton}
                        variant="info"
                        type="button"
                        disabled={curApp === 0}
                    >
                        Stash {curAppName}
                    </Button>
                </Col>
                <Col>
                    <Button
                        className="reset w-100"
                        id="unstash_btn"
                        onClick={handleButton}
                        variant="secondary"
                        type="button"
                        disabled={curApp === 0}
                    >
                        Unstash {curAppName}
                    </Button>
                </Col>
            </Row>
            <Row className="mb-1">
                <Col>
                    <Button
                        className="reset w-100"
                        id="delete-stash-group_btn"
                        onClick={handleButton}
                        variant="danger"
                        type="button"
                        disabled={curApp === 0}
                    >
                        Delete {curAppName} Stash Group
                    </Button>
                </Col>
            </Row>
            <Row className={styleProps.slctbx + " mb-2"}>
                <Col sm={12} className={styleProps.colSm12}>
                    <select
                        id="snapshot-interval-select"
                        value={snapshotIntervalSec}
                        onChange={handleSelected}
                    >
                        {SNAPSHOT_INTERVAL_SEC_OPTIONS.map((interval) => (
                            <option key={interval} value={interval}>
                                {formatSnapshotIntervalLabel(interval)}
                            </option>
                        ))}
                    </select>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col sm={12} className={styleProps.colSm12}>
                    <Button
                        className="reset w-100"
                        id="capture-snapshots-btn"
                        type="button"
                        variant="primary"
                        onClick={handleButton}
                    >
                        {`Capture Snapshots @ ${snapshotIntervalLabel} intervals`}
                    </Button>
                </Col>
            </Row>
            <Row className="mb-2">
                <Col sm={12} className={styleProps.colSm12}>
                    <Button
                        size="lg"
                        type="button"
                        id="editMode-btn"
                        className="w-100"
                        onClick={handleButton}
                        variant={editMode ? "outline-danger" : "outline-success"}
                    >
                        {editMode ? "Edit Mode (On)" : "Edit Mode (Off)"}
                    </Button>
                </Col>
            </Row>
            <ApplyLinks />
            {children}
        </Col>
    );
};

export default ColTen;