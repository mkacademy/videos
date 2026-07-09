import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Action } from '@reduxjs/toolkit';
import { RootState } from '../store/types';
import { getStashCellRows } from '../store/slices/stashSlice';
import { userApps, memberApps, adminsApps } from '../constants';
import {
    getCurAppName,
    genaralApps,
    updPred,
    getAlias,
    orderEntitiesRootToLeafForWebapp,
    Tree,
} from '../utils';
import { BaseEntity } from '../components/Core/types';
import {
    pickDirectoryHandle,
    pickWritableDirectoryHandle,
} from '../library/directoryTreeUtils';
import {
    buildTutorialTreesFromDirectory,
    buildTutorialTreesFromTextFolder,
    exportTutorialTreesToDirectory,
    exportTutorialTreesToTextFolder,
} from '../library/TemplatesManagerUtils';
import { fetchedHandles, prependError, prependWarning } from '../store/slices/errorSlice';
import { viewRequest } from '../store/slices/viewSlice';
import { setTutorials } from '../store/slices/tutorialSlice';

const DIRECTORY_IMPORT_MESSAGE = 'Processing files... please wait';

export const zipables: Record<number, boolean> = {
    1: false,
    2: false,
    3: false,
};

export const unzipables: Record<number, boolean> = {
    5: false,
    6: false,
};

interface UseColFourParams {
    handleSubmitBtn: (payload: Action) => void;
}

export const useColFour = ({ handleSubmitBtn }: UseColFourParams) => {
    const dispatch = useDispatch();
    const stash = useSelector((state: RootState) => state.stash);
    const source = useSelector((state: RootState) => state.settings.source);
    const seltype = useSelector((state: RootState) => state.settings.seltype);
    const approute = useSelector((state: RootState) => state.settings.approute);
    const timestamp = useSelector((state: RootState) => state.settings.timestamp);
    const formatters = useSelector((state: RootState) => state.settings.formatters);
    const uploads = useSelector((state: RootState) => state.settings.uploads.length);
    const characters = useSelector((state: RootState) => state.session?.roles?.length ?? 0);
    const dismisstype = useSelector((state: RootState) => state.settings.dismisstype);
    const inProgress = useSelector((state: RootState) => state.view.requestIsProcessing);
    const tutorialBanners = useSelector((state: RootState) => state.tutorial.banners);
    const tutorialContent = useSelector((state: RootState) => state.tutorial.content);

    const btnMsg = dismisstype
        ? !seltype
            ? 'Dismissed'
            : 'Highlighted'
        : !seltype
            ? 'unDismissed'
            : 'unHighlighted';
    const clrDisbaled = uploads === 0;
    const timestampz = stash[approute ?? ''];
    const zipDisabled = zipables[source ?? 0] ?? true;
    const unzipDisabled = unzipables[source ?? 0] ?? true;
    const updateables = timestampz ? getStashCellRows(timestampz[timestamp ?? '']) : undefined;
    const selected = updateables?.filter((item) => updPred({
        deleted: item.deleted ?? false,
        checked: item.checked ?? false,
        imageurl: item.imageurl,
    })).length ?? 0;
    const updLength = Math.min(selected, uploads);
    const uplDisbaled = updLength === 0 || uploads === 0;
    const uplMsg1 = `onboard ${uplDisbaled ? '' : uploads} Images`;
    const uplMsg0 = `update ${uplDisbaled ? '' : updLength} Images`;
    const zipVariant = dismisstype ? 'outline-primary' : 'outline-success';
    const curapps = Object.entries({
        ...userApps,
        ...memberApps,
        ...(characters > 2 ? adminsApps : {}),
        ...genaralApps,
    });
    const app = getCurAppName(source ?? 0);
    const predicate0 = ({ webapps }: BaseEntity) => webapps[app]?.length > 0;
    const predicate1 = (props: BaseEntity) => {
        const { webapps, name } = props;
        const alias = getAlias(name);
        return webapps[app].map((descendent: string) => ({
            [name + descendent]: alias + getAlias(descendent),
        }));
    };
    const routeAliases = orderEntitiesRootToLeafForWebapp(Tree.entities, app)
        .filter(predicate0)
        .map(predicate1)
        .flat()
        .reduce((p: Record<string, string>, c: Record<string, string>) => ({ ...p, ...c }), {
            undefined: '---CHOOSE_APP_ROUTE---',
        });
    const timestamps: Record<string, string> = {
        undefined: '---CHOOSE_TIMESTAMP---',
        ...(stash[approute ?? ''] ?? {}),
    };
    const isOption = Object.keys(timestamps).find((k) => k === timestamp);
    const name = !isOption || timestamp === 'undefined' ? undefined : timestamp;
    const fromto = approute === 'undefined' ? undefined : approute;
    const params = { approute, timestamp: name, handleSubmitBtn };

    const withProcessing = useCallback(async (task: () => Promise<void>) => {
        dispatch(viewRequest({ message: DIRECTORY_IMPORT_MESSAGE, completed: false }));
        try {
            await task();
        } finally {
            dispatch(viewRequest({ completed: true }));
        }
    }, [dispatch]);

    const handleBrowseDirectory = useCallback(async () => {
        const root = await pickDirectoryHandle();
        if (!root) return;

        await withProcessing(async () => {
            const built = await buildTutorialTreesFromDirectory(root);
            if (!built || built.banners.length === 0) {
                dispatch(prependError(built?.errors[0] ?? 'No tutorial banners could be created from directory'));
                return;
            }
            built.errors.forEach((msg) => dispatch(prependError(msg)));
            built.skipped.forEach((msg) => dispatch(prependWarning(msg)));
            dispatch(fetchedHandles(built.handles));
            dispatch(setTutorials({ banners: built.banners, content: built.content }));
            dispatch(prependWarning(`Created ${built.banners.length} tutorials from directory`));
        });
    }, [dispatch, withProcessing]);

    const handleExportDirectory = useCallback(async () => {
        const root = await pickWritableDirectoryHandle();
        if (!root) return;

        await withProcessing(async () => {
            const result = await exportTutorialTreesToDirectory(root, tutorialBanners, tutorialContent);
            if (result.exportedBanners === 0) {
                dispatch(prependError(
                    result.errors[0]
                    ?? result.skipped[0]
                    ?? 'No highlighted tutorial banners with images to export',
                ));
                return;
            }
            result.errors.forEach((msg) => dispatch(prependError(msg)));
            result.skipped.forEach((msg) => dispatch(prependWarning(msg)));
            dispatch(prependWarning(
                `Exported ${result.exportedImages} images in ${result.exportedBanners} banner folders`,
            ));
        });
    }, [dispatch, tutorialBanners, tutorialContent, withProcessing]);

    const handleBrowseTextFolder = useCallback(async () => {
        const root = await pickDirectoryHandle();
        if (!root) return;

        await withProcessing(async () => {
            const built = await buildTutorialTreesFromTextFolder(root);
            if (!built || built.banners.length === 0) {
                dispatch(prependError(built?.errors[0] ?? 'No tutorial banners could be created from folder'));
                return;
            }
            built.errors.forEach((msg) => dispatch(prependError(msg)));
            built.skipped.forEach((msg) => dispatch(prependWarning(msg)));
            dispatch(fetchedHandles(built.handles));
            dispatch(setTutorials({ banners: built.banners, content: built.content }));
            dispatch(prependWarning(`Created ${built.banners.length} tutorials from folder`));
        });
    }, [dispatch, withProcessing]);

    const handleExportTextFolder = useCallback(async () => {
        const root = await pickWritableDirectoryHandle();
        if (!root) return;

        await withProcessing(async () => {
            const result = await exportTutorialTreesToTextFolder(root, tutorialBanners, tutorialContent);
            if (result.exportedBanners === 0) {
                dispatch(prependError(
                    result.errors[0]
                    ?? result.skipped[0]
                    ?? 'No highlighted tutorial banners with text content to export',
                ));
                return;
            }
            result.errors.forEach((msg) => dispatch(prependError(msg)));
            result.skipped.forEach((msg) => dispatch(prependWarning(msg)));
            dispatch(prependWarning(
                `Exported ${result.exportedFiles} text files from ${result.exportedBanners} tutorial banners`,
            ));
        });
    }, [dispatch, tutorialBanners, tutorialContent, withProcessing]);

    return {
        source,
        approute,
        timestamp,
        formatters,
        seltype,
        inProgress,
        btnMsg,
        clrDisbaled,
        zipDisabled,
        unzipDisabled,
        uplDisbaled,
        uplMsg0,
        uplMsg1,
        zipVariant,
        curapps,
        routeAliases,
        timestamps,
        name,
        fromto,
        params,
        handleBrowseDirectory,
        handleExportDirectory,
        handleBrowseTextFolder,
        handleExportTextFolder,
    };
};
