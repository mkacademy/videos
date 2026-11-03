import React from 'react';
import { Link } from 'react-router-dom';
import { SEARCH_LANDING_STATE } from '../../loadingRouteUtils';
import * as styles from '../../styles/mediaPlayer.module.css';

const searchIconSrc = new URL('../../Images/search-icon.png', import.meta.url).href;

/** Back to the search landing screen at `/`. */
const MediaSearchButton: React.FC = () => (
  <Link to="/" state={SEARCH_LANDING_STATE} aria-label="Search" className={styles['accountButton']}>
    <img src={searchIconSrc} alt="" className={styles['accountIcon']} />
  </Link>
);

export default MediaSearchButton;
