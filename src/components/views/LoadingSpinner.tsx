import React from 'react';
import * as styles from '../../styles/loading.module.css';

const LoadingSpinner: React.FC = () => (
  <div className={styles['ring']}>
    loading
    <span />
  </div>
);

export default LoadingSpinner;
