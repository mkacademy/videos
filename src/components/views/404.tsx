import React, { useRef } from 'react';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { initReloading } from '../../library/actions';
import { RootState } from '../../store/types';
import * as styles from '../../styles/404.module.css';

const reqtimedout = "REQUEST TIMEDOUT";

interface TimeOutHookProps {
  msg: string;
  maxDurartion: number;
}

export const useTimeOutHook = ({ msg, maxDurartion }: TimeOutHookProps) => {
  const dispatch = useDispatch();
  const isAppend = useSelector((state: RootState) => state.session.isAppend);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const [message, setMessage] = useState(msg);

  useEffect(() => {
    setMessage(msg);
    if (maxDurartion && maxDurartion > 0) {
      const pred = () => setMessage(reqtimedout);
      timeoutId.current = setTimeout(pred, maxDurartion);
    }
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, [maxDurartion, msg]);

  const onFaceClicked = () => {
    const triggers = { isAppend: !isAppend, isFetching: true };
    const completed = maxDurartion === 0 || message === reqtimedout;
    if (completed) dispatch(initReloading(triggers));
  };

  return { retry: onFaceClicked, message };
};

interface ErrorPageProps extends TimeOutHookProps { }

const _404: React.FC<ErrorPageProps> = (props) => {
  const { retry, message } = useTimeOutHook(props);
  return (
    <React.Fragment>
      <div className={styles["face"]} onClick={retry}>
        <div className={styles["band"]}>
          <div className={styles["red"]}></div>
          <div className={styles["white"]}></div>
          <div className={styles["blue"]}></div>
        </div>
        <div className={styles["eyes"]}></div>
        <div className={styles["dimples"]}></div>
        <div className={styles["mouth"]}></div>
      </div>
      <h1>{message}</h1>
    </React.Fragment>
  );
};

interface Error500Props {
  message: string;
  retry?: () => void;
}

export const _500: React.FC<Error500Props> = ({ message, retry }) => {
  return (
    <React.Fragment>
      <div className={styles["face"]} onClick={retry}>
        <div className={styles["band"]}>
          <div className={styles["red"]}></div>
          <div className={styles["white"]}></div>
          <div className={styles["blue"]}></div>
        </div>
        <div className={styles["eyes"]}></div>
        <div className={styles["dimples"]}></div>
        <div className={styles["mouth"]}></div>
      </div>
      <h1>{message}</h1>
    </React.Fragment>
  );
};

export default _404; 