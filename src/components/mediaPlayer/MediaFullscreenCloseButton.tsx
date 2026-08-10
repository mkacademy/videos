import React from 'react';
import * as styles from '../../styles/mediaPlayer.module.css';

type MediaFullscreenCloseButtonProps = {
  onClose: () => void;
};

/** Exit control shown on the media fullscreen stage. */
const MediaFullscreenCloseButton: React.FC<MediaFullscreenCloseButtonProps> = ({
  onClose,
}) => (
  <button
    type="button"
    className={styles['fullscreenClose']}
    onClick={onClose}
    title="Exit fullscreen (Escape)"
    aria-label="Exit fullscreen"
  >
    ×
  </button>
);

export default MediaFullscreenCloseButton;
