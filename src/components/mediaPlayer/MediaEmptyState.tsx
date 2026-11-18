import React from 'react';
import { _500 as NotFound } from '../views/404';
import * as _404styles from '../../styles/404.module.css';

/** The head-band face with a caption, as the images screens show when there is nothing to list. */
const MediaEmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="d-flex justify-content-center py-4">
    <div className={`${_404styles['notFound']} ${_404styles['bigger']} d-inline-block`}>
      <NotFound message={message} />
    </div>
  </div>
);

export default MediaEmptyState;
