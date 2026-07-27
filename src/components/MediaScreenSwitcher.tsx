import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

type MediaScreen = 'player' | 'thumbs';

const SCREEN_PATH: Record<MediaScreen, string> = {
  player: '/media-player',
  thumbs: '/media-thumbs',
};

function resolveScreen(pathname: string): MediaScreen | null {
  if (pathname.includes('media-player')) return 'player';
  if (pathname.includes('media-thumbs')) return 'thumbs';
  return null;
}

/** Toggle between Media Player and Thumbs while preserving `?tab=`. */
const MediaScreenSwitcher: React.FC = () => {
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

  return (
    <ButtonGroup size="sm" aria-label="Switch media screen">
      <Button
        variant={current === 'player' ? 'secondary' : 'outline-secondary'}
        active={current === 'player'}
        onClick={() => go('player')}
      >
        Player
      </Button>
      <Button
        variant={current === 'thumbs' ? 'secondary' : 'outline-secondary'}
        active={current === 'thumbs'}
        onClick={() => go('thumbs')}
      >
        Thumbs
      </Button>
    </ButtonGroup>
  );
};

export default MediaScreenSwitcher;
