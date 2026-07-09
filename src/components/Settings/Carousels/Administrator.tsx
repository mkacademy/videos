import React from "react";
import ColOne from "../Columns/ColOne";
import ColTwo from "../Columns/ColTwo";
import ColSix from "../Columns/ColSix";
import ColFour from "../Columns/ColFour";
import ColSeven from "../Columns/ColSeven";
import ColNine from "../Columns/ColNine";
import { useSelector, useDispatch } from "react-redux";
import { Icons } from "../../../Hooks/useIconsAssembler";
import useSettingsWait from "../../../Hooks/useSettingsWait";
import { ShutdownAndExitLink } from "../Forms/ActionsBtns";
import { ApplyActionButtons, EnterAndExit } from "../Forms/ActionsBtns";
import { useModeratorSettingsBtns } from "../../../Hooks/useSettings/useModeratorSettings";
import { useModeratorSettingsApply } from "../../../Hooks/useSettings/useModeratorSettings";
import { useMemberSettingsBtns } from "../../../Hooks/useSettings/useMembersSettings";
import { useMemberSettingsApply } from "../../../Hooks/useSettings/useMembersSettings";
import { useAnonymousSettingsBtns } from "../../../Hooks/useSettings/useAnonymousSettings";
import { useAnonymousSettingsApply } from "../../../Hooks/useSettings/useAnonymousSettings";
import { useAdminSettingsBtns } from "../../../Hooks/useSettings/useAdminSettings";
import { useAdminSettingsApply } from "../../../Hooks/useSettings/useAdminSettings";
import { viewPayload as escrowPayload, ParentData, ViewPayload } from "../../../store/slices/viewSlice";
import {
    clearEscrow,
} from "../../../store/slices/viewSlice";
import {
    initLoading,
    extractKeywords,
    showAlgorithm,
    appendTraversals,
    InitLoadingPayload,
} from "../../../library/actions";
import { initializedLoading as mutateSession, SessionState } from "../../../store/slices/sessionSlice";
import { RootState } from "../../../store/types";
import { UseSettingsReturn } from "../../../Hooks/useSettings";
import ColFourteen from "../Columns/ColFourteen";
import ColEleven from "../Columns/ColEleven";

const ApplyActionButtonsLink: React.FC = () => {
    const dispatch = useDispatch();

    const child = useSelector((state: RootState) => state.view.entity);
    const settings = useSelector((state: RootState) => state.settings);
    const parent = useSelector((state: RootState) => state.view.parent);
    const curPrefix = useSelector((state: RootState) => state.session.prefix);
    const parentData = useSelector((state: RootState) => state.view.parentData);
    const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
    const isIncognito = useSelector((state: RootState) => state.session.isIncognito);
    const selectedRoutes = useSelector((state: RootState) => state.settings.selectedRoutes);
    const tableAction = useSelector((state: RootState) => state.session.tableAction);
    const isPrivate = useSelector((state: RootState) => state.session.isPrivate);
    const affix = useSelector((state: RootState) => state.session.affix);
    const roles = useSelector((state: RootState) => state.session.roles);
    const inProgress = useSelector((state: RootState) =>
        state.view.requestIsProcessing
    );

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
        isIncognito,
        clearView,
        extract,
        dispatch,
        updateMenuItem,
        preserveIngredients,
        launchAlgorithm,
        setAlgorithmTraversals,
        tableAction,
        isPrivate,
        affix,
        roles,
    };

    const apply = useAnonymousSettingsApply(props);
    const memberprops = { ...props, baseApply: apply };
    const onMemberApply = useMemberSettingsApply(memberprops);
    const moderatorprops = { ...props, baseApply: onMemberApply };
    const onModeratorApply = useModeratorSettingsApply(moderatorprops);
    const adminprops = { ...props, baseApply: onModeratorApply };
    const onAdminApply = useAdminSettingsApply(adminprops);
    const onWait = useSettingsWait({ selectedRoutes, baseApply: onAdminApply });

    return <ApplyActionButtons apply={onAdminApply} onWait={onWait} inProgress={inProgress} />;
};

