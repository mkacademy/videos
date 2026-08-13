import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from './markdownComponents';

type MarkdownDocumentProps = {
  children: string;
};

/** GFM markdown with Mermaid fenced-block support. */
const MarkdownDocument: React.FC<MarkdownDocumentProps> = ({ children }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
    {children}
  </ReactMarkdown>
);

export default MarkdownDocument;
