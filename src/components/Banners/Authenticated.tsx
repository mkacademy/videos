import React, { useEffect, useState } from "react";
import { Alert, Col } from "react-bootstrap";
import { useTimeOutHook } from "../views/404";
import { capitalizeFirstLetter, VIEW_ROWS, timeout, getAlias } from "../../utils";
import { useTabulatorBannerSuffix } from "../../Hooks/useTabulatorRows";
import * as tableView from "../../styles/tableView.module.css";

const stylesProps = {
    previewWarning: tableView["preview-warning"],
    alert: tableView["alert"],
    h4: tableView["h4"],
}

interface AuthenticatedProps {
    urlPartsIndex: number;
    reLoadData: (options: { isPrivate?: boolean; isAppend?: boolean }) => void;
    isPaused: React.RefObject<boolean>;
    initLoading: () => void;
    isFetching: boolean;
    isLoading: boolean;
    isPrivate: boolean;
    operation?: string;
    isAppend: boolean;
    entity: string;
}

export default function Authenticated({
    urlPartsIndex,
    initLoading,
    reLoadData,
    isFetching,
    isLoading,
    isPrivate,
    operation,
    isPaused,
    isAppend,
    entity,
}: AuthenticatedProps): React.ReactElement {
    const suffix = useTabulatorBannerSuffix();
    const [showLoadMsg, setShowLoadMsg] = useState<boolean>(false);

    useEffect(() => {
        const show = !isPaused.current && (isLoading || isFetching);
        setShowLoadMsg(show);
    }, [isPaused, isLoading, isFetching]);

    const maxDurartion = showLoadMsg ? timeout : 0;
    const alias = capitalizeFirstLetter(getAlias(entity));
    const msg = (isPrivate ? "My " + alias : alias) + suffix;
    const laodMsg = `Fetching ${msg}. Please wait...`;
    const bannerMsg = showLoadMsg ? laodMsg : msg;
    const triggers = { isPrivate: !isPrivate, isAppend: !isAppend };
    const showDismiss = operation ? operation === VIEW_ROWS : urlPartsIndex === 0;

    const trigger = (): void => {
        initLoading();
        reLoadData({ isAppend: !isAppend });
    };

    const props = {
        isAppend,
        maxDurartion,
        msg: bannerMsg,
        retryQuery: trigger,
    };

    const { retry, message } = useTimeOutHook(props);
    const timedOut = bannerMsg !== message;

    // console.log(message, isLoading, isFetching);
    return (
        <Col xs={12} className={stylesProps.previewWarning}>
            <Alert
                variant="warning"
                className={stylesProps.alert}
                onClose={() => reLoadData(triggers)}
                dismissible={showDismiss && !showLoadMsg}
            >
                <Alert.Heading className={stylesProps.h4} onClick={!showLoadMsg || timedOut ? retry : undefined}>
                    {message}
                </Alert.Heading>
            </Alert>
        </Col>
    );
}
