import Copyrights from './Copyrights';
import React, { useEffect, useState } from 'react';
import { _500 as Notfound } from '../views/404';
import ClassicPager from "../Pagination/Classic";
import SimplePager from '../Pagination/SimplePager';
import * as styles from '../../styles/404.module.css';
import { useRecords } from '../../Hooks/useRecords';
import Tutorials from "../convolayouts/Tutorial/Screen";
import ViewSelector, { ArticleSelector } from './ViewSelector';
import * as courseStyles from "../../styles/course.module.css";
import { CourseGlobal } from '../views/wrappers/courseGlobal';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import InstructionsForm from '../Formulator/InstructionsForm';
import FiltersForm from '../Formulator/FiltersForm';
import { onSubmit as formulatorOnSubmit, onCancel, onSave } from '../Formulator/formulatorUtils';
import Comments from '../views/Comments';
import { clearContentTypeSelected } from '../../store/slices/settingsSlice';
interface TutorialProps {
  setWebApp: (app: string) => void;
  tutorialPersister: () => void;
  noTutorials: boolean;
  convolution: string;
  webapp: string;
}

const oops = "oops! nothing in here";
const wait = "Loading ... please wait";

export const Tutorial: React.FC<TutorialProps> = ({
  setWebApp,
  tutorialPersister,
  noTutorials,
  webapp,
  convolution,
}) => {
  const dispatch = useDispatch();
  const isUnzipTutorials = useSelector((state: RootState) => state.settings.isUnzipTutorials);
  const isAuthenticated = useSelector((state: RootState) => state.session.authenticated);
  const requestIsFetching = useSelector((state: RootState) => state.view.requestIsFetching);
  const requestIsSkeletons = useSelector((state: RootState) => state.view.requestIsSkeletons);
  const isUnzipCourses = useSelector((state: RootState) => state.settings.isUnzipCourses);
  const isUnzipQuizzes = useSelector((state: RootState) => state.settings.isUnzipQuizzes);
  const selectedBanerIndex = useSelector((state: RootState) => state.tutorial.selected);
  const isMaximumFeatures = !isUnzipCourses && !isUnzipQuizzes && !isUnzipTutorials;
  const showComments = selectedBanerIndex > - 1 && !noTutorials && !isMaximumFeatures;
  const banners = useSelector((state: RootState) => state.tutorial.banners);
  const bannerId = banners[selectedBanerIndex]?.id ?? -1;
  const [singleItemFormVisible, setSingleItemFormVisible] = useState(false);
  const isEditMode = useSelector((state: RootState) => state.settings.editMode);
  const toggleSingleItemFormVisible = isEditMode ? () => setSingleItemFormVisible((prev) => !prev) : () => null;
  useEffect(() => {
    setWebApp("tutorial")
    dispatch(clearContentTypeSelected("tutorial"));
  }, []);
  useRecords({ convolution, webapp });

  const message = requestIsFetching || requestIsSkeletons ? wait : oops;
  return (
    <CourseGlobal>
      <div className={`container ${courseStyles["course"]}`}>
        <Copyrights
          loading={requestIsFetching}
          skeletons={requestIsSkeletons}
          action={tutorialPersister}
          formatter={convolution}
          convolution={convolution}
          confirmation={
            isMaximumFeatures ?
              <ViewSelector /> :
              <ArticleSelector content="Tutorials" noArticles={noTutorials} />}
        >
          {noTutorials && (
            <div className={`${styles["notFound"]} ${styles["bigger"]}`}>
              <Notfound message={message} />
            </div>
          )}
          {isMaximumFeatures ? <>
            <Tutorials noTutorials={noTutorials} />
            <ClassicPager noContent={noTutorials} />
          </> : <>
            <Tutorials noTutorials={noTutorials} onRouterSelection={toggleSingleItemFormVisible} />
            {selectedBanerIndex === -1 && (<SimplePager noContent={noTutorials} />)}
          </>}
        </Copyrights>
        {isEditMode && !noTutorials && !isMaximumFeatures && isAuthenticated && <>
          <FiltersForm
            singleItemFormVisible={singleItemFormVisible}
            onSave={(id: number) => onSave(id)}
            onCancel={(id: number) => onCancel(id)}
            onSubmit={(data, options) => formulatorOnSubmit({
              parentEntity: "foundation",
              childEntity: "filters",
              options,
              data,
            })}
          />
          <InstructionsForm
            singleItemFormVisible={singleItemFormVisible}
            onSave={(id: number) => onSave(id)}
            onCancel={(id: number) => onCancel(id)}
            source="tutorialContent" onSubmit={(data, options) => formulatorOnSubmit({
              parentEntity: "filters",
              childEntity: "instructions",
              options,
              data,
            })}
          />
        </>}
        {showComments && bannerId > 0 && <Comments commentsId={bannerId} _for="tutorial" />}
      </div>
    </CourseGlobal>
  );
};

export default Tutorial; 