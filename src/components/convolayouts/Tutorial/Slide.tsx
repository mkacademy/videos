import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/types';
import Content, { getSectionClass, SlideType } from './Content';
import Snapshot from './Snapshot';

interface SlideProps {
  isShow: boolean;
  leftIMG: boolean;
  slide: SlideType;
  selector: (payload: { ids: number[] }) => void;
  dismisser: (payload: { id: number; isShow: boolean }) => void;
}

const Slide: React.FC<SlideProps> = ({ isShow, leftIMG, selector, dismisser, slide }) => {
  const isMaximumFeatures = useSelector((state: RootState) =>
    !state.settings.isUnzipCourses && !state.settings.isUnzipQuizzes && !state.settings.isUnzipTutorials);

  const dismissHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
    setTimeout(() => dismisser({ id: slide.id, isShow }));
  };

  const imgcss = getSectionClass(leftIMG);
  return (
    <section className={imgcss}>
      {leftIMG && (
        <Snapshot slide={slide} showDismiss={isMaximumFeatures} onDismiss={dismissHandler} />
      )}
      <Content selector={selector} slide={slide} />
      {!leftIMG && (
        <Snapshot slide={slide} showDismiss={isMaximumFeatures} onDismiss={dismissHandler} />
      )}
    </section>
  );
};

export default Slide; 