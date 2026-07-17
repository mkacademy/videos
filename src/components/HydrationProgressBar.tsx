import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import * as styles from '../styles/hydrationProgress.module.css';

const FINISH_FADE_MS = 400;

/** Thin top-of-viewport bar for hydration progress (all routes, including prepper). */
const HydrationProgressBar: React.FC = () => {
  const hydrationQueries = useSelector((state: RootState) => state.session.hydrationQueries);
  const hydrationTotal = useSelector((state: RootState) => state.session.hydrationTotal);

  const [finishVisible, setFinishVisible] = useState(false);
  const wasHydratingRef = useRef(false);

  const hydrating = hydrationTotal > 0 && hydrationQueries > 0;
  const ratio =
    hydrationTotal > 0
      ? Math.min(1, Math.max(0, (hydrationTotal - hydrationQueries) / hydrationTotal))
      : 0;
  const progressRatio = finishVisible ? 1 : ratio;
  const showProgress = hydrating || finishVisible;

  useEffect(() => {
    if (hydrating) {
      wasHydratingRef.current = true;
      setFinishVisible(false);
      return;
    }
    if (wasHydratingRef.current && hydrationTotal > 0 && hydrationQueries === 0) {
      wasHydratingRef.current = false;
      setFinishVisible(true);
      const timeoutId = setTimeout(() => setFinishVisible(false), FINISH_FADE_MS);
      return () => clearTimeout(timeoutId);
    }
    wasHydratingRef.current = false;
  }, [hydrating, hydrationQueries, hydrationTotal]);

  if (!showProgress) return null;

  return (
    <div
      className={`${styles['track']}${finishVisible ? ` ${styles['finishing']}` : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progressRatio * 100)}
      aria-label="Hydration progress"
    >
      <div
        className={styles['bar']}
        style={{ width: `${Math.max(progressRatio * 100, hydrating ? 2 : 0)}%` }}
      />
    </div>
  );
};

export default HydrationProgressBar;
