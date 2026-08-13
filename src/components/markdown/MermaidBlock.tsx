import React, { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import * as styles from '../../styles/mermaid.module.css';

let mermaidInitialized = false;

const ensureMermaidInitialized = () => {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'dark',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  });
  mermaidInitialized = true;
};

type MermaidBlockProps = {
  chart: string;
};

/** Renders a Mermaid diagram from fenced ```mermaid source. */
const MermaidBlock: React.FC<MermaidBlockProps> = ({ chart }) => {
  const reactId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const source = chart.trim();
    if (!source) {
      setError('Empty mermaid diagram');
      setPending(false);
      return undefined;
    }

    setPending(true);
    setError(null);
    if (containerRef.current) containerRef.current.innerHTML = '';

    (async () => {
      try {
        ensureMermaidInitialized();
        const renderId = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(renderId, source);
        if (cancelled) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setPending(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to render mermaid diagram');
        setPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <div className={styles['error']} role="alert">
        <p className={styles['errorLabel']}>Could not render Mermaid diagram</p>
        <pre className={styles['errorSource']}>{chart}</pre>
      </div>
    );
  }

  return (
    <div className={styles['wrap']}>
      {pending && <p className={styles['pending']}>Rendering diagram…</p>}
      <div
        ref={containerRef}
        className={styles['diagram']}
        aria-hidden={pending}
      />
    </div>
  );
};

export default MermaidBlock;