// EnterAndExit Component
interface EnterAndExitBtnsProps {
    isStartup?: boolean;
}

const EnterAndExitBtns: React.FC<EnterAndExitBtnsProps> = ({ isStartup = false }) => {
    const dispatch = useDispatch();

    // Individual useSelector hooks for each prop
    const child = useSelector((state: RootState) => state.view.entity);
    const settings = useSelector((state: RootState) => state.settings);
    const parent = useSelector((state: RootState) => state.view.parent);
    const parentData = useSelector((state: RootState) => state.view.parentData);
    const isIncognito = useSelector((state: RootState) => state.session.isIncognito);
    const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
    const curPrefix = useSelector((state: RootState) => state.session.prefix);
    const tableAction = useSelector((state: RootState) => state.session.tableAction);
    const isPrivate = useSelector((state: RootState) => state.session.isPrivate);
    const affix = useSelector((state: RootState) => state.session.affix);
    const roles = useSelector((state: RootState) => state.session.roles);
    const inProgress = useSelector((state: RootState) =>
        state.view.requestIsProcessing
    );

    // Action dispatchers
    const clearView = (options: ViewPayload) => {
        dispatch(clearEscrow());
        dispatch(escrowPayload(options));
    };
    const extract = () => dispatch(extractKeywords());
    const launchAlgorithm = (pathname: string) => dispatch(showAlgorithm(pathname));
    const setAlgorithmTraversals = (payload: string) => dispatch(appendTraversals(payload));
    const updateMenuItem = (payload: Partial<SessionState> & { parentData: ParentData | undefined }) => dispatch(mutateSession(payload));
    const preserveIngredients = (payload: InitLoadingPayload) => dispatch(initLoading(payload));

    const props = {
        child,
        settings,
        parent,
        parentData,
        isIncognito,
        defaultTake,
        curPrefix,
        clearView,
        extract,
        dispatch,
        updateMenuItem,
        launchAlgorithm,
        preserveIngredients,
        setAlgorithmTraversals,
        tableAction,
        isPrivate,
        affix,
        roles,
    };

    const { onEnter, goBack, isValid } = useAnonymousSettingsBtns(props);
    const memberprops = { ...props, baseOnEnter: onEnter };
    const onMemberEnter = useMemberSettingsBtns(memberprops);
    const moderatorprops = { ...props, baseOnEnter: onMemberEnter };
    const onModeratorEnter = useModeratorSettingsBtns(moderatorprops);
    const adminprops = { ...props, baseOnEnter: onModeratorEnter };
    const onAdminEnter = useAdminSettingsBtns(adminprops);
    const params = {
        onEnter: onAdminEnter,
        inProgress,
        isStartup,
        isValid,
        goBack,
    };

    return <EnterAndExit {...params} />;
};

// Layout functions

const Tablet = (settings: UseSettingsReturn, isStartup?: boolean): React.ReactElement[][] => [
    [
        <ColEleven
            handleButton={settings.handleButton}
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton} >
        </ColEleven>,
        <ColFourteen
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            handleButton={settings.handleButton}
        >
            <ApplyActionButtonsLink />
        </ColFourteen>,
    ], [
        <ColFour
            handleButton={settings.handleButton}
            handleFileInput={settings.handleFileInput}
            handleSelected={settings.handleSelected}
            handleSubmitBtn={settings.handleSubmitBtn}
        >
            <ApplyActionButtonsLink />
        </ColFour>,
        <ColSeven
            handleButton={settings.handleButton}
            handleSwitch={settings.handleSwitch}
            handleSelected={settings.handleSelected}
            handleSwitchLabel={settings.handleSwitchLabel}
            handleSwitchButton={settings.handleSwitchButton}
        >
        </ColSeven>,
    ], [
        <ColOne
            Icons={Icons}
            handleSwitch={settings.handleSwitch}
            focusChanged={settings.focusChanged}
            handleSelected={settings.handleSelected}
            handleParentSel={settings.handleParentSel}
            handleSwitchLabel={settings.handleSwitchLabel}
            handleButton={settings.handleButton}
        >
            <ShutdownAndExitLink />
        </ColOne>,
        <ColSix
            handleSwitchButton={settings.handleSwitchButton}
            handleChildSel={settings.handleChildSel}
            handleButton={settings.handleButton}
        >
            <ApplyActionButtonsLink />
            <EnterAndExitBtns isStartup={isStartup} />
        </ColSix>,
    ], [
        <ColNine
            handleButton={settings.handleButton}
            handleSwitchButton={settings.handleSwitchButton}
            handleSelected={settings.handleSelected}
        >
        </ColNine>,
        <ColTwo
            handleButton={settings.handleButton}
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            isStartup={isStartup}
        >
            <ApplyActionButtonsLink />
        </ColTwo>,
    ],
];

