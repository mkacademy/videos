import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from '../../../store/types';
import {
  toggleCourse,
  dismissCourse,
  dismissSlide,
  SlideItem,
  Banner,
  SlideGroup,
  SlideGroupItem,
  highlightSlideBreathSelection,
  highlightCoversBreathSelection,
  dimissMainslide,
  dismissChapter,
} from '../../../store/slices/courseSlice';
import Pennant from './Pennant';
import SlideShow from './SlideShow';
import * as styles from '../../../styles/404.module.css';
import useMediaQuery from '../../../Hooks/useQueryMedia';
import { _500 as Notfound } from '../../../components/views/404';
import { CourseRootTreeSelection, CoursePennantTreeSelection } from '../../../library/actions';
import { useClearFsqOnEscapeWhenUnselected, useExitExpandedOnEscape } from '../../../Hooks/useShortcuts';

interface CourseProps {
  noCourses: boolean;
}

const dismissedPred = (dismised: boolean) => (item: { isDismissed?: boolean }) => item.isDismissed === dismised;
const pennantsPred = (dismised: boolean) => (item: Banner) =>
  item.isDismissed === dismised || item.pennants?.some(({ isDismissed }) => isDismissed === dismised);
const slidesPred = (
  slides: SlideItem[][],
  dismised: boolean,
  courseCouplings: Record<number, number[]>,
) => (item: SlideGroupItem) =>
  item.isDismissed === dismised || getSlideItems(courseCouplings, item.id, slides).some(dismissedPred(dismised));
export const contentPred = (pennant: Banner) => (group: SlideGroup) => group[0]?.bannerId === pennant?.id;
const getSlideItems = (courseCouplings: Record<number, number[]>, id: number, slides: SlideItem[][]) => {
  const slideIndexes = courseCouplings[id] ?? [];
  return slideIndexes.map((index) => slides[index] ?? []).flat();
};

const totalPred = (group: SlideGroup) => {
  const { slides, ...thumbs } = group;
  return [
    {
      total: Object.keys(thumbs).length,
      id: thumbs[0]?.bannerId,
    },
    ...slides.map((slide: SlideItem[]) => ({
      total: slide.length,
      id: slide[0]?.bannerId,
    })),
  ];
};

const Course: React.FC<CourseProps> = ({ noCourses }) => {
  const positionY = useRef(-1);
  const dispatch = useDispatch();
  const { screen } = useMediaQuery();
  const { pathname } = useLocation();

  const banners = useSelector((state: RootState) => state.course.banners);
  const content = useSelector((state: RootState) => state.course.content);
  const selected = useSelector((state: RootState) => state.course.selected);
  const couplings = useSelector((state: RootState) => state.course.couplings);
  const dismissals = useSelector((state: RootState) => state.session.dismissals);

  const pennant = banners[selected];
  const dismised = dismissals[pathname] ?? false;
  const match = content.find(contentPred(pennant));
  const { slides = [], ...thumbs } = match ?? {};
  const slideshows = Object.values(thumbs ?? {});
  const courseCouplings = pennant ? (couplings[pennant.id] ?? {}) : {};
  const visibles = slideshows.filter(slidesPred(slides, dismised, courseCouplings));

  const lengths =  content.map(totalPred).flat();

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

  const isExpanded = !noCourses && selected > -1 && !!banners[selected];
  useExitExpandedOnEscape(isExpanded, () => {
    if (selected === -1) return;
    const p = banners[selected];
    if (!p) return;
    if (positionY.current > -1) {
      setTimeout(() => window.scrollTo(0, positionY.current), 500);
    }
    dispatch(toggleCourse({ selectedId: p.id }));
  });
  useClearFsqOnEscapeWhenUnselected(selected === -1);

  if (noCourses) return null;
  return (
    <React.Fragment>
      {pennant ? (
        <React.Fragment>
          <Pennant
            key={pennant.id}
            totals={lengths}
            positionY={positionY}
            selector={(payload) => dispatch(CourseRootTreeSelection(payload))}
            chooser={(payload) => dispatch(CoursePennantTreeSelection(payload))}
            discarder={(payload: { id: number; isShow?: boolean }) => dispatch(dismissChapter({ ids: [payload.id] }))}
            dismisser={(payload: { id: number; isShow?: boolean }) => dispatch(dismissCourse({ ids: [payload.id], isShow: payload.isShow }))}
            toggler={(payload) => dispatch(toggleCourse(payload))}
            pennants={[pennant, ...pennant.pennants?.map(p => ({
              ...p,
              pennants: [],
              sifterId: p.filterId,
            }))].filter(dismissedPred(dismised))}
          />
          {visibles.length > 0 ? (
            visibles.map((thumb, k) => {
              const i = courseCouplings[thumb.id]?.[0] ?? -1;
              const slideItems = getSlideItems(courseCouplings, thumb.id, slides);
              const slideshow = [{ ...thumb }, ...slideItems];
              const visibles = slideshow.filter(dismissedPred(dismised));
              return (
                <SlideShow
                  slideIndex={i}
                  key={thumb.id}
                  slides={visibles}
                  isShow={dismised}
                  leftIMG={screen > 2 ? k % 2 !== 0 : false}
                  discarder={(payload: { id: number; slideIndex: number }) => dispatch(dismissSlide({ items: [payload] }))}
                  dismisser={(payload: { id: number; isShow?: boolean }) => dispatch(dimissMainslide({ ids: [payload.id], isShow: payload.isShow }))}
                  chooser={(payload) => dispatch(highlightSlideBreathSelection(payload))}
                  selector={(payload) => dispatch(highlightCoversBreathSelection(payload))}
                />
              );
            })
          ) : (
            <div className={`${styles["notFound"]} ${styles["bigger"]}`}>
              <Notfound message="oops! nothing in here" />
            </div>
          )}
        </React.Fragment>
      ) : (
        banners.filter(pennantsPred(dismised)).map((pennant, i) => (
          <Pennant
            key={pennant.id}
            totals={lengths}
            isShow={dismised}
            positionY={positionY}
            selector={(payload) => dispatch(CourseRootTreeSelection(payload))}
            chooser={(payload) => dispatch(CoursePennantTreeSelection(payload))}
            dismisser={(payload: { id: number; isShow?: boolean }) => dispatch(dismissCourse({ ids: [payload.id], isShow: payload.isShow }))}
            toggler={(payload) => dispatch(toggleCourse(payload))}
            leftQuote={screen > 2 ? i % 2 !== 0 : false}
            pennants={[pennant, ...pennant.pennants?.map(p => ({
              ...p,
              pennants: [],
              sifterId: p.filterId,
            }))].filter(dismissedPred(dismised))}
          />
        ))
      )}
    </React.Fragment>
  );
};

export default Course; 