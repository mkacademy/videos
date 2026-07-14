import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

type MediaScreen = 'prepper' | 'player';

function resolveScreen(pathname: string): MediaScreen | null {
  if (pathname.includes('media-prepper')) return 'prepper';
  if (pathname.includes('media-player')) return 'player';
  return null;
}

/** Toggle between Media Prepper and Media Player while preserving `?tab=`. */
const MediaScreenSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const current = resolveScreen(pathname);
  const tab = searchParams.get('tab');

  if (!current) return null;

  const go = (screen: MediaScreen) => {
    if (screen === current) return;
    const path = screen === 'prepper' ? '/media-prepper' : '/media-player';
    const next = tab ? `${path}?tab=${encodeURIComponent(tab)}` : path;
    navigate(next);
  };

  return (
    <ButtonGroup size="sm" aria-label="Switch media screen">
      <Button
        variant={current === 'prepper' ? 'secondary' : 'outline-secondary'}
        active={current === 'prepper'}
        onClick={() => go('prepper')}
      >
        Prepper
      </Button>
      <Button
        variant={current === 'player' ? 'secondary' : 'outline-secondary'}
        active={current === 'player'}
        onClick={() => go('player')}
      >
        Player
      </Button>
    </ButtonGroup>
  );
};

export default MediaScreenSwitcher;
