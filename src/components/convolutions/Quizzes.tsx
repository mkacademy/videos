import React, { useEffect, useState } from 'react';
import Copyrights from './Copyrights';
import { _500 as Notfound } from '../views/404';
import ClassicPager from '../Pagination/Classic';
import SimplePager from '../Pagination/SimplePager';
import { useRecords } from '../../Hooks/useRecords';
import QuizzesScreen from '../convolayouts/Quizzes/Screen';
import { CourseGlobal } from '../views/wrappers/courseGlobal';
import ViewSelector, { ArticleSelector, FollowupsSelector } from './ViewSelector';
import * as courseStyles from '../../styles/course.module.css';
import * as _404styles from '../../styles/404.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import InstructionsForm from '../Formulator/InstructionsForm';
import SiftersForm from '../Formulator/SiftersForm';
import DashboardsForm from '../Formulator/DashboardsForm';
import Comments from '../views/Comments';
import { onSubmit as formulatorOnSubmit, onCancel, onSave } from '../Formulator/formulatorUtils';
import { clearContentTypeSelected } from '../../store/slices/settingsSlice';
import FiltersForm from '../Formulator/FiltersForm';
const styleProps = {
  notFound: _404styles["notFound"],
  course: courseStyles["course"],
  bigger: _404styles["bigger"],
}

const oops = "oops! nothing in here";
const wait = "Loading ... please wait";

interface QuizzesProps {
  setWebApp: (app: string) => void;
  quizPersister: () => void;
  convolution: string;
  noQuizzes: boolean;
  webapp: string;
}

export const Quizzes: React.FC<QuizzesProps> = ({
  setWebApp,
  noQuizzes,
  quizPersister,
  convolution,
  webapp,
}) => {
  const dispatch = useDispatch();
  useEffect(() => {
    setWebApp("quiz")
    dispatch(clearContentTypeSelected("quiz"));
  }, []);
  useRecords({ convolution, webapp });
  const isUnzipTutorials = useSelector((state: RootState) => state.settings.isUnzipTutorials);
  const isAuthenticated = useSelector((state: RootState) => state.session.authenticated);
  const requestIsFetching = useSelector((state: RootState) => state.view.requestIsFetching);
  const requestIsSkeletons = useSelector((state: RootState) => state.view.requestIsSkeletons);
  const isUnzipCourses = useSelector((state: RootState) => state.settings.isUnzipCourses);
  const isUnzipQuizzes = useSelector((state: RootState) => state.settings.isUnzipQuizzes);
  const selectedBannerIndex = useSelector((state: RootState) => state.quiz.selected);
  const followupId = useSelector((state: RootState) => state.quiz.followupId);
  const isMaximumFeatures = !isUnzipCourses && !isUnzipQuizzes && !isUnzipTutorials;
  const showComments = selectedBannerIndex > - 1 && !noQuizzes && !isMaximumFeatures;
  const isEditMode = useSelector((state: RootState) => state.settings.editMode);
  const banners = useSelector((state: RootState) => state.quiz.quizzes);
  const bannerId = banners[selectedBannerIndex]?.id ?? -1;
  const message = requestIsFetching || requestIsSkeletons ? wait : oops;
  const [singleItemFormVisible, setSingleItemFormVisible] = useState(false);
  const toggleSingleItemFormVisible = isEditMode ? () => setSingleItemFormVisible((prev) => !prev) : () => null;
  return (
    <CourseGlobal>
      <div className={`container ${styleProps["course"]}`}>
        <Copyrights
          action={quizPersister}
          formatter={convolution}
          convolution={convolution}
          loading={requestIsFetching}
          skeletons={requestIsSkeletons}
          confirmation={isMaximumFeatures ?
            <ViewSelector /> :
            <>
              {followupId !== undefined ? (
                <FollowupsSelector noArticles={noQuizzes} />
              ) : (
                <ArticleSelector content="Quizzes" noArticles={noQuizzes} />
              )}
            </>}
        >
          {noQuizzes && (
            <div className={`${styleProps["notFound"]} ${styleProps["bigger"]}`}>
              <Notfound message={message} />
            </div>
          )}

          {isMaximumFeatures ? <>
            <QuizzesScreen noQuizzes={noQuizzes} />
            <ClassicPager noContent={noQuizzes} />
          </> : <>
            <QuizzesScreen noQuizzes={noQuizzes} onRouterSelection={toggleSingleItemFormVisible} />
            {selectedBannerIndex === -1 && (<SimplePager noContent={noQuizzes} />)}
          </>}
        </Copyrights>
        {isEditMode && !noQuizzes && !isMaximumFeatures && isAuthenticated && <>
          <DashboardsForm
            singleItemFormVisible={singleItemFormVisible}
            onSave={(id: number) => onSave(id)}
            onCancel={(id: number) => onCancel(id)}
            onSubmit={(data, options) => formulatorOnSubmit({
              parentEntity: "foundation",
              childEntity: "dashboards",
              options,
              data,
            })}
          />
          {followupId === undefined && (
            <SiftersForm source="quizBanner"
              singleItemFormVisible={singleItemFormVisible}
              onSave={(id: number) => onSave(id)}
              onCancel={(id: number) => onCancel(id)}
              onSubmit={(data, options) => formulatorOnSubmit({
                parentEntity: "dashboards",
                childEntity: "sifters",
                options,
                data,
              })}
            />
          )}
          {followupId !== undefined && (
            <FiltersForm
              singleItemFormVisible={singleItemFormVisible}
              source="quizCoursePennants"
              onSave={(id: number) => onSave(id)}
              onCancel={(id: number) => onCancel(id)}
              onSubmit={(data, options) => formulatorOnSubmit({
                parentEntity: "sifters",
                childEntity: "filters",
                options,
                data,
              })}
            />
          )}
          {selectedBannerIndex > -1 && (<InstructionsForm
            source={followupId !== undefined ? "quizSlides" : "quizSlideGroupItems"}
            singleItemFormVisible={singleItemFormVisible}
            onSave={(id: number) => onSave(id)}
            onCancel={(id: number) => onCancel(id)}
            onSubmit={(data, options) => formulatorOnSubmit({
              parentEntity: followupId !== undefined ? "filters" : "sifters",
              childEntity: "instructions",
              options,
              data,
            })}
          />
          )}
        </>}
        {showComments && bannerId > 0 && <Comments commentsId={bannerId} _for="quiz" />}
      </div>
    </CourseGlobal>
  );
};

export default Quizzes; 