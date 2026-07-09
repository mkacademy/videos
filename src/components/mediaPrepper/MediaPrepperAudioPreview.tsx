import React, { useCallback, useEffect, useRef, useState } from 'react';
import AudioWaveformPlayer from '../mediaPlayer/AudioWaveformPlayer';
import * as styles from '../../styles/mediaPrepper.module.css';

type MediaPrepperAudioPreviewProps = {
  src: string;
  className?: string;
  seekToSeconds?: number;
};

const MediaPrepperAudioPreview: React.FC<MediaPrepperAudioPreviewProps> = ({
  src,
  className,
  seekToSeconds,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleLoadedMetadata = () => {
      setDurationMs(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
      setIsLoading(false);
    };
    const handleTimeUpdate = () => {
      setCurrentMs(Math.round(audio.currentTime * 1000));
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    setIsLoading(true);
    setCurrentMs(0);
    setDurationMs(0);
    audio.src = src;
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [src]);

  useEffect(() => {
    if (seekToSeconds === undefined) return;
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seekToSeconds)) return;
    audio.currentTime = seekToSeconds;
    setCurrentMs(Math.round(seekToSeconds * 1000));
  }, [seekToSeconds]);

  const handleTogglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }, []);

  const handleSeek = useCallback((globalMs: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextSeconds = globalMs / 1000;
    audio.currentTime = nextSeconds;
    setCurrentMs(globalMs);
  }, []);

  return (
    <div className={className ?? styles['audioPreview']}>
      <AudioWaveformPlayer
        audioRef={audioRef}
        globalPlaybackMs={currentMs}
        totalDurationMs={durationMs}
        isPlaying={isPlaying}
        isLoading={isLoading}
        onTogglePlay={handleTogglePlay}
        onPrevious={() => undefined}
        onNext={() => undefined}
        onSeek={handleSeek}
        canGoPrevious={false}
        canGoNext={false}
      />
    </div>
  );
};

export default MediaPrepperAudioPreview;
