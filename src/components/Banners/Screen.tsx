import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Anonymous from "./Anonymous";
import Authenticated from "./Authenticated";
import { initReloading, InitReloadingPayload } from "../../library/actions";
import { viewLoading, viewUrlParams } from "../../store/slices/viewSlice";
import { RootState } from "../../store/types";

interface ScreenProps {
    entity: string;
    operation: string;
}

const Screen: React.FC<ScreenProps> = ({ entity, operation }) => {
    const { encodedData, target } = useParams<{ encodedData?: string; target?: string }>();
    const dispatch = useDispatch();

    // Individual useSelector hooks for each prop
    const isAppend = useSelector((state: RootState) => state.session.isAppend);
    const isFetching = useSelector((state: RootState) => state.view.isFetching);
    const isPrivate = useSelector((state: RootState) => state.session.isPrivate);
    const isLoading = useSelector((state: RootState) => state.session.isFetching);
    const isPaused = useSelector((state: RootState) => state.session.pauseFetchers);
    const isIncognito = useSelector((state: RootState) => state.session.isIncognito);
    const urlPartsIndex = useSelector((state: RootState) => state.session.urlPartsIndex);

    const notTrigger = useRef<boolean>(isPaused);
    notTrigger.current = isPaused;

    // Action dispatchers
    const saveParams = (payload: { encodedData?: string; target?: string }) =>
        dispatch(viewUrlParams(payload));
    const reLoadData = (payload: InitReloadingPayload) => dispatch(initReloading(payload));
    const initLoading = () => dispatch(viewLoading());

    useEffect(() => {
        saveParams({ encodedData, target });
    }, [encodedData, target]);

    return isIncognito ? (
        <Anonymous
            entity={entity}
            isAppend={isAppend}
            isFetching={isFetching}
            isLoading={isLoading}
            isPaused={notTrigger}
            reLoadData={reLoadData}
            initLoading={initLoading}
        />
    ) : (
        <Authenticated
            isPaused={notTrigger}
            isPrivate={isPrivate}
            entity={entity}
            isAppend={isAppend}
            isFetching={isFetching}
            isLoading={isLoading}
            urlPartsIndex={urlPartsIndex}
            operation={operation}
            reLoadData={reLoadData}
            initLoading={initLoading}
        />
    );
};

export default Screen;