const Mobile = (settings: UseSettingsReturn, isStartup?: boolean): React.ReactElement[][] => [
    [
        <ColEleven
            handleButton={settings.handleButton}
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton} >
            <EnterAndExitBtns isStartup={isStartup} />
            <ShutdownAndExitLink />
            <ApplyActionButtonsLink />
        </ColEleven>,
    ],
    [
        <ColFourteen
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            handleButton={settings.handleButton}
        >
            <EnterAndExitBtns isStartup={isStartup} />
            <ShutdownAndExitLink />
            <ApplyActionButtonsLink />
        </ColFourteen>,
    ],
    [
        <ColFour
            handleButton={settings.handleButton}
            handleFileInput={settings.handleFileInput}
            handleSelected={settings.handleSelected}
            handleSubmitBtn={settings.handleSubmitBtn}
        >
            <EnterAndExitBtns isStartup={isStartup} />
            <ShutdownAndExitLink />
            <ApplyActionButtonsLink />
        </ColFour>,
    ],
    [
        <ColSeven
            handleButton={settings.handleButton}
            handleSwitch={settings.handleSwitch}
            handleSelected={settings.handleSelected}
            handleSwitchLabel={settings.handleSwitchLabel}
            handleSwitchButton={settings.handleSwitchButton}
        >
            <EnterAndExitBtns isStartup={isStartup} />
            <ShutdownAndExitLink />
            <ApplyActionButtonsLink />
        </ColSeven>,
    ],
    [
        <ColOne
            Icons={Icons}
            handleSwitch={settings.handleSwitch}
            focusChanged={settings.focusChanged}
            handleSelected={settings.handleSelected}
            handleParentSel={settings.handleParentSel}
            handleSwitchLabel={settings.handleSwitchLabel}
            handleButton={settings.handleButton}
        >
            <EnterAndExitBtns isStartup={isStartup} />
            <ShutdownAndExitLink />
            <ApplyActionButtonsLink />
        </ColOne>,
    ],
    [
        <ColSix
            handleSwitchButton={settings.handleSwitchButton}
            handleChildSel={settings.handleChildSel}
            handleButton={settings.handleButton}
        >
            <EnterAndExitBtns isStartup={isStartup} />
            <ShutdownAndExitLink />
            <ApplyActionButtonsLink />
        </ColSix>,
    ],
    [
        <ColNine
            handleButton={settings.handleButton}
            handleSwitchButton={settings.handleSwitchButton}
            handleSelected={settings.handleSelected}
        >
            <EnterAndExitBtns isStartup={isStartup} />
            <ShutdownAndExitLink />
            <ApplyActionButtonsLink />
        </ColNine>,
    ],
    [
        <ColTwo
            handleButton={settings.handleButton}
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            isStartup={isStartup}
        >
            <EnterAndExitBtns isStartup={isStartup} />
            <ShutdownAndExitLink />
            <ApplyActionButtonsLink />
        </ColTwo>,
    ],
];

// Main Administrator function
export default function Administrator(settings: UseSettingsReturn): React.ReactElement[][][] {
    const { isStartup } = settings;
    return [
        Tablet(settings, isStartup),
        Tablet(settings, isStartup),
        Mobile(settings, isStartup),
    ];
}
