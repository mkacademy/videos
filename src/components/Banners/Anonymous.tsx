import React, { useEffect, useState } from "react";
import { Alert, Col } from "react-bootstrap";
import { useTimeOutHook } from "../views/404";
import { timeout, getAlias } from "../../utils";
import { useTabulatorBannerSuffix } from "../../Hooks/useTabulatorRows";
import * as styles from '../../styles/tableView.module.css';
import { InitReloadingPayload } from "../../library/actions";

const styleProps = {
    previewWarning: styles["preview-warning"],
    alert: styles["alert"],
    h4: styles["h4"],
};

interface AnonymousProps {
    reLoadData: (options: InitReloadingPayload) => void;
    isPaused: React.RefObject<boolean>;
    initLoading: () => void;
    isFetching: boolean;
    isLoading: boolean;
    isAppend: boolean;
    entity: string;
}

export default function Anonymous({
    initLoading,
    reLoadData,
    isFetching,
    isLoading,
    isAppend,
    isPaused,
    entity,
}: AnonymousProps) {
    const suffix = useTabulatorBannerSuffix();
    const alias = getAlias(entity) + suffix;
    const [showLoadMsg, setShowLoadMsg] = useState<boolean>(false);

    useEffect(() => {
        const show = !isPaused.current && (isLoading || isFetching);
        setShowLoadMsg(show);
    }, [isPaused, isLoading, isFetching]);

    const maxDurartion = showLoadMsg ? timeout : 0;
    const loadMsg = `Fetching ${alias}. Please wait...`;
    const bannerMsg = showLoadMsg ? loadMsg : alias;

    const trigger = () => {
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

    return (
        <Col xs={12} className={styleProps.previewWarning}>
            <Alert variant="warning" className={styleProps.alert}>
                <Alert.Heading className={styleProps.h4} onClick={!showLoadMsg || timedOut ? retry : undefined}>
                    {message}
                </Alert.Heading>
            </Alert>
        </Col>
    );
}
