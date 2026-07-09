import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/types';
import { useLocation } from 'react-router-dom';
import { resolveChaptersForSlideInSelectedCourse, setChaptersViaSlideId } from '../../../store/slices/courseSlice';
import { prependWarning } from '../../../store/slices/errorSlice';
import Content, { getSectionClass, SlideType } from '../Tutorial/Content';
import Snapshot from '../Tutorial/Snapshot';

interface CoverProps {
  leftIMG: boolean;
  slide: SlideType;
  selector: (payload: { ids: number[] }) => void;
}

const Cover: React.FC<CoverProps> = ({ leftIMG, selector, slide }) => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const course = useSelector((state: RootState) => state.course);

  const chapterHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
    if (!pathname.includes('/convolution/course')) return;
    if (course.chapters.length > 0) return;
    const res = resolveChaptersForSlideInSelectedCourse(course, slide.id);
    if (res === 'no-coupling') {
      const warning = 'This cover has no chapter(s) assigned to it';
      dispatch(prependWarning(warning));
      return;
    }
    if (res === 'ok') {
      dispatch(setChaptersViaSlideId(slide.id));
      dispatch(prependWarning('Chapter mode enabled'));
    }
  };

  const imgcss = getSectionClass(leftIMG);
  return (
    <section className={imgcss}>
      {leftIMG && <Snapshot slide={slide} onSnapshotClick={chapterHandler} />}
      <Content selector={selector} slide={slide} />
      {!leftIMG && <Snapshot slide={slide} onSnapshotClick={chapterHandler} />}
    </section>
  );
};

export default Cover; 