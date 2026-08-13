import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import * as styles from '../styles/mediaScreenSwitcher.module.css';

type MediaScreen = 'player' | 'thumbs' | 'markdown' | 'text';

const SCREEN_PATH: Record<MediaScreen, string> = {
  player: '/media-player',
  thumbs: '/media-thumbs',
  markdown: '/media-markdown',
  text: '/media-text',
};

const SCREEN_LABEL: Record<MediaScreen, string> = {
  player: 'Videos',
  thumbs: 'Thumbs',
  markdown: 'Markdown',
  text: 'Txt',
};

function resolveScreen(pathname: string): MediaScreen | null {
  if (pathname.includes('media-player')) return 'player';
  if (pathname.includes('media-thumbs')) return 'thumbs';
  if (pathname.includes('media-markdown')) return 'markdown';
  if (pathname.includes('media-text')) return 'text';
  return null;
}

type MediaScreenSwitcherProps = {
  /** Render as the page header title instead of a compact toolbar control. */
  asHeader?: boolean;
};

/** Toggle between Videos, Thumbs, Markdown, and Txt while preserving `?tab=`. */
const MediaScreenSwitcher: React.FC<MediaScreenSwitcherProps> = ({ asHeader = false }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const current = resolveScreen(pathname);
  const tab = searchParams.get('tab');

  if (!current) return null;

  const go = (screen: MediaScreen) => {
    if (screen === current) return;
    const path = SCREEN_PATH[screen];
    const next = tab ? `${path}?tab=${encodeURIComponent(tab)}` : path;
    navigate(next);
  };

  const screens = (Object.keys(SCREEN_PATH) as MediaScreen[]).map((screen) => (
    <Button
      key={screen}
      variant={current === screen ? 'secondary' : 'outline-secondary'}
      active={current === screen}
      onClick={() => go(screen)}
    >
      {SCREEN_LABEL[screen]}
    </Button>
  ));

  if (asHeader) {
    return (
      <h1 className={styles['headerTitle']}>
        <ButtonGroup className={styles['headerGroup']} aria-label="Switch media screen">
          {screens}
        </ButtonGroup>
      </h1>
    );
  }

  return (
    <ButtonGroup size="sm" aria-label="Switch media screen">
      {screens}
    </ButtonGroup>
  );
};

export default MediaScreenSwitcher;
