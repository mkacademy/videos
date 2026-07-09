import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Action, UnknownAction } from "@reduxjs/toolkit";
import { isOwnershipQueueActive } from "../store/middleware/ownershipSaveQueue";
import {
    formatSelected,
    actionSelected,
    appendSelected,
    toggleExport,
    toggleDomain,
    connectSelecteds,
    parentSelected,
    toggleFocus,
    roleSelected,
    takeSelected,
    fsqSelected,
    toggleImport,
    childSelected,
    userappSelected,
    toggleAlgorithm,
    paddingSelected,
    toggleTraversals,
    algorithmSelected,
    toggleAvailability,
    toggleDeleteAccount,
    toggleKeywordsExtraction,
    toggleAlgorithmExtraction,
    memberappSelected,
    adminappSelected,
    toggleRoutes,
    catalinaSelected,
    escrowUploads,
    extractionSource,
    encodingSource,
    skeletonsFromSelected,
    commentsFromSelected,
    timeSelected,
    approuteSelected,
    toggleCacher,
    toggleFormatter,
    quotaSelected,
    toggleSelection,
    toggleTextToImg,
    toggleTextSwap,
    orphansSizeSelected,
    toggleAquireVoucher,
    secondsSelected,
    toggleAbility,
    toggleMotion,
    toggleAssembleBase64,
    toggleIncludeBase64,
    toggleCoursesToQuizzes,
    toggleTutorialsToCourses,
    toggleDepthSelection,
    toggleBreathSelection,
    toggleRemoveTrees,
    toggleInsertTrees,
    toggleAssembleTexts,
    toggleUnzipQuizzes,
    toggleUnzipTutorials,
    toggleUnzipCourses,
    clearTypeSelected,
    unzipCoursesTypeSelected,
    unzipTutorialsTypeSelected,
    unzipQuizzesTypeSelected,
    clearContentTypeSelected,
    switchToMinimunFeature,
    switchToMaximunFeature,
    toggleUnzipQuizzes_,
    toggleUnzipTutorials_,
    toggleUnzipCourses_,
    setStatus,
    setAssertOwnership,
    createTutorialPresetSelected,
    createQuizPresetSelected,
    createCoursePresetSelected,
    snapshotIntervalSelected,
    randomizedTypeSelected,
    includeCurrentInTemplatesSelected,
    toggleIncludeCurrentInTemplates,
    toggleShowCopyIcons,
    toggleAquiredClipboardConsent,
    toggleEditMode,
    fetchTutorialPresetSelected,
    fetchQuizPresetSelected,
    fetchCoursePresetSelected,
    includeCurrentInSkeletonsSelected,
    toggleIncludeCurrentInSkeletons,
    fetchTutorialCommentsPresetSelected,
    fetchQuizCommentsPresetSelected,
    fetchCourseCommentsPresetSelected,
    fetchCommentsTypeSelected,
    currentToExportCommentsSelected,
    toggleExportComments,
    toggleShouldHydrate,
    queryLimitSelected,
} from "../store/slices/settingsSlice";
import {
    extractContent,
    hydrateSkeletonRows,
    extractRows,
    initSettings,
    insertImageUrls,
    setImageUrls,
    unzipRecords,
    zipRecords,
} from "../library/actions";
import { userApps, memberApps, adminsApps } from "../constants";
import {
    Tree,
    getCurAppName,
    orderEntitiesRootToLeafForWebapp,
} from "../utils";
import { useSelector, useStore } from "react-redux";
import { RootState } from "../store/types";
import type { AppDispatch } from "../store";
import {
    groupedTaggedCommentTokens,
    isGroupedTaggedClipboardPayload,
    stashPayloadsFromGroupedTaggedClipboard,
} from "../library/commentClipboardManager";
import { BaseEntity } from "../components/Core/types";
import { clearData, selectAll } from "../store/slices/rowSlice";
import { appendRoute, appendRoutes, removeTimestamp, StashPayload } from "../store/slices/stashSlice";
import { clearOnlyWarnings, prependError, prependWarning, fetchedHandles } from "../store/slices/errorSlice";
import { setTutorials } from "../store/slices/tutorialSlice";
import { setCourses, coupleChapterAndCovers } from "../store/slices/courseSlice";
import { setQuizzes } from "../store/slices/quizSlice";
import {
    buildTutorialTreesFromPreset,
    buildCourseTreesFromPreset,
    buildQuizTreesFromPreset,
} from "../library/TemplatesManagerUtils";
import { dispatchSettingsClearContent } from "../library/clearContentDispatch";
import { dispatchGenerateLink } from "../library/generateLinkDispatch";
import {
    performEscrowStashShortcut,
    performUnstashStashShortcut,
    performDeleteStashGroupShortcut,
    performStashInventoryNavigateShortcut,
    performHandlesToStashShortcut,
    performStashInventoryShortcut,
    performConvertStashShortcut,
    performCombineTreesShortcut,
    performSeparateTreesShortcut,
} from "../library/Shortcuts_b";
import { viewRequest } from "../store/slices/viewSlice";
import { buildSnapshotCoursesFromSelection } from "../library/courseSnapshotCaptureUtils";

// Type definitions
interface UseSettingsParams {
    dispatcher: (action: UnknownAction) => void;
    isParentSelection: boolean;
    dismisstype: boolean;
    timestamp: string;
    approute: string;
    source: string;
}

interface EntityPredicate {
    name: string;
    unlocked: string[];
    lowermenu?: boolean;
    highermenu?: boolean;
}

interface SiteApp {
    setter: (value: number) => UnknownAction;
    offset: number;
    apps: string[];
}

interface SiteApps {
    [key: string]: SiteApp;
}

export interface UseSettingsReturn {
    handleSwitchLabel: (e: React.MouseEvent<HTMLElement>) => void;
    handleSwitchButton: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleParentSel: (e: React.ChangeEvent<HTMLSelectElement> | string) => void;
    handleSelected: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleDatetimeInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSwitch: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleButton: (e: React.MouseEvent<HTMLButtonElement>) => void;
    focusChanged: (e: React.MouseEvent<HTMLElement>) => void;
    handleSubmitBtn: (payload: Action) => void;
    handleChildSel: (entity: string) => void;
    isStartup: boolean;
}

export const predicate = ({ unlocked, name: n, lowermenu, highermenu }: EntityPredicate): string[] => {
    const higherRoutes = highermenu ? unlocked.map((d: string) => "higher" + n + d) : [];
    const lowerRoutes = lowermenu ? unlocked.map((d: string) => "lower" + n + d) : [];
    const curRoutes = unlocked.map((descendent: string) => n + descendent);
    return curRoutes.concat(lowerRoutes).concat(higherRoutes);
};

export default function useSettings({
    isParentSelection,
    dismisstype,
    dispatcher,
    timestamp,
    approute,
    source,
}: UseSettingsParams): UseSettingsReturn {
    const reduxStore = useStore();
    const siteapps: SiteApps = {
        ["memberapp-select"]: {
            offset: 4,
            setter: memberappSelected,
            apps: Array.isArray(memberApps) ? memberApps : Object.values(memberApps),
        },
        ["adminapp-select"]: {
            offset: 6,
            setter: adminappSelected,
            apps: Array.isArray(adminsApps) ? adminsApps : Object.values(adminsApps),
        },
        ["userapp-select"]: {
            offset: 0,
            setter: userappSelected,
            apps: Array.isArray(userApps) ? userApps : Object.values(userApps),
        },
    };

    const location = useLocation();
    const urlState = useRef(location.state);
    const isStartup = urlState.current?.goBackUrl === undefined;
    const status = useSelector((state: RootState) => state.settings.status);
    const assertOwnership = useSelector((state: RootState) => state.settings.assertOwnership);
    const createTutorialPreset = useSelector((state: RootState) => state.settings.createTutorialPreset);
    const createQuizPreset = useSelector((state: RootState) => state.settings.createQuizPreset);
    const createCoursePreset = useSelector((state: RootState) => state.settings.createCoursePreset);
    const fetchTutorialPreset = useSelector((state: RootState) => state.settings.fetchTutorialPreset);
    const fetchQuizPreset = useSelector((state: RootState) => state.settings.fetchQuizPreset);
    const fetchCoursePreset = useSelector((state: RootState) => state.settings.fetchCoursePreset);
    const fetchTutorialCommentsPreset = useSelector((state: RootState) => state.settings.fetchTutorialCommentsPreset);
    const fetchQuizCommentsPreset = useSelector((state: RootState) => state.settings.fetchQuizCommentsPreset);
    const fetchCourseCommentsPreset = useSelector((state: RootState) => state.settings.fetchCourseCommentsPreset);
    const commentsState = useSelector((state: RootState) => state.comments);
    useEffect(() => {
        dispatcher(initSettings());
    }, [dispatcher]);

    const handleChildSel = (entity: string): void => {
        if (!isParentSelection) dispatcher(childSelected(entity));
    };

    const handleParentSel = (e: React.ChangeEvent<HTMLSelectElement> | string): void => {
        const entity = typeof e === 'string' ? e : e.target.value;
        if (isParentSelection) dispatcher(parentSelected(entity));
    };

    const focusChanged = (e: React.MouseEvent<HTMLElement>): void => {
        if ((e.target as HTMLElement).id === "parent_lbl") dispatcher(toggleFocus(true));
        else dispatcher(toggleFocus(false));
    };

    const handleSubmitBtn = (payload: Action): void => {
        dispatcher(payload);
    };

    const handleGenerateLink = (): void => {
        dispatchGenerateLink(dispatcher, reduxStore.getState() as RootState);
    };

    const handleClearContent = (): void => {
        dispatchSettingsClearContent(dispatcher, () => reduxStore.getState() as RootState);
    };

    const handleButton = (e: React.MouseEvent<HTMLButtonElement>): void => {
        const buttonId = (e.target as HTMLButtonElement).id;

        switch (buttonId) {
            case "toggle-assemble-base64_btn":
                dispatcher(toggleAssembleBase64());
                break;
            case "toggle-assemble-texts_btn":
                dispatcher(toggleAssembleTexts());
                break;
            case "assert-ownership-btn": {
                if (isOwnershipQueueActive()) break;
                if (assertOwnership !== true) dispatcher(setAssertOwnership(true));
                else dispatcher(setAssertOwnership(undefined));
                break;
            }
            case "unassert-ownership-btn": {
                if (isOwnershipQueueActive()) break;
                if (assertOwnership !== false) dispatcher(setAssertOwnership(false));
                else dispatcher(setAssertOwnership(undefined));
                break;
            }
            case "pending_btn": {
                if (status !== 0) dispatcher(setStatus(0));
                else dispatcher(setStatus(undefined));
                break;
            }
            case "approved_btn": {
                if (status !== 1) dispatcher(setStatus(1));
                else dispatcher(setStatus(undefined));
                break;
            }
            case "rejected_btn": {
                if (status !== 2) dispatcher(setStatus(2));
                else dispatcher(setStatus(undefined));
                break;
            }
            case "generate-link-btn": {
                handleGenerateLink();
                break;
            }
            case "toggle-show-copy-icons_btn": {
                dispatcher(toggleShowCopyIcons());
                break;
            }
            case "editMode-btn": {
                dispatcher(toggleEditMode());
                break;
            }
            case "convert-stash-btn": {
                performConvertStashShortcut(dispatcher as AppDispatch);
                break;
            }
            case "create-tutorials-btn": {
                const built = buildTutorialTreesFromPreset(createTutorialPreset);
                if (!built) {
                    dispatcher(prependError("Invalid tutorial create preset"));
                    break;
                }
                dispatcher(prependWarning(`Created ${built.banners.length} tutorials`));
                dispatcher(fetchedHandles(built.handles));
                dispatcher(setTutorials({ banners: built.banners, content: built.content }));
                break;
            }
            case "create-quizzes-btn": {
                const built = buildQuizTreesFromPreset(createQuizPreset);
                if (!built) {
                    dispatcher(prependError("Invalid quiz create preset"));
                    break;
                }
                dispatcher(prependWarning(`Created ${built.quizzes.length} quizzes`));
                dispatcher(fetchedHandles(built.handles));
                dispatcher(setQuizzes({
                    quizzes: built.quizzes,
                    banners: built.banners,
                    content: built.content,
                }));
                break;
            }
            case "create-courses-btn": {
                const built = buildCourseTreesFromPreset(createCoursePreset);
                if (!built) {
                    dispatcher(prependError("Invalid course create preset"));
                    break;
                }
                dispatcher(prependWarning(`Created ${built.banners.length} courses`));
                dispatcher(fetchedHandles(built.handles));
                dispatcher(setCourses({
                    banners: built.banners,
                    content: built.content,
                }));
                break;
            }
            case "create-mix-btn": {
                const tutorials = buildTutorialTreesFromPreset(createTutorialPreset);
                const courses = buildCourseTreesFromPreset(createCoursePreset);
                const quizzes = buildQuizTreesFromPreset(createQuizPreset);
                if (!tutorials || !courses || !quizzes) {
                    dispatcher(prependError("Invalid create preset for mixed templates"));
                    break;
                }
                const t = tutorials.banners.length;
                const c = courses.banners.length;
                const q = quizzes.quizzes.length;
                const msg = `Created ${t} tutorials, ${c} courses, and ${q} quizzes`;
                dispatcher(prependWarning(msg));
                dispatcher(fetchedHandles({
                    ...tutorials.handles,
                    ...courses.handles,
                    ...quizzes.handles,
                }));
                dispatcher(setTutorials({
                    banners: tutorials.banners,
                    content: tutorials.content,
                }));
                dispatcher(setCourses({
                    banners: courses.banners,
                    content: courses.content,
                }));
                dispatcher(setQuizzes({
                    quizzes: quizzes.quizzes,
                    banners: quizzes.banners,
                    content: quizzes.content,
                }));
                break;
            }
            case "generate-attachments-btn": {
                console.log("generate-attachments-btn");
                break;
            }
            case "copy-comments-to-clipboard-btn": {
                const grouped = groupedTaggedCommentTokens(commentsState);
                const payload = JSON.stringify(grouped);
                navigator.clipboard.writeText(payload).then(
                    () => {
                        dispatcher(clearOnlyWarnings());
                        dispatcher(prependWarning("Tagged comments copied to clipboard"));
                    },
                    () => dispatcher(prependError("Failed to copy tagged comments to clipboard"))
                );
                break;
            }
            case "import-comments-from-clipboard-btn": {
                const { aquiredClipboardConsent } = (reduxStore.getState() as RootState).settings;
                if (!aquiredClipboardConsent) {
                    dispatcher(prependError("Clipboard consent is required to import from clipboard"));
                    break;
                }
                navigator.clipboard.readText().then(
                    (text) => {
                        let parsed: unknown;
                        try {
                            parsed = JSON.parse(text.trim());
                        } catch {
                            dispatcher(prependError("Clipboard does not contain valid JSON"));
                            return;
                        }
                        if (!isGroupedTaggedClipboardPayload(parsed)) {
                            dispatcher(
                                prependError("Clipboard JSON is not a valid tagged-comments export")
                            );
                            return;
                        }
                        const stashPayloads: StashPayload[] =
                            stashPayloadsFromGroupedTaggedClipboard(parsed);
                        dispatcher(appendRoutes(stashPayloads));
                        dispatcher(clearOnlyWarnings());
                        dispatcher(prependWarning("Tagged comments imported from clipboard"));
                    },
                    () => dispatcher(prependError("Failed to read from clipboard"))
                );
                break;
            }
            case "fetch-tutorials-btn": {
                console.log("fetch-tutorials-btn", "preset:", fetchTutorialPreset);
                break;
            }
            case "fetch-quizzes-btn": {
                console.log("fetch-quizzes-btn", "preset:", fetchQuizPreset);
                break;
            }
            case "fetch-courses-btn": {
                console.log("fetch-courses-btn", "preset:", fetchCoursePreset);
                break;
            }
            case "fetch-mix-btn": {
                console.log("fetch-mix-btn", "presets:", { fetchTutorialPreset, fetchQuizPreset, fetchCoursePreset });
                break;
            }
            case "fetch-tutorial-comments-btn": {
                console.log("fetch-tutorial-comments-btn", "preset:", fetchTutorialCommentsPreset);
                break;
            }
            case "fetch-quiz-comments-btn": {
                console.log("fetch-quiz-comments-btn", "preset:", fetchQuizCommentsPreset);
                break;
            }
            case "fetch-course-comments-btn": {
                console.log("fetch-course-comments-btn", "preset:", fetchCourseCommentsPreset);
                break;
            }
            case "toggle-should-hydrate-btn": {
                dispatcher(toggleShouldHydrate());
                break;
            }
            case "couple-chapter-covers-btn": {
                dispatcher(coupleChapterAndCovers());
                break;
            }
            case "minimum-btn": {
                dispatcher(switchToMinimunFeature());
                break;
            }
            case "maximun-btn": {
                dispatcher(switchToMaximunFeature());
                break;
            }
            case "clear-content-btn": {
                handleClearContent();
                break;
            }
            case "clear-comments-btn": {
                // TODO: implement clear comments handler when backend is ready
                console.log("clear-comments-btn");
                break;
            }
            case "stash_btn": {
                performEscrowStashShortcut(dispatcher as AppDispatch);
                break;
            }
            case "unstash_btn": {
                performUnstashStashShortcut(dispatcher as AppDispatch);
                break;
            }
            case "delete-stash-group_btn": {
                performDeleteStashGroupShortcut(dispatcher as AppDispatch);
                break;
            }
            case "stash-inventory-prev_btn": {
                performStashInventoryNavigateShortcut(dispatcher as AppDispatch, 'prev');
                break;
            }
            case "stash-inventory-next_btn": {
                performStashInventoryNavigateShortcut(dispatcher as AppDispatch, 'next');
                break;
            }
            case "foundations-from-handles_btn": {
                performHandlesToStashShortcut(dispatcher as AppDispatch);
                break;
            }
            case "view-stash_btn": {
                performStashInventoryShortcut(dispatcher as AppDispatch);
                break;
            }
            case "toggle-depth-selection_btn": {
                dispatcher(toggleDepthSelection());
                break;
            }
            case "toggle-breath-selection_btn": {
                dispatcher(toggleBreathSelection());
                break;
            }
            case "separate-trees_btn": {
                performSeparateTreesShortcut(dispatcher as AppDispatch);
                break;
            }
            case "combine-trees_btn": {
                performCombineTreesShortcut(dispatcher as AppDispatch);
                break;
            }
            case "capture-snapshots-btn": {
                void (async () => {
                    const state = reduxStore.getState() as RootState;
                    const { banners, content } = state.course;
                    const intervalSec = state.settings.snapshotIntervalSec;
                    dispatcher(viewRequest({ message: 'Capturing snapshots...', completed: false }));
                    try {
                        const result = await buildSnapshotCoursesFromSelection(
                            banners,
                            content,
                            intervalSec,
                            undefined,
                            (progress) => {
                                dispatcher(viewRequest({
                                    message: `Capturing snapshots (${progress.courseIndex}/${progress.courseTotal}): ${progress.pennantTitle}`,
                                    completed: false,
                                }));
                            },
                        );
                        result.errors.forEach((msg) => dispatcher(prependError(msg)));
                        result.skipped.forEach((msg) => dispatcher(prependWarning(msg)));
                        if (result.banners.length > 0) {
                            dispatcher(setCourses({
                                banners: result.banners,
                                content: result.content,
                                Trees: result.Trees,
                            }));
                            dispatcher(prependWarning(`Created ${result.banners.length} snapshot course(s)`));
                        }
                    } finally {
                        dispatcher(viewRequest({ completed: true }));
                    }
                })();
                break;
            }
            case "toggle-remove-trees_btn": {
                dispatcher(toggleRemoveTrees());
                break;
            }
            case "toggle-insert-trees_btn": {
                dispatcher(toggleInsertTrees());
                break;
            }
            case "create-timestamp_btn": {
                const payload: StashPayload = {
                    approute,
                    content: [],
                    timestamp: new Date().toLocaleTimeString(),
                };
                dispatcher(appendRoute(payload));
                dispatcher(timeSelected(payload.timestamp));
                break;
            }
            case "remove-timestamp_btn": {
                const payload = {
                    approute,
                    timestamp,
                };
                dispatcher(removeTimestamp(payload));
                break;
            }
            case "zip_btn": {
                const payload = {
                    source: getCurAppName(source),
                    dismisstype,
                };
                dispatcher(zipRecords(payload));
                break;
            }
            case "unzip_btn": {
                const payload = {
                    source: getCurAppName(source),
                    dismisstype,
                };
                dispatcher(unzipRecords(payload));
                break;
            }
            case "extract-dismissed_btn": {
                const payload = {
                    source: getCurAppName(source),
                    dismisstype: true,
                    timestamp,
                    approute,
                };
                dispatcher(extractRows(payload));
                break;
            }
            case "extract-undismissed_btn": {
                const payload = {
                    source: getCurAppName(source),
                    dismisstype: false,
                    timestamp,
                    approute,
                };
                dispatcher(extractRows(payload));
                break;
            }
            case "extract-selected_btn": {
                const payload = {
                    destination: getCurAppName(source),
                    selecttype: true,
                    timestamp,
                    approute,
                };
                dispatcher(extractContent(payload));
                break;
            }
            case "extract-unselected_btn": {
                const payload = {
                    destination: getCurAppName(source),
                    selecttype: false,
                    timestamp,
                    approute,
                };
                dispatcher(extractContent(payload));
                break;
            }
            case "insert-steps_btn": {
                const payload = {
                    destination: getCurAppName(source),
                    timestamp,
                    approute,
                };
                dispatcher(insertImageUrls(payload));
                break;
            }
            case "onboard-images_btn": {
                const payload = {
                    timestamp,
                    approute,
                };
                dispatcher(setImageUrls(payload));
                break;
            }
            case "toggle-dismissType_btn":
                dispatcher(encodingSource());
                break;
            case "clear-images_btn":
                dispatcher(escrowUploads(null));
                break;
            case "enable-selected_btn":
                dispatcher(toggleAbility(true));
                break;
            case "disable-selected_btn":
                dispatcher(toggleAbility(false));
                break;
            case "promote-selected_btn":
                dispatcher(toggleMotion(true));
                break;
            case "demote-selected_btn":
                dispatcher(toggleMotion(false));
                break;
            case "hydrate-btn": {
                dispatcher(hydrateSkeletonRows());
                break;
            }
            default:
                throw new Error("invalid or unknown button ID -> " + buttonId);
        }
    };

    const handleSwitchButton = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const value = e.target.value;

        switch (value) {
            case "toggle-include-current-in-templates_btn":
                dispatcher(toggleIncludeCurrentInTemplates());
                break;
            case "toggle-include-current-in-skeletons_btn":
                dispatcher(toggleIncludeCurrentInSkeletons());
                break;
            case "toggle-export-comments_btn":
                dispatcher(toggleExportComments());
                break;
            case "toggle-unzip-coursez_btn":
                dispatcher(toggleUnzipCourses_());
                break;
            case "toggle-unzip-tutorialz_btn":
                dispatcher(toggleUnzipTutorials_());
                break;
            case "toggle-unzip-quizz_btn":
                dispatcher(toggleUnzipQuizzes_());
                break;
            case "toggle-unzip-courses_btn":
                dispatcher(toggleUnzipCourses());
                break;
            case "toggle-unzip-tutorials_btn":
                dispatcher(toggleUnzipTutorials());
                break;
            case "toggle-unzip-quizzes_btn":
                dispatcher(toggleUnzipQuizzes());
                break;
            case "toggle-clear-type_btn":
                dispatcher(clearTypeSelected());
                break;
            case "toggle-courses-to-quizzes_btn":
                dispatcher(toggleCoursesToQuizzes());
                break;
            case "toggle-tutorials-to-courses_btn":
                dispatcher(toggleTutorialsToCourses());
                break;
            case "toggle-algorithm":
                dispatcher(toggleAlgorithmExtraction());
                break;
            case "toggle-keywords":
                dispatcher(toggleKeywordsExtraction());
                break;
            case "toggle-account":
                dispatcher(toggleDeleteAccount());
                break;
            case "toggle-export":
                dispatcher(toggleExport());
                break;
            case "toggle-import":
                dispatcher(toggleImport());
                break;
            case "toggle-roots":
                dispatcher(toggleAlgorithm());
                break;
            case "toggle-history":
                dispatcher(toggleTraversals());
                break;
            case "toggle-seltype":
                dispatcher(toggleSelection());
                break;
            case "toggle-include-base64":
                dispatcher(toggleIncludeBase64());
                break;
            case "toggle-dowTok":
                dispatcher(toggleAquireVoucher());
                break;
            case "toggle-txtimg":
                dispatcher(toggleTextToImg());
                break;
            case "toggle-txtswap":
                dispatcher(toggleTextSwap());
                break;
            case "toggle-aquired-clipboard-consent_btn":
                dispatcher(toggleAquiredClipboardConsent());
                break;
            default:
                throw new Error("invalid or unknown button ID -> " + value);
        }
    };

    const handleSwitchLabel = (e: React.MouseEvent<HTMLElement>): void => {
        const labelId = (e.target as HTMLElement).id;

        switch (labelId) {
            case "showcased_lbl":
                dispatcher(formatSelected(false));
                break;
            case "tabled_lbl":
                dispatcher(formatSelected(true));
                break;
            case "cognito_lbl":
                dispatcher(toggleDomain(true));
                break;
            case "incognito_lbl":
                dispatcher(toggleDomain(false));
                break;
            case "public_lbl":
                dispatcher(toggleAvailability(false));
                break;
            case "private_lbl":
                dispatcher(toggleAvailability(true));
                break;
            case "format-switch":
                dispatcher(formatSelected(undefined));
                break;
            case "domain-switch":
                dispatcher(toggleDomain(undefined));
                break;
            case "availability-switch":
                dispatcher(toggleAvailability(undefined));
                break;
            default:
                throw new Error("invalid or unknown label ID -> " + labelId);
        }
    };

    const handleSwitch = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const switchId = e.target.id;
        switch (switchId) {
            case "domain-switch":
                dispatcher(toggleDomain(undefined));
                break;
            case "availability-switch":
                dispatcher(toggleAvailability(undefined));
                break;
            case "format-switch":
                dispatcher(formatSelected(undefined));
                break;
            default:
                throw new Error("invalid or unknown switch ID -> " + switchId);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const fileInput = e.target as HTMLInputElement;
        const id = fileInput.id;
        switch (id) {
            case "images_select": {
                if (fileInput.files) dispatcher(escrowUploads([...fileInput.files]));
                break;
            }
            default:
                throw new Error("invalid or unknown file input ID -> " + id);
        }
    };

    // handle datetime input
    const handleDatetimeInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const target = e.target as HTMLInputElement;
        const id = target.id;
        const raw = target.value; // "yyyy-MM-ddTHH:mm"
        const formatted = raw ? raw.replace("T", " ") : "";
        switch (id) {
            case "skeletons-from-datetime-input":
                dispatcher(skeletonsFromSelected(formatted));
                break;
            case "comments-from-datetime-input":
                dispatcher(commentsFromSelected(formatted));
                break;
            default:
                throw new Error("invalid or unknown datetime input ID -> " + id);
        }
    };

    const handleSelected = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        const target = e.target as HTMLSelectElement;
        const id = target.id;

        switch (id) {
            case "clear-content-type-select":
                dispatcher(clearContentTypeSelected(target.value));
                break;
            case "unzip-courses-select":
                dispatcher(unzipCoursesTypeSelected(target.value));
                break;
            case "unzip-tutorials-select":
                dispatcher(unzipTutorialsTypeSelected(target.value));
                break;
            case "unzip-quizzes-select":
                dispatcher(unzipQuizzesTypeSelected(target.value));
                break;
            case "cacher-select":
                dispatcher(toggleCacher(target.value));
                break;
            case "quota-select":
                dispatcher(quotaSelected(parseInt(target.value)));
                break;
            case "formatters-select":
                dispatcher(toggleFormatter(target.value));
                break;
            case "role-select":
                dispatcher(roleSelected(target.value));
                break;
            case "approute-select":
                dispatcher(approuteSelected(target.value));
                break;
            case "timestamp-select":
                dispatcher(timeSelected(target.value));
                break;
            case "connects-select":
                dispatcher(connectSelecteds(target.value));
                break;
            case "action-select":
                dispatcher(actionSelected(target.value));
                break;
            case "take-select":
                dispatcher(takeSelected(parseInt(target.value)));
                break;
            case "source-select":
                dispatcher(extractionSource(target.value));
                break;
            case "create-select":
                dispatcher(appendSelected(parseInt(target.value)));
                break;
            case "padding-select":
                dispatcher(paddingSelected(parseInt(target.value)));
                break;
            case "fsq-select":
                dispatcher(fsqSelected(parseInt(target.value)));
                break;
            case "query-limit-select":
                dispatcher(queryLimitSelected(parseInt(target.value)));
                break;
            case "algorithm-select":
                dispatcher(algorithmSelected(target.value));
                break;
            case "seconds-select":
                dispatcher(secondsSelected(parseInt(target.value)));
                break;
            case "catalina-select":
                dispatcher(catalinaSelected(parseInt(target.value)));
                break;
            case "orphansdeletion-select":
                dispatcher(orphansSizeSelected(parseInt(target.value)));
                break;
            case "create-tutorial-preset-select":
                dispatcher(createTutorialPresetSelected(target.value));
                break;
            case "create-quiz-preset-select":
                dispatcher(createQuizPresetSelected(target.value));
                break;
            case "create-course-preset-select":
                dispatcher(createCoursePresetSelected(target.value));
                break;
            case "snapshot-interval-select":
                dispatcher(snapshotIntervalSelected(parseFloat(target.value)));
                break;
            case "randomized-type-select":
                dispatcher(randomizedTypeSelected(target.value as 'Imageurls' | 'details' | 'both'));
                break;
            case "current-to-include-in-templates-select":
                dispatcher(includeCurrentInTemplatesSelected(target.value));
                break;
            case "fetch-tutorial-preset-select":
                dispatcher(fetchTutorialPresetSelected(target.value));
                break;
            case "fetch-quiz-preset-select":
                dispatcher(fetchQuizPresetSelected(target.value));
                break;
            case "fetch-course-preset-select":
                dispatcher(fetchCoursePresetSelected(target.value));
                break;
            case "current-to-include-in-skeletons-select":
                dispatcher(includeCurrentInSkeletonsSelected(target.value));
                break;
            case "fetch-comments-type-select":
                dispatcher(fetchCommentsTypeSelected(target.value));
                break;
            case "fetch-tutorial-comments-preset-select":
                dispatcher(fetchTutorialCommentsPresetSelected(target.value));
                break;
            case "fetch-quiz-comments-preset-select":
                dispatcher(fetchQuizCommentsPresetSelected(target.value));
                break;
            case "fetch-course-comments-preset-select":
                dispatcher(fetchCourseCommentsPresetSelected(target.value));
                break;
            case "current-to-export-comments-select":
                dispatcher(currentToExportCommentsSelected(target.value));
                break;
            case "memberapp-select":
            case "adminapp-select":
            case "userapp-select": {
                const index = parseInt(target.value);
                if (index === 0) {
                    const selecteds = orderEntitiesRootToLeafForWebapp(Tree.entities, getCurAppName(1)).map(predicate).flat();
                    const newEntities = orderEntitiesRootToLeafForWebapp(Tree.entities, getCurAppName(1)).map((entity: BaseEntity) => ({
                        ...entity,
                        unlocked: [],
                    }));
                    Tree.setEntities(newEntities);
                    const action = toggleRoutes({ selecteds, action: clearData.type });
                    setTimeout(() => dispatcher(action));
                } else {
                    const app = siteapps[id].apps[index - siteapps[id].offset].toLowerCase();
                    const newEntities = orderEntitiesRootToLeafForWebapp(Tree.entities, app).map((entity: BaseEntity) => ({
                        ...entity,
                        unlocked: [...entity.webapps[app]],
                    }));
                    Tree.setEntities(newEntities);
                    const selecteds = orderEntitiesRootToLeafForWebapp(Tree.entities, app).map(predicate).flat();
                    const action = toggleRoutes({ selecteds, action: selectAll.type });
                    setTimeout(() => dispatcher(action));
                }
                dispatcher(siteapps[id].setter(index));
                break;
            }
            default:
                throw new Error("invalid or unknown select ID -> " + id);
        }
    };

    return {
        handleSwitchButton,
        handleSwitchLabel,
        handleParentSel,
        handleFileInput,
        handleSubmitBtn,
        handleChildSel,
        handleSelected,
        handleSwitch,
        handleDatetimeInput,
        handleButton,
        focusChanged,
        isStartup,
    };
}


// tutorials=1&tutorial=1
// tutorials=1&tutorial=1&courses=1&course=1
// tutorials=1&tutorial=1&courses=1&course=1&quizzes=1&quiz=1
// quizzes=1&quiz=1
// courses=1&course=1
// courses=1&course=1&quizzes=1&quiz=1