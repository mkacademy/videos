import React from "react";
import { RootState } from "../../store";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import * as styles from "../../styles/course.module.css";
import {
  useArticleNavOnCtrlShiftArrows,
  useChaptersOrFollowupsNavKeyboard,
  useToggleDismissedOnCtrlShiftArrows,
} from "../../Hooks/useShortcuts";
import { toggleDismissed } from "../../store/slices/sessionSlice";
import { setFollowupId, setSelected as setSelectedQuiz } from "../../store/slices/quizSlice";
import {
  getBannerChaptersCouplings,
  resetChapters,
  setChapters,
  setSelected as setSelectedCourse
} from "../../store/slices/courseSlice";
import { setSelected as setSelectedTutorial } from "../../store/slices/tutorialSlice";
const vs = {
  tcg: styles['text-color-gray'],
  mf: styles['minimum-features'],
};

const ViewSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const dismissals = useSelector((state: RootState) => state.session.dismissals);

  const dismissed = dismissals[pathname] ?? false;
  const viewType = dismissed ? "dismissed" : "undismissed";

  const viewHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    dispatch(toggleDismissed(pathname));
  };

  useToggleDismissedOnCtrlShiftArrows();

  return (
    <React.Fragment>
      <span>Viewing</span>
      <Link to="#" onClick={viewHandler} className={`${vs.tcg} ms-1`}>
        <span className="current-year">{viewType}</span>
      </Link>
    </React.Fragment>
  );
};

interface ArticleSelectorProps {
  noArticles: boolean;
  content: string;
}

const ArticleSelector: React.FC<ArticleSelectorProps> = ({ content, noArticles }) => {
  const dispatch = useDispatch();
  const tSelected = useSelector((state: RootState) => state.tutorial.selected);
  const cSelected = useSelector((state: RootState) => state.course.selected);
  const tBanners = useSelector((state: RootState) => state.tutorial.banners);
  const qSelected = useSelector((state: RootState) => state.quiz.selected);
  const cBanners = useSelector((state: RootState) => state.course.banners);
  const qBanners = useSelector((state: RootState) => state.quiz.quizzes);

  const isNextDisabled =
    content === "Tutorials"
      ? tSelected === tBanners.length - 1
      : content === "Courses"
        ? cSelected === cBanners.length - 1
        : qSelected === qBanners.length - 1;

  const isPrevDisabled =
    content === "Tutorials"
      ? tSelected <= 0
      : content === "Courses"
        ? cSelected <= 0
        : qSelected <= 0;

  const goNext = React.useCallback(() => {
    if (isNextDisabled) return;
    if (content === "Tutorials")
      dispatch(setSelectedTutorial(tSelected + 1));
    else if (content === "Courses")
      dispatch(setSelectedCourse(cSelected + 1));
    else if (content === "Quizzes")
      dispatch(setSelectedQuiz(qSelected + 1));
  }, [isNextDisabled, content, dispatch, tSelected, cSelected, qSelected]);

  const goPrev = React.useCallback(() => {
    if (isPrevDisabled) return;
    if (content === "Tutorials")
      dispatch(setSelectedTutorial(tSelected - 1));
    else if (content === "Courses")
      dispatch(setSelectedCourse(cSelected - 1));
    else if (content === "Quizzes")
      dispatch(setSelectedQuiz(qSelected - 1));
  }, [isPrevDisabled, content, dispatch, tSelected, cSelected, qSelected]);

  const nextHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    goNext();
  };

  const prevHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    goPrev();
  };

  useArticleNavOnCtrlShiftArrows(noArticles, goPrev, goNext);

  const viewHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    if (content === "Tutorials")
      dispatch(setSelectedTutorial(-1));
    else if (content === "Courses")
      dispatch(setSelectedCourse(-1));
    else if (content === "Quizzes")
      dispatch(setSelectedQuiz(-1));
  };

  if (noArticles) return null;

  return (
    <React.Fragment>
      <Link
        to="#"
        onClick={prevHandler}
        className={`${vs.tcg} ${isPrevDisabled ? '' : vs.mf} ms-1`}
      >
        <span className="current-year">Prev</span>
      </Link>
      <Link to="#" onClick={viewHandler} className={`${vs.tcg} ${vs.mf} ms-1`}>
        <span className="current-year">{content}</span>
      </Link>
      <Link
        to="#"
        onClick={nextHandler}
        className={`${vs.tcg} ${isNextDisabled ? '' : vs.mf} ms-1`}
      >
        <span className="current-year">Next</span>
      </Link>
    </React.Fragment>
  );
};

interface ChaptersSelectorProps {
  noArticles: boolean;
  chapters: number[];
}

