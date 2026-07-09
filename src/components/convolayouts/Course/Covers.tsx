import React, { RefObject } from 'react';
import { useDispatch } from 'react-redux';
import { Banner as CourseBannerType, highlightCoversBreathSelection, SlideGroupItem, toggleCourse } from '../../../store/slices/courseSlice';
import Cover from './Cover';
import * as styles from '../../../styles/404.module.css';
import { _500 as Notfound } from '../../../components/views/404';
import { getSectionClass, SlideType } from '../Tutorial/Content';
import CoversBanner from '../Tutorial/Banner';
import { CourseRootTreeSelection } from '../../../library/actions';
import { prependError } from '../../../store/slices/errorSlice';

interface CoversProps {
  banner?: CourseBannerType;
  total?: number;
  positionY?: RefObject<number>;
  covers: SlideGroupItem[];
  dismissed: boolean;
  onRouterSelection?: () => void;
}

const Covers: React.FC<CoversProps> = ({ banner, total, positionY, covers, dismissed, onRouterSelection }) => {
  const dispatch = useDispatch();
  const visibleCovers = covers.filter(({ isDismissed }) => isDismissed === dismissed);

  return (
    <>
      {banner && (
        <CoversBanner
          id={banner.id}
          key={banner.id}
          isShow={dismissed}
          positionY={positionY}
          title={banner.title || ''}
          quote={banner.quote || ''}
          isHighlighted={banner.isHighlighted}
          total={total}
          selector={(payload: { ids: number[] }) => {
            onRouterSelection?.();
            dispatch(CourseRootTreeSelection(payload));
          }}
          dismisser={() => dispatch(prependError('Chapter mode is enabled, dismiss not allowed'))}
          toggler={(payload: { selectedId?: number, canToggle?: boolean }) => dispatch(toggleCourse(payload))}
        />
      )}
      {visibleCovers.length === 0 ? (
        <section className={getSectionClass(false)}>
          <div className="col-12 d-flex justify-content-center">
            <div className={`${styles["notFound"]} ${styles["bigger"]} d-inline-block`}>
              <Notfound message="oops! nothing in here" />
            </div>
          </div>
        </section>
      ) : (
        visibleCovers.map((cover, i: number) => {
          const slide: SlideType = {
            id: cover.id,
            content: cover.content || '',
            imageurl: cover.imageurl || '',
            isHighlighted: cover.isHighlighted || false,
          };
          return <Cover
            slide={slide}
            key={cover.id}
            leftIMG={i % 2 !== 0}
            selector={(payload: { ids: number[] }) => {
              onRouterSelection?.();
              dispatch(highlightCoversBreathSelection(payload));
            }}
          />
        })
      )}
    </>
  );
};

export default Covers;
