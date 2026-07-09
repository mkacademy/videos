import { useEffect, useState } from "react";
import { layoutCellPointerHandlers } from '../../../library/Shortcuts_b';
import LinkifiedText from '../../LinkifiedText';
import * as styles from '../../../styles/course.module.css';
import { Banner } from '../../../store/slices/courseSlice';
import { useSelector } from "react-redux";
import { RootState } from "../../../store/types";

const pennantStyles = {
  row: styles["row"],
  banner: styles["banner"],
  section: styles["section"],
  dismissBtn: styles["dismissBtn"],
  siteName: styles['site-name'],
  flexCenter: styles['flex-center'],
  bgColorGray: styles['bg-color-gray'],
  textColorGray: styles['text-color-gray'],
  quoteContainer: styles['quote-container'],
  textColorWhite: styles['text-color-white'],
  bgColorPrimary: styles['bg-color-primary'],
  displayedTotals: styles['displayedTotals'],
  sectionMinH: styles['section-min-h'],
  controlsRow: styles['controls_row'],
  arrowRight: styles['arrow-right'],
  arrowLeft: styles['arrow-left'],
  colSm12: styles['col-sm-12'],
  colMd12: styles['col-md-12'],
  colLg6: styles['col-lg-6'],
  colXl6: styles['col-xl-6'],
  arrows: styles["arrows"],
}

const quoteCss = `quote`;
const contCss = `flex-center p-3 p-md-5 ${pennantStyles.flexCenter}`;
const origQuoteCss = `quote text-color-gray ${pennantStyles.textColorGray}`;
const isHighlight = `bg-color-gray text-color-white ${pennantStyles.bgColorGray} ${pennantStyles.textColorWhite}`;

export interface PennantProps {
  isShow?: boolean;
  leftQuote?: boolean;
  pennants: Banner[];
  positionY: React.RefObject<number>;
  totals: { total: number; id: number }[];
  selector: (payload: { ids: number[] }) => void;
  chooser: (payload: { ids: number[] }) => void;
  discarder?: (payload: { id: number; isShow?: boolean }) => void;
  dismisser: (payload: { id: number; isShow?: boolean }) => void;
  toggler: (payload: { selectedId?: number, canToggle?: boolean }) => void;
}

export default function Pennant({
  isShow,
  totals,
  toggler,
  pennants,
  selector,
  chooser,
  dismisser,
  discarder,
  leftQuote,
  positionY,
}: PennantProps) {
  const [index, setIndex] = useState(0);
  const curSelectedPennant = pennants[index];
  useEffect(() => {
    if (!curSelectedPennant) setIndex(0);
  }, [curSelectedPennant]);
  return (
    <section className={`row section pennant pb-lg-3 ${pennantStyles.row} ${pennantStyles.section} ${pennantStyles.banner} pb-lg-3`}>
      {leftQuote && (
        <Texts
          pennant={curSelectedPennant}
          isCourseBanner={index === 0}
          selector={selector}
          chooser={chooser}
        />
      )}
      <Pennants
        dismisser={index !== 0 && discarder ? discarder : dismisser}
        isClickable={leftQuote !== undefined}
        pennant={curSelectedPennant}
        length={pennants.length}
        positionY={positionY}
        setIndex={setIndex}
        toggler={toggler}
        totals={totals}
        isShow={isShow}
        index={index}
      />
      {!leftQuote && (
        <Texts
          pennant={curSelectedPennant}
          isCourseBanner={index === 0}
          selector={selector}
          chooser={chooser}
        />
      )}
    </section>
  );
}

interface PennantsProps {
  index: number;
  length: number;
  isShow?: boolean;
  totals: { total: number; id: number }[];
  setIndex: (fn: (prev: number) => number) => void;
  dismisser: (payload: { id: number; isShow?: boolean }) => void;
  toggler: (payload: { selectedId?: number, canToggle?: boolean }) => void;
  positionY: React.RefObject<number>;
  pennant?: Partial<Banner>;
  isClickable: boolean;
}

const Pennants = ({
  index,
  length,
  isShow,
  totals,
  toggler,
  setIndex,
  dismisser,
  positionY,
  isClickable,
  pennant = {
    id: -1,
    title: "",
    ordinal: 0,
  },
}: PennantsProps) => {
  const onExit = () => {
    if (positionY?.current > -1)
      setTimeout(() => window.scrollTo(0, positionY.current), 500);
    toggler({ selectedId: pennant.id ?? -1 });
  };
  const isMaximumFeatures = useSelector((state: RootState) => 
    !state.settings.isUnzipCourses && !state.settings.isUnzipQuizzes && !state.settings.isUnzipTutorials);
  const total = totals.find(({ id: ID }) => pennant.id === ID) ?? { total: 0 };
  const banner = `${pennant.title?.toUpperCase() ?? ""} (${total.total})`;
  const dismissHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isClickable) onExit();
    else dismisser({ id: pennant.id ?? -1, isShow });
  };
  const selectHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isClickable) toggler({ selectedId: pennant.id ?? -1 });
  };
  const totalsdisplay = `(${index + 1}-${length})`;
  const last = length - 1;
  return (
    <div className={`p-0 ${pennantStyles.colSm12} ${pennantStyles.colMd12} ${pennantStyles.colLg6} ${pennantStyles.colXl6} ${pennantStyles.controlsRow}`}>
      {(isMaximumFeatures || !isClickable) && <span className={pennantStyles.dismissBtn} onClick={dismissHandler}>
        x
      </span>}
      <span
        className={pennantStyles.displayedTotals}
        {...layoutCellPointerHandlers(selectHandler)}
      >
        {totalsdisplay}
      </span>
      <div className={`flex-center p-5 bg-color-primary section-min-h ${pennantStyles.flexCenter} ${pennantStyles.bgColorPrimary} ${pennantStyles.sectionMinH}`}>
        <h1 className={`text-color-white site-name ${pennantStyles.siteName} ${pennantStyles.textColorWhite}`}>{banner}</h1>
      </div>
      <div className={pennantStyles.arrows}>
        <div
          className={`arrow-left ${pennantStyles.arrowLeft}`}
          onClick={() => setIndex((prev) => (prev > 0 ? prev - 1 : last))}
        ></div>
        <div
          className={`arrow-right ${pennantStyles.arrowRight}`}
          onClick={() => setIndex((prev) => (prev < last ? prev + 1 : 0))}
        ></div>
      </div>
    </div>
  );
};

interface TextsProps {
  pennant?: Partial<Banner>;
  isCourseBanner: boolean;
  selector: (payload: { ids: number[] }) => void;
  chooser: (payload: { ids: number[] }) => void;
}

const Texts = ({
  chooser,
  isCourseBanner,
  pennant = {
    id: -1,
    quote: "",
    ordinal: 0,
    bannerId: -1,
    isHighlighted: false,
  },
  selector,
}: TextsProps) => {
  const selectHandler = (e: React.MouseEvent) => {
    if (isCourseBanner) setTimeout(() => selector({ ids: [pennant.id ?? -1] }));
    else setTimeout(() => chooser({ ids: [pennant.id ?? -1] }));
    e.stopPropagation();
    e.preventDefault();
  };
  return (
    <div
      {...layoutCellPointerHandlers(selectHandler)}
      className={`${pennantStyles.colSm12} ${pennantStyles.colMd12} ${pennantStyles.colLg6} ${pennantStyles.colXl6}`}
    >
      <div className={pennant.isHighlighted ? (isHighlight + ' ' + contCss) : contCss}>
        <q className={pennant.isHighlighted ? quoteCss : origQuoteCss}>
          &nbsp;
          <span className={`quote-container ${pennantStyles.quoteContainer}`}>
            <LinkifiedText text={pennant.quote ?? ""} maxLength={500} />
          </span>
          &nbsp;
        </q>
      </div>
    </div>
  );
}; 