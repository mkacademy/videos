import React, { Children, isValidElement, lazy, Suspense } from 'react';
import type { Components } from 'react-markdown';

const MermaidBlock = lazy(() => import('./MermaidBlock'));

const extractText = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement<{ children?: React.ReactNode }>(node) && node.props.children != null) {
    return extractText(node.props.children);
  }
  return '';
};

/** Shared ReactMarkdown component overrides (Mermaid fenced blocks, etc.). */
export const markdownComponents: Components = {
  pre({ children }) {
    const onlyChild = Children.toArray(children)[0];
    if (isValidElement<{ className?: string; children?: React.ReactNode }>(onlyChild)) {
      const className = String(onlyChild.props.className ?? '');
      const language = /language-([^\s]+)/.exec(className)?.[1];
      if (language === 'mermaid') {
        const chart = extractText(onlyChild.props.children).replace(/\n$/, '');
        return (
          <Suspense fallback={<pre>{chart}</pre>}>
            <MermaidBlock chart={chart} />
          </Suspense>
        );
      }
    }
    return <pre>{children}</pre>;
  },
};
