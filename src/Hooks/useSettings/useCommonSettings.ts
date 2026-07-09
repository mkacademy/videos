import {
    cookIngredients,
    setUrlParts, getEntity, setTake,
    ADD_ROWS,
    VIEW_ROWS,
} from "../../utils";
import { tabluarPrefixes } from "../../constants";
import { SettingsState } from "../../store/slices/settingsSlice";
import { SessionState } from "../../store/slices/sessionSlice";
import { ParentData } from "../../store/slices/viewSlice";

interface CommonSettingsParams {
    setAlgorithmTraversals: (algorithm: string) => void;
    updateMenuItem: (changes: Partial<SessionState> & { parentData: undefined }) => void;
    settings: SettingsState;
    extract: () => void;
    parent: string | undefined;
}

interface CommonSettingsReturn {
    commonEnter: () => void;
    commonApply: () => void;
}

interface CommonAccountSettingsParams {
    tableAction: string;
    isIncognito: boolean;
    isPrivate: boolean;
    settings: SettingsState;
    affix: string;
}

interface CommonAccountSettingsReturn {
    isTranversing: boolean;
    isClearView: boolean;
    changes: {
        fetchRole: string;
        mutateRole: string;
        tableAction: string;
        isIncognito: boolean;
        isPrivate: boolean;
        padCount: number | undefined;
        addCount: number | undefined;
        affix: string;
        operation: string;
    };
    getUpdateUrl: (props: UpdateUrlParams) => UpdateUrlReturn;
}

interface UpdateUrlParams {
    child?: string | undefined;
    prefix?: string;
    isEnter: boolean;
    settings: SettingsState;
    parentData?: ParentData | undefined;
    defaultTake?: number;
}

interface UpdateUrlReturn {
    url: string | undefined;
    curChild: string | undefined;
    curParent: string | undefined;
    ingredients: {
        prefix: string;
        parentData: ParentData | undefined;
        defaultTake: number;
        search: string | undefined;
        entity: string | undefined;
    };
}

interface CookIngredientsParams {
    prefix: string;
    parentData: ParentData | undefined;
    defaultTake: number;
    entity: string | undefined;
    search: string | undefined;
}

export const commonSettings = ({
    setAlgorithmTraversals,
    updateMenuItem,
    settings,
    extract,
    parent,
}: CommonSettingsParams): CommonSettingsReturn => {
    const changes = {
        curApp:
            settings.userapp > 0
                ? settings.userapp
                : settings.memberapp > 0
                    ? settings.memberapp
                    : settings.adminapp,
        prefix: settings.prefix,
        imData: settings.iMport,
        exData: settings.eXport,
        exAlgorithm: settings.exRoots,
        exTraversals: settings.exHistory,
        curRoutes: settings.selectedRoutes,
        defaultTake: parseInt(settings.take?.toString() || "0"),
        isExtractAlgo: settings.isExtractAlgo,
        parent: getEntity(settings.selectedParent),
    };
    const commonApply = () => {
        if (settings.isExtractKeys) extract();
        updateMenuItem({ ...changes, parent, parentData: undefined });
        if (!settings.isExtractAlgo)
            setTimeout(() => setAlgorithmTraversals(settings.algorithm));
        setTake(settings.take || 0);
    };
    const commonEnter = () => {
        updateMenuItem({ ...changes, parentData: undefined });
        if (!settings.isExtractAlgo)
            setTimeout(() => setAlgorithmTraversals(settings.algorithm));
        setTake(settings.take || 0);
    };
    return { commonEnter, commonApply };
};

export const commonAccountSetings = ({
    tableAction,
    isIncognito,
    isPrivate,
    settings,
    affix,
}: CommonAccountSettingsParams): CommonAccountSettingsReturn => {
    const isTranversing = settings.action !== tableAction;
    const pred = (p: string): boolean => p.includes(settings.action);
    const changes = {
        fetchRole: settings.role,
        mutateRole: settings.role,
        tableAction: settings.action,
        isIncognito: !settings.domain,
        isPrivate: settings.availability ?? false,
        padCount: settings.padding,
        addCount: settings.creates,
        affix: isTranversing ? tabluarPrefixes.find(pred) || affix : affix,
        operation: settings.action === "add" ? ADD_ROWS : VIEW_ROWS,
    };
    const isClearView =
        settings.domain !== undefined &&
        settings.availability !== undefined &&
        (isIncognito !== !settings.domain || settings.availability !== isPrivate);
    const getUpdateUrl = (props: UpdateUrlParams): UpdateUrlReturn => {
        if (!settings.isTabled && isTranversing)
            setUrlParts({
                affix: changes.affix,
                index: tabluarPrefixes.indexOf(changes.affix),
            });
        return updateUrl(props);
    };
    return { isTranversing, isClearView, changes, getUpdateUrl };
};

export const updateUrl = ({
    child,
    prefix,
    isEnter,
    settings,
    parentData,
    defaultTake,
}: UpdateUrlParams): UpdateUrlReturn => {
    const curChild = getEntity(settings.selectedChild);
    const curParent = getEntity(settings.selectedParent);

    const curApp = settings.userapp > 0
        ? settings.userapp
        : settings.memberapp > 0
            ? settings.memberapp
            : settings.adminapp;

    const ingredients: CookIngredientsParams = isEnter
        ? {
            prefix: settings.isTabled ? tabluarPrefixes[0] : "/app/",
            parentData: { IDs: [], curApp, parent: curParent },
            defaultTake: parseInt(settings.take?.toString() || "0"),
            entity: curChild,
            search: undefined,
        }
        : {
            prefix: prefix || "",
            parentData: parentData || { IDs: [], curApp, parent: curParent },
            defaultTake: defaultTake || 0,
            search: undefined,
            entity: child
        };

    const cookResult = cookIngredients(ingredients);
    const url = cookResult?.url;

    const finalIngredients = {
        ...ingredients,
        search: undefined,
    };

    return { url, curChild, curParent, ingredients: finalIngredients };
};
