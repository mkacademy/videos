import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  highlightSlideBreathSelection,
  resetChapters,
  resolveSlidesForChapterInSelectedCourse,
  setChaptersViaPennantId,
  SlideItem,
} from '../../../store/slices/courseSlice';
import { prependError, prependWarning } from '../../../store/slices/errorSlice';
import { useChapterEscape } from '../../../Hooks/useShortcuts';
import * as styles from '../../../styles/404.module.css';
import { _500 as Notfound } from '../../../components/views/404';
import { SlideType } from '../Tutorial/Content';
import Slide from '../Tutorial/Slide';
import ChapterBanner from './Banner';
import { CoursePennantTreeSelection } from '../../../library/actions';
import { RootState } from '../../../store/types';
import { countSlideItemsByBannerId } from '../../../library/CourseUtils';

export interface ChapterSlideRow {
  item: SlideItem;
  slideIndex: number;
}

interface ChaptersProps {
  dismissed: boolean;
  chapters: number[];
  slides: SlideItem[][];
  onRouterSelection?: () => void;
}
const NO_SLIDES = 'This chapter has no steps';
const NO_COUPLING = 'This chapter has steps, but no coupling';
const NO_CONTEXT = 'This chapter is not in the selected course';
const NO_COVER = 'This Chapter has slides, but no covers matches its ordinal, so chapters cannot be linked.';
const Chapters: React.FC<ChaptersProps> = ({
  slides,
  dismissed,
  chapters: chapterIndexes,
  onRouterSelection,
}) => {
  const dispatch = useDispatch();
  const course = useSelector((state: RootState) => state.course);
  const { banners, selected } = course;
  const [showSelected, setShowSelected] = useState(false);
  const toggleShowSelected = () => setShowSelected((v) => !v);
  const closeSelectedChapter = () => setShowSelected(false);
  useChapterEscape(
    showSelected,
    closeSelectedChapter,
    () => {
      dispatch(prependError('Chapter mode disabled'));
      dispatch(resetChapters());
    },
  );
  const predicate = ({ isDismissed }: { isDismissed?: boolean }) => isDismissed === dismissed;
  const slideCountsByPennantBannerId = useMemo(
    () =>
      countSlideItemsByBannerId(slides, (item) => item.isDismissed === dismissed),
    [slides, dismissed]
  );
  const chapterSlideRows: ChapterSlideRow[] = chapterIndexes.length > 0
    ? (() => {
      const seenSlideIds = new Set<number>();
      return [...new Set(chapterIndexes)].flatMap((slideIndex) =>
        (slides[slideIndex] ?? []).map((item) => ({
          item,
          slideIndex,
        }))
      ).filter((row) => {
        if (!predicate(row.item)) return false;
        if (seenSlideIds.has(row.item.id)) return false;
        seenSlideIds.add(row.item.id);
        return true;
      });
    })()
    : [];
  const firstSlide = chapterSlideRows[0]?.item;
  const selectedBanner = selected > -1 ? banners[selected] : undefined;
  const selectedPennant = selectedBanner?.pennants?.find((pennant) => pennant.id === firstSlide?.bannerId);
  const pennantTotal = selectedPennant
    ? slideCountsByPennantBannerId.get(selectedPennant.id) ?? 0
    : undefined;
  const allPennants = selectedBanner?.pennants.filter((pennant) => pennant.isDismissed === dismissed) ?? [];

  const pennantChapterWrapperClick = useCallback(
    (pennantId: number): React.MouseEventHandler<HTMLDivElement> =>
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
        const res = resolveSlidesForChapterInSelectedCourse(course, pennantId);
        if (res === 'ok') dispatch(setChaptersViaPennantId(pennantId));
        else if (res === 'no-slides') dispatch(prependWarning(NO_SLIDES));
        else if (res === 'no-coupling') dispatch(prependWarning(NO_COUPLING));
        else if (res === 'no-ordinal-match') dispatch(prependWarning(NO_COVER));
        else if (res === 'no-context') dispatch(prependWarning(NO_CONTEXT));
      },
    [course, dispatch]
  );
  const pennantSelector = (payload: { ids: number[] }) => {
    onRouterSelection?.();
    dispatch(CoursePennantTreeSelection(payload));
  };

  const slideSelector = (slideIndex: number) => (payload: { ids: number[] }) => {
    onRouterSelection?.();
    dispatch(highlightSlideBreathSelection({ ...payload, slideIndex }));
  };


  if (allPennants.length === 0) {
    return (
      <div className={`${styles["notFound"]} ${styles["bigger"]}`}>
        <Notfound message="oops! nothing in here" />
      </div>
    );
  }

  return (
    <>
      {showSelected ? (
        <>
          {selectedPennant && (
            <ChapterBanner
              titleColumnSelected
              total={pennantTotal}
              leftQuote={undefined}
              id={selectedPennant.id}
              selector={pennantSelector}
              title={selectedPennant.title || ''}
              quote={selectedPennant.quote || ''}
              onWrapperClick={toggleShowSelected}
              isHighlighted={selectedPennant.isHighlighted}
            />
          )}
          {chapterSlideRows.length === 0 ? (
            <div className={`${styles["notFound"]} ${styles["bigger"]}`}>
              <Notfound message="oops! nothing in here" />
            </div>
          ) : (
            chapterSlideRows.map((row, i: number) => {
              const slide: SlideType = {
                id: row.item.id,
                content: row.item.content || '',
                imageurl: row.item.imageurl || '',
                isHighlighted: row.item.isHighlighted || false,
              };
              return (
                <Slide
                  isShow={true}
                  slide={slide}
                  key={`${row.slideIndex}-${row.item.id}`}
                  leftIMG={i % 2 !== 0}
                  dismisser={() => null}
                  selector={slideSelector(row.slideIndex)}
                />
              );
            })
          )}
        </>
      ) : (
        allPennants.map((pennant, i: number) => {
          const selectedOrdinal = selectedPennant?.ordinal;
          const isRedPennant =
            selectedOrdinal !== undefined && pennant.ordinal === selectedOrdinal;
          return (
            <ChapterBanner
              key={pennant.id}
              id={pennant.id}
              leftQuote={i % 2 !== 0}
              title={pennant.title || ''}
              quote={pennant.quote || ''}
              isHighlighted={pennant.isHighlighted}
              onWrapperClick={isRedPennant ? toggleShowSelected : pennantChapterWrapperClick(pennant.id)}
              total={slideCountsByPennantBannerId.get(pennant.id) ?? 0}
              titleColumnSelected={isRedPennant}
              selector={pennantSelector}
            />
          );
        })
      )}
    </>
  );
};

export default Chapters;
