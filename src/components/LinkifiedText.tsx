import React from 'react';
import { textEllipsis } from '../utils';

/** Matches http/https URLs in plain text (stops at common trailing punctuation). */
const URL_REGEX = /https?:\/\/[^\s<]+[^\s<.,;:!?'")\]}]/gi;

const trimTrailingUrlPunctuation = (url: string): { href: string; trailing: string } => {
  const match = url.match(/^(https?:\/\/[^\s<]+[^\s<.,;:!?'")\]}]+)([.,;:!?)]+)?$/i);
  if (!match) return { href: url, trailing: '' };
  return { href: match[1], trailing: match[2] ?? '' };
};

export const linkifyPlainText = (text: string): React.ReactNode[] => {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const re = new RegExp(URL_REGEX.source, URL_REGEX.flags);

  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    const raw = match[0];
    const { href, trailing } = trimTrailingUrlPunctuation(raw);
    nodes.push(
      <a
        key={`link-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {href}
      </a>
    );
    if (trailing) nodes.push(trailing);
    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
};

export interface LinkifiedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

/** Renders plain text with http(s) URLs as clickable anchors. Optionally truncates via textEllipsis. */
const LinkifiedText: React.FC<LinkifiedTextProps> = ({ text, maxLength, className }) => {
  const display = maxLength !== undefined ? textEllipsis(text, maxLength) : text;
  return <span className={className}>{linkifyPlainText(display)}</span>;
};

export default LinkifiedText;
