import React from 'react';
import * as styles from '../../styles/404.module.css';

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
