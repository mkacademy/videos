import React, { useEffect, useMemo, useRef } from 'react';
import { Spinner } from 'react-bootstrap';
import { IoPlay, IoPause, IoPlaySkipBack, IoPlaySkipForward } from 'react-icons/io5';
import { formatPlaybackMs } from '../../library/videoChunkPlayback';
import * as styles from '../../styles/audioWaveformPlayer.module.css';

const BAR_COUNT = 48;

function seededBarHeight(seed: number): number {
  const value = Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
  return 0.2 + (value % 1) * 0.8;
}

type AudioWaveformPlayerProps = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  globalPlaybackMs: number;
  totalDurationMs: number;
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (globalMs: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  audioRef,
  globalPlaybackMs,
  totalDurationMs,
  isPlaying,
  isLoading,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
  canGoPrevious,
  canGoNext,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceConnectedRef = useRef(false);

  const idleHeights = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, index) => seededBarHeight(index + 1)),
    [],
  );

  const progress = totalDurationMs > 0 ? globalPlaybackMs / totalDurationMs : 0;

  useEffect(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const ensureAnalyser = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }
      if (!sourceConnectedRef.current) {
        const source = audioContextRef.current.createMediaElementSource(audio);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
        sourceConnectedRef.current = true;
      }
    };

    const drawBars = (heights: number[]) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const gap = 3;
      const barWidth = Math.max(2, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT);

      ctx.clearRect(0, 0, width, height);
      heights.forEach((barHeight, index) => {
        const barH = Math.max(4, barHeight * height);
        const x = index * (barWidth + gap);
        const y = (height - barH) / 2;
        const played = index / BAR_COUNT <= progress;
        ctx.fillStyle = played ? '#111' : '#d0d0d0';
        ctx.fillRect(x, y, barWidth, barH);
      });
    };

    const draw = () => {
      if (isPlaying && analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const step = Math.floor(data.length / BAR_COUNT);
        const heights = Array.from({ length: BAR_COUNT }, (_, index) => {
          const slice = data.slice(index * step, (index + 1) * step);
          const avg = slice.reduce((sum, value) => sum + value, 0) / Math.max(1, slice.length);
          return 0.15 + (avg / 255) * 0.85;
        });
        drawBars(heights);
      } else {
        drawBars(idleHeights);
      }
      animationRef.current = requestAnimationFrame(draw);
    };

    try {
      ensureAnalyser();
    } catch {
      // MediaElementSource may already be connected in strict mode remounts.
    }

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioRef, idleHeights, isPlaying, progress]);

  useEffect(() => () => {
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    sourceConnectedRef.current = false;
  }, []);

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextProgress = Number(event.target.value) / 1000;
    onSeek(nextProgress * totalDurationMs);
  };

  return (
    <div className={styles['player']}>
      <audio ref={audioRef} preload="auto" className={styles['audioElement']} />
      <canvas ref={canvasRef} className={styles['waveform']} aria-hidden />

      <div className={styles['seekRow']}>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={handleSeekChange}
          className={styles['seekInput']}
          aria-label="Seek"
        />
      </div>

      <div className={styles['timeRow']}>
        <span>{formatPlaybackMs(globalPlaybackMs)}</span>
        <span>{formatPlaybackMs(totalDurationMs)}</span>
      </div>

      <div className={styles['controls']}>
        <button
          type="button"
          className={styles['controlButton']}
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label="Previous chunk"
        >
          <IoPlaySkipBack size={22} />
        </button>
        <button
          type="button"
          className={`${styles['controlButton']} ${styles['playButton']}`}
          onClick={onTogglePlay}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? <Spinner animation="border" size="sm" /> : (
            isPlaying ? <IoPause size={28} /> : <IoPlay size={28} />
          )}
        </button>
        <button
          type="button"
          className={styles['controlButton']}
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next chunk"
        >
          <IoPlaySkipForward size={22} />
        </button>
      </div>
    </div>
  );
};

export default AudioWaveformPlayer;
