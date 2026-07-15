import React, { useEffect, useMemo, useRef } from 'react';
import { Spinner } from 'react-bootstrap';
import { IoPlay, IoPause, IoPlaySkipBack, IoPlaySkipForward } from 'react-icons/io5';
import { formatPlaybackMs } from '../../library/videoChunkPlayback';
import * as styles from '../../styles/audioWaveformPlayer.module.css';

const BAR_COUNT = 48;

type AudioGraph = {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
};

// A media element can only ever have a single MediaElementAudioSourceNode. Cache
// the graph per element so React StrictMode remounts (and any future remounts)
// reuse it instead of throwing on a second createMediaElementSource() call, which
// would leave the element permanently routed to a dead context and freeze playback.
const audioGraphs = new WeakMap<HTMLMediaElement, AudioGraph>();

function getAudioGraph(audio: HTMLMediaElement): AudioGraph {
  const existing = audioGraphs.get(audio);
  if (existing) return existing;

  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.8;
  const source = context.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(context.destination);

  const graph: AudioGraph = { context, analyser, source };
  audioGraphs.set(audio, graph);
  return graph;
}

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
  const isPlayingRef = useRef(isPlaying);
  const progressRef = useRef(0);

  const idleHeights = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, index) => seededBarHeight(index + 1)),
    [],
  );

  const progress = totalDurationMs > 0 ? globalPlaybackMs / totalDurationMs : 0;
  isPlayingRef.current = isPlaying;
  progressRef.current = progress;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

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
        const played = index / BAR_COUNT <= progressRef.current;
        ctx.fillStyle = played ? '#111' : '#d0d0d0';
        ctx.fillRect(x, y, barWidth, barH);
      });
    };

    const draw = () => {
      const analyser = analyserRef.current;
      if (isPlayingRef.current && analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
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

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [idleHeights]);

  // Lazily wire the Web Audio graph on the first play (a user gesture) and keep
  // the context running while playback is active. Without resuming, routing the
  // element through a suspended AudioContext freezes currentTime and mutes audio.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;

    let graph: AudioGraph;
    try {
      graph = getAudioGraph(audio);
    } catch {
      return;
    }

    analyserRef.current = graph.analyser;
    if (graph.context.state === 'suspended') {
      void graph.context.resume();
    }
  }, [audioRef, isPlaying]);

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
