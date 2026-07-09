import React, { useCallback, useState } from 'react';
import * as styles from '../../styles/mediaPrepper.module.css';

type AspectRatioVideoPreviewProps = {
  src: string;
  videoWidth?: number;
  videoHeight?: number;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
};

const AspectRatioVideoPreview: React.FC<AspectRatioVideoPreviewProps> = ({
  src,
  videoWidth = 0,
  videoHeight = 0,
  videoRef,
}) => {
  const [measuredSize, setMeasuredSize] = useState<{ width: number; height: number } | null>(null);

  const resolvedWidth = videoWidth > 0 ? videoWidth : measuredSize?.width ?? 0;
  const resolvedHeight = videoHeight > 0 ? videoHeight : measuredSize?.height ?? 0;

  const handleLoadedMetadata = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (videoWidth > 0 && videoHeight > 0) return;
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setMeasuredSize({ width: video.videoWidth, height: video.videoHeight });
    }
  }, [videoHeight, videoWidth]);

  const wrapperStyle: React.CSSProperties = resolvedWidth > 0 && resolvedHeight > 0
    ? {
      width: '100%',
      aspectRatio: `${resolvedWidth} / ${resolvedHeight}`,
    }
    : {
      width: '100%',
    };

  return (
    <div className={styles['videoPreviewWrapper']} style={wrapperStyle}>
      <video
        ref={videoRef}
        className={styles['aspectVideo']}
        controls
        preload="metadata"
        src={src}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </div>
  );
};

export default AspectRatioVideoPreview;
