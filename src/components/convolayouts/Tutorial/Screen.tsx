import Slide from './Slide';
import Banner from './Banner';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Content,
  toggleTutorial,
  dismissTutorial,
  Banner as BannerType,
  highlightContentBreathSelection,
} from '../../../store/slices/tutorialSlice';
import { RootState } from '../../../store/types';
import { _500 as NotFound } from '../../views/404';
import * as styles from '../../../styles/404.module.css';
import { TutorialRootTreeSelection } from '../../../library/actions';
import { useApplyRouterSelections, useClearFsqOnEscapeWhenUnselected, useExitExpandedOnEscape } from '../../../Hooks/useShortcuts';
interface ScreenProps {
  noTutorials: boolean;
  onRouterSelection?: () => void;
}

export interface LengthItem {
  total: number;
  id: number;
}

const Screen: React.FC<ScreenProps> = ({ noTutorials, onRouterSelection }) => {
  const positionY = useRef(-1);
  const dispatch = useDispatch();
  const { pathname, state: routerState } = useLocation();
  useApplyRouterSelections(!noTutorials, routerState);
  const banners = useSelector((state: RootState) => state.tutorial.banners);
  const content = useSelector((state: RootState) => state.tutorial.content);
  const selected = useSelector((state: RootState) => state.tutorial.selected);
  const dismissals = useSelector((state: RootState) => state.session.dismissals);


  useEffect(() => {
    const handleScroll = () => {
      if (selected === -1) {
        const change = Math.abs(window.scrollY - positionY.current);
        if (change < 1000) positionY.current = window.scrollY;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selected]);

  const isExpanded = !noTutorials && selected > -1 && !!banners[selected];
  useExitExpandedOnEscape(isExpanded, () => {
    if (selected === -1) return;
    const b = banners[selected];
    if (!b) return;
    if (positionY.current > -1) {
      setTimeout(() => window.scrollTo(0, positionY.current), 500);
    }
    dispatch(toggleTutorial({ selectedId: b.id }));
  });
  useClearFsqOnEscapeWhenUnselected(selected === -1);

  if (noTutorials) return null;

  const banner = banners[selected];
  const dismissed = dismissals[pathname] ?? false;
  const defaultItem: Partial<Content> = { bannerId: 0 };
  const predicate = ({ isDismissed }: { isDismissed?: boolean }) => isDismissed === dismissed;
  const predicate0 = ([{ bannerId } = defaultItem]: Partial<Content>[]) => bannerId === banner?.id;
  const lengths: LengthItem[] = content.map(([{ bannerId } = defaultItem]: Partial<Content>[], i: number) => ({
    total: content[i].length ?? 0,
    id: bannerId || 0
  }));
  const slides = content.find(predicate0);
  const visible = slides?.filter(predicate) ?? [];

  return (
    <>
      {banner ? (
        <>
          <Banner
            id={banner.id}
            isShow={dismissed}
            leftQuote={undefined}
            positionY={positionY}
            title={banner.title || ''}
            quote={banner.quote || ''}
            isHighlighted={banner.isHighlighted}
            total={lengths.find(({ id }: LengthItem) => id === banner.id)?.total}
            selector={(payload: { ids: number[] }) => {
              onRouterSelection?.();
              dispatch(TutorialRootTreeSelection(payload));
            }}
            dismisser={(payload: { id: number; isShow?: boolean }) => dispatch(dismissTutorial({ ids: [payload.id], isShow: payload.isShow }))}
            toggler={(payload: { selectedId?: number, canToggle?: boolean }) => dispatch(toggleTutorial(payload))}
          />
          {visible.length > 0 ? (
            visible.map((slide: Content, i: number) => (
              <Slide
                key={slide.id}
                slide={{
                  id: slide.id,
                  content: slide.content || '',
                  imageurl: slide.imageurl || '',
                  isHighlighted: slide.isHighlighted || false
                }}
                isShow={dismissed}
                leftIMG={i % 2 !== 0}
                dismisser={(payload: { id: number }) => dispatch(dismissTutorial({ ids: [payload.id] }))}
                selector={(payload: { ids: number[] }) => {
                  onRouterSelection?.();
                  dispatch(highlightContentBreathSelection(payload));
                }}
              />
            ))
          ) : (
            <div className={`${styles["notFound"]} ${styles["bigger"]}`}>
              <NotFound message="oops! nothing in here" />
            </div>
          )}
        </>
      ) : (
        banners.filter(predicate).map((banner: BannerType, i: number) => (
          <Banner
            id={banner.id}
            key={banner.id}
            isShow={dismissed}
            positionY={positionY}
            leftQuote={i % 2 !== 0}
            title={banner.title || ''}
            quote={banner.quote || ''}
            isHighlighted={banner.isHighlighted}
            total={lengths.find(({ id }: LengthItem) => id === banner.id)?.total}
            selector={(payload: { ids: number[] }) => {
              onRouterSelection?.();
              dispatch(TutorialRootTreeSelection(payload));
            }}
            dismisser={(payload: { id: number; isShow?: boolean }) => dispatch(dismissTutorial({ ids: [payload.id], isShow: payload.isShow }))}
            toggler={(payload: { selectedId?: number, canToggle?: boolean }) => dispatch(toggleTutorial(payload))}
          />
        ))
      )}
    </>
  );
};

export default Screen;
