import React from "react";
import ColOne from "../Columns/ColOne";
import ColTwo from "../Columns/ColTwo";
import ColSix from "../Columns/ColSix";
import { useSelector, useDispatch } from "react-redux"; ``
import { Icons } from "../../../Hooks/useIconsAssembler";
import { ShutdownAndExitLink } from "../Forms/ActionsBtns";
import useSettingsWait from "../../../Hooks/useSettingsWait";
import { ApplyActionButtons, EnterAndExit } from "../Forms/ActionsBtns";
import { useAnonymousSettingsBtns } from "../../../Hooks/useSettings/useAnonymousSettings";
import { useAnonymousSettingsApply } from "../../../Hooks/useSettings/useAnonymousSettings";
import { viewPayload as escrowPayload, ParentData, ViewPayload } from "../../../store/slices/viewSlice";
import {
    clearEscrow,
} from "../../../store/slices/viewSlice";
import {
    initLoading,
    extractKeywords,
    showAlgorithm,
    appendTraversals,
    InitLoadingPayload
} from "../../../library/actions";
import { initializedLoading as mutateSession, SessionState } from "../../../store/slices/sessionSlice";
import { RootState } from "../../../store/types";
import { UseSettingsReturn } from "../../../Hooks/useSettings";
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
    };

    const apply = useAnonymousSettingsApply(props);
    const onWait = useSettingsWait({ selectedRoutes, baseApply: apply });

    return <ApplyActionButtons apply={apply} onWait={onWait} inProgress={inProgress} />;
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
    };

    const { onEnter, goBack, isValid } = useAnonymousSettingsBtns(props);

    const params = {
        inProgress,
        isStartup,
        isValid,
        onEnter,
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
        <ColTwo
            handleButton={settings.handleButton}
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            isStartup={isStartup}
        >
            <ApplyActionButtonsLink />
        </ColTwo>,
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
        </ColSix>
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
];

// Main Formation function
export default function Formation(settings: UseSettingsReturn): React.ReactElement[][][] {
    const { isStartup } = settings;
    return [
        Tablet(settings, isStartup),
        Tablet(settings, isStartup),
        Mobile(settings, isStartup),
    ];
}