const ChaptersSelector: React.FC<ChaptersSelectorProps> = ({ noArticles, chapters }) => {
  const dispatch = useDispatch();
  const selected = useSelector((state: RootState) => state.course.selected);
  const banners = useSelector((state: RootState) => state.course.banners);
  const content = useSelector((state: RootState) => state.course.content);
  const couplings = useSelector((state: RootState) => state.course.couplings);

  const selectedBanner = banners[selected];
  const chapterCouplings = selectedBanner
    ? getBannerChaptersCouplings({ content, couplings }, selectedBanner.id)
    : [];

  const currentChapterPosition = chapters.length > 0
    ? chapterCouplings.findIndex((coupling) =>
      coupling.some((value) => chapters.includes(value))
    )
    : -1;

  const isPrevDisabled = currentChapterPosition <= 0;
  const isNextDisabled = currentChapterPosition === -1 || currentChapterPosition >= chapterCouplings.length - 1;

  const goPrev = React.useCallback(() => {
    if (isPrevDisabled) return;
    const prevChapterPosition = currentChapterPosition - 1;
    if (prevChapterPosition < 0 || prevChapterPosition >= chapterCouplings.length) return;
    dispatch(setChapters(chapterCouplings[prevChapterPosition]));
  }, [isPrevDisabled, currentChapterPosition, chapterCouplings, dispatch]);

  const goNext = React.useCallback(() => {
    if (isNextDisabled) return;
    const nextChapterPosition = currentChapterPosition + 1;
    if (nextChapterPosition < 0 || nextChapterPosition >= chapterCouplings.length) return;
    dispatch(setChapters(chapterCouplings[nextChapterPosition]));
  }, [isNextDisabled, currentChapterPosition, chapterCouplings, dispatch]);

  const prevHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    goPrev();
  };

  const nextHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    goNext();
  };

  useChaptersOrFollowupsNavKeyboard(noArticles, selected, goPrev, goNext);

  const viewHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    dispatch(resetChapters());
  };

  if (noArticles || selected < 0 || !selectedBanner || chapterCouplings.length === 0) return null;

  return (
    <React.Fragment>
      <Link
        to="#"
        onClick={prevHandler}
        className={`${vs.tcg} ${isPrevDisabled ? '' : vs.mf} ms-1`}
      >
        <span className="current-year">Prev</span>
      </Link>
      <Link to="#" onClick={viewHandler} className={`${vs.tcg} ${vs.mf} ms-1`}>
        <span className="current-year">Chapters</span>
      </Link>
      <Link
        to="#"
        onClick={nextHandler}
        className={`${vs.tcg} ${isNextDisabled ? '' : vs.mf} ms-1`}
      >
        <span className="current-year">Next</span>
      </Link>
    </React.Fragment>
  );
};

interface FollowupsSelectorProps {
  noArticles: boolean;
}

const FollowupsSelector: React.FC<FollowupsSelectorProps> = ({ noArticles }) => {
  const dispatch = useDispatch();
  const quizzes = useSelector((state: RootState) => state.quiz.quizzes);
  const banners = useSelector((state: RootState) => state.quiz.banners);
  const selected = useSelector((state: RootState) => state.quiz.selected);
  const followupId = useSelector((state: RootState) => state.quiz.followupId);

  const selectedQuiz = quizzes[selected];
  const followupBanners = selectedQuiz
    ? banners.filter((banner) => banner.bannerId === selectedQuiz.id)
    : [];
  const currentFollowupPosition = followupBanners.findIndex((banner) => banner.id === followupId);
  const isPrevDisabled = currentFollowupPosition <= 0;
  const isNextDisabled = currentFollowupPosition === -1 || currentFollowupPosition >= followupBanners.length - 1;

  const goPrev = React.useCallback(() => {
    if (isPrevDisabled) return;
    const previousBanner = followupBanners[currentFollowupPosition - 1];
    if (!previousBanner) return;
    dispatch(setFollowupId(previousBanner.id));
  }, [isPrevDisabled, followupBanners, currentFollowupPosition, dispatch]);

  const goNext = React.useCallback(() => {
    if (isNextDisabled) return;
    const nextBanner = followupBanners[currentFollowupPosition + 1];
    if (!nextBanner) return;
    dispatch(setFollowupId(nextBanner.id));
  }, [isNextDisabled, followupBanners, currentFollowupPosition, dispatch]);

  const prevHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    goPrev();
  };

  const nextHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    goNext();
  };

  useChaptersOrFollowupsNavKeyboard(noArticles, followupId, goPrev, goNext);

  const viewHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    dispatch(setFollowupId(undefined));
  };

  if (noArticles || selected < 0 || followupId === undefined || followupBanners.length === 0) return null;

  return (
    <React.Fragment>
      <Link
        to="#"
        onClick={prevHandler}
        className={`${vs.tcg} ${isPrevDisabled ? '' : vs.mf} ms-1`}
      >
        <span className="current-year">Prev</span>
      </Link>
      <Link to="#" onClick={viewHandler} className={`${vs.tcg} ${vs.mf} ms-1`}>
        <span className="current-year">Followups</span>
      </Link>
      <Link
        to="#"
        onClick={nextHandler}
        className={`${vs.tcg} ${isNextDisabled ? '' : vs.mf} ms-1`}
      >
        <span className="current-year">Next</span>
      </Link>
    </React.Fragment>
  );
};

export default ViewSelector;
export { ArticleSelector, ChaptersSelector, FollowupsSelector };