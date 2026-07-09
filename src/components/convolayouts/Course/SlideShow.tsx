import React, { useEffect, useState } from 'react';
import { SlideGroupItem } from '../../../store/slices/courseSlice';
import LinkifiedText from '../../LinkifiedText';
import { placeholder, textEllipsis } from '../../../utils';
import * as styles from '../../../styles/course.module.css';
import { isImageDataUrlOrPlaceholder, isValidDataUrl } from '../../views/Instruction';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/types';

const slideStyles = {
  row: styles["row"],
  section: styles["section"],
  leftImage: styles["leftImage"],
  flexCol: styles['flex-col'],
  rightImage: styles["rightImage"],
  dismissBtn: styles["dismissBtn"],
  arrowLeft: styles['arrow-left'],
  arrowRight: styles['arrow-right'],
  flexCenter: styles['flex-center'],
  imgHighlited: styles['imgHighlited'],
  controlsRow: styles['controls_row'],
  textContainer: styles['text-container'],
  textColorWhite: styles['text-color-white'],
  displayedTotals: styles['displayedTotals'],
  textColorGray: styles['text-color-gray'],
  backgroundImg: styles['background_img'],
  bgColorGray: styles['bg-color-gray'],
  textCenter: styles['text-center'],
  colSm12: styles['col-sm-12'],
  colMd12: styles['col-md-12'],
  colLg6: styles['col-lg-6'],
  colXl6: styles['col-xl-6'],
  arrows: styles['arrows'],
}



const isHigh = `bg-color-gray text-color-white ${slideStyles.bgColorGray} ${slideStyles.textColorWhite}`;
const snapCss = ` ${slideStyles.colSm12} ${slideStyles.colMd12} ${slideStyles.colLg6} ${slideStyles.colXl6} p-0 ${slideStyles.controlsRow}`;
const cCss = `flex-center pl-3 pr-3 pt-3 pl-md-5 pr-md-5 pt-lg-0 ${slideStyles.flexCenter}`;

interface SlideShowProps {
  slides: SlideGroupItem[];
  slideIndex: number;
  isShow: boolean;
  leftIMG: boolean;
  chooser: (payload: { ids: number[]; slideIndex?: number; isHighlighted?: boolean }) => void;
  selector: (payload: { ids: number[]; isHighlighted?: boolean }) => void;
  discarder: (payload: { id: number; slideIndex: number }) => void;
  dismisser: (payload: { id: number; isShow?: boolean }) => void;
}



const SlideShow: React.FC<SlideShowProps> = ({
  slideIndex,
  dismisser,
  discarder,
  selector,
  chooser,
  leftIMG,
  slides,
  isShow,
}) => {
  const [index, setIndex] = useState(0);
  const curselectedSlide = slides[index];
  useEffect(() => {
    if (slides.length === 0 || !curselectedSlide) {
      setIndex(0);
    }
  }, [curselectedSlide, slides.length]);
  if (!curselectedSlide) return null;
  const leftcss = `row section leftImage ${slideStyles.row} ${slideStyles.section} ${slideStyles.leftImage}`;
  const rightcss = `row section rightImage ${slideStyles.row} ${slideStyles.section} ${slideStyles.rightImage}`;
  const imgcss = leftIMG ? leftcss : rightcss;
  return (
    <section className={imgcss}>
      {leftIMG && (
        <Snapshots
          slide={curselectedSlide}
          slideIndex={slideIndex}
          length={slides.length}
          dismisser={dismisser}
          discarder={discarder}
          setIndex={setIndex}
          isShow={isShow}
          index={index}
        />
      )}
      <Texts
        slide={curselectedSlide}
        slideIndex={slideIndex}
        selector={selector}
        chooser={chooser}
        setIndex={setIndex}
        length={slides.length}
      />
      {!leftIMG && (
        <Snapshots
          slide={curselectedSlide}
          slideIndex={slideIndex}
          length={slides.length}
          dismisser={dismisser}
          discarder={discarder}
          setIndex={setIndex}
          isShow={isShow}
          index={index}
        />
      )}
    </section>
  );
};

interface SnapshotsProps {
  slide: SlideGroupItem;
  slideIndex: number;
  dismisser: (payload: { id: number; isShow?: boolean }) => void;
  discarder: (payload: { id: number; slideIndex: number }) => void;
  setIndex: (fn: (prev: number) => number) => void;
  isShow: boolean;
  length: number;
  index: number;
}

const Snapshots: React.FC<SnapshotsProps> = ({
  slide,
  slideIndex,
  dismisser,
  discarder,
  setIndex,
  isShow,
  length,
  index,
}) => {
  const last = length - 1;
  const dismissHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const payload1 = { id: slide.id, slideIndex };
    const payload0 = { id: slide.id, isShow };
    setTimeout(() => dismisser(payload0));
    setTimeout(() => discarder(payload1));
  };
  const totals = `(${index + 1}-${length})`;
  const imagCss0 = `${slideStyles.colSm12} ${slideStyles.colMd12} ${slideStyles.colLg6}`;
  const imageCss1 = ` ${slideStyles.colXl6} p-0  text-center  ${slideStyles.textCenter} ${slideStyles.controlsRow} `;
  const isMaximumFeatures = useSelector((state: RootState) => 
    !state.settings.isUnzipCourses && !state.settings.isUnzipQuizzes && !state.settings.isUnzipTutorials);
  const showAsImage = isImageDataUrlOrPlaceholder(slide.imageurl);
  const imageUrl = isValidDataUrl(slide.imageurl) ? slide.imageurl : placeholder;
  return (
    <React.Fragment>
      {showAsImage ? (
        <div className={`${imagCss0} ${imageCss1}`}>
          {isMaximumFeatures && <span className={slideStyles.dismissBtn} onClick={dismissHandler}>
            x
          </span>}
          <span className={`displayedTotals ${slideStyles.displayedTotals}`}>{totals}</span>
          <div className={`background_img ${slideStyles.backgroundImg}`}>
            <img
              src={imageUrl}
              className="img-fluid"
              alt="placeholder"
              onError={(e) => {
                e.currentTarget.onerror = null;
                console.log("image_error");
                e.currentTarget.src = placeholder;
              }}
            />
          </div>
          <div className={`arrows ${slideStyles.arrows}`}>
            <div
              className={`arrow-left ${slideStyles.arrowLeft}`}
              onClick={() => setIndex((prev) => (prev > 0 ? prev - 1 : last))}
            ></div>
            <div
              className={`arrow-right ${slideStyles.arrowRight}`}
              onClick={() => setIndex((prev) => (prev < last ? prev + 1 : 0))}
            ></div>
          </div>
        </div>
      ) : (
        <div className={`${slideStyles.colSm12} ${slideStyles.colMd12} ${slideStyles.colLg6} ${slideStyles.colXl6} ${slideStyles.controlsRow}`}>
          {isMaximumFeatures && <span className={slideStyles.dismissBtn} onClick={dismissHandler}>
            x
          </span>}
          <span className={`displayedTotals ${slideStyles.displayedTotals}`}>{totals}</span>
          <div className={slide.isHighlighted ? (isHigh + ' ' + cCss) : cCss}>
            <div className={`flex-center flex-col ${slideStyles.flexCenter} ${slideStyles.flexCol}`}>
              <p>{textEllipsis(slide.imageurl)}</p>
            </div>
          </div>
          <div className={`arrows ${slideStyles.arrows}`}>
            <div
              className={`arrow-left ${slideStyles.arrowLeft}`}
              onClick={() => setIndex((prev) => (prev > 0 ? prev - 1 : last))}
            ></div>
            <div
              className={`arrow-right ${slideStyles.arrowRight}`}
              onClick={() => setIndex((prev) => (prev < last ? prev + 1 : 0))}
            ></div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

interface TextsProps {
  slide: SlideGroupItem;
  slideIndex: number;
  setIndex: (fn: (prev: number) => number) => void;
  selector: (payload: { ids: number[]; isHighlighted?: boolean }) => void;
  chooser: (payload: { ids: number[]; slideIndex?: number; isHighlighted?: boolean }) => void;
  length: number;
}

const Texts: React.FC<TextsProps> = ({
  slide,
  slideIndex,
  selector,
  setIndex,
  chooser,
  length,
}) => {
  const last = length - 1;
  const selelctHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = { ids: [slide.id], slideIndex };
    setTimeout(() => selector({ ids: [slide.id] }));
    setTimeout(() => chooser(payload));
  };

  const showAsImage = isImageDataUrlOrPlaceholder(slide.content);
  const imageUrl = isValidDataUrl(slide.content) ? slide.content : placeholder;
  return (
    <React.Fragment>
      {showAsImage ? (
        <div className={slide.isHighlighted ? `imgHighlited ${slideStyles.imgHighlited} ${snapCss}` : snapCss}>
          <span className={`displayedTotals ${slideStyles.displayedTotals}`} onClick={selelctHandler}>
            o
          </span>
          <div className={`background_img ${slideStyles.backgroundImg}`}>
            <img
              src={imageUrl}
              className="img-fluid"
              alt="placeholder"
              onError={(e) => {
                e.currentTarget.onerror = null;
                console.log("image_error");
                e.currentTarget.src = placeholder;
              }}
            />
          </div>
          <div className={`arrows ${slideStyles.arrows}`}>
            <div
              className={`arrow-left ${slideStyles.arrowLeft}`}
              onClick={() => setIndex((prev) => (prev > 0 ? prev - 1 : last))}
            ></div>
            <div
              className={`arrow-right ${slideStyles.arrowRight}`}
              onClick={() => setIndex((prev) => (prev < last ? prev + 1 : 0))}
            ></div>
          </div>
        </div>
      ) : (
        <div
          onClick={selelctHandler}
          className={`${slideStyles.colSm12} ${slideStyles.colMd12} ${slideStyles.colLg6} ${slideStyles.colXl6}`}
        >
          <div className={slide.isHighlighted ? (isHigh + ' ' + cCss) : cCss}>
            <div className={`flex-center flex-col ${slideStyles.flexCenter} ${slideStyles.flexCol}`}>
              <p className={`text-container ${slideStyles.textContainer}`}>
                <LinkifiedText text={slide.content} />
              </p>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default SlideShow; 