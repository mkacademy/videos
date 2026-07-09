import Copyrights from './Copyrights';
import React, { useEffect, useState } from 'react';
import { _500 as Notfound } from '../views/404';
import ClassicPager from '../Pagination/Classic';
import SimplePager from '../Pagination/SimplePager';
import { useRecords } from '../../Hooks/useRecords';
import CourseScreen from '../convolayouts/Course/Screen';
import CourseCanopy from '../convolayouts/Course/Canopy';
import { CourseGlobal } from '../views/wrappers/courseGlobal';
import ViewSelector, { ArticleSelector, ChaptersSelector } from './ViewSelector';
import Comments from '../views/Comments';
import * as pennantStyles from '../../styles/course.module.css';
import * as styles from '../../styles/404.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import InstructionsForm from '../Formulator/InstructionsForm';
import SiftersForm from '../Formulator/SiftersForm';
import { onSubmit as formulatorOnSubmit, onCancel, onSave } from '../Formulator/formulatorUtils';
import { clearContentTypeSelected } from '../../store/slices/settingsSlice';
import FiltersForm from '../Formulator/FiltersForm';


interface CourseProps {
  setWebApp: (app: string) => void;
  coursePersister: () => void;
  convolution: string;
  noCourses: boolean;
  webapp: string;
}

const oops = "oops! nothing in here";
const wait = "Loading ... please wait";

const Course: React.FC<CourseProps> = ({
  setWebApp,
  noCourses,
  coursePersister,
  convolution,
  webapp,
}) => {
  const dispatch = useDispatch();
  const isUnzipTutorials = useSelector((state: RootState) => state.settings.isUnzipTutorials);
  const isAuthenticated = useSelector((state: RootState) => state.session.authenticated);
  const requestIsFetching = useSelector((state: RootState) => state.view.requestIsFetching);
  const requestIsSkeletons = useSelector((state: RootState) => state.view.requestIsSkeletons);
  const isUnzipCourses = useSelector((state: RootState) => state.settings.isUnzipCourses);
  const isUnzipQuizzes = useSelector((state: RootState) => state.settings.isUnzipQuizzes);
  const selectedBannerIndex = useSelector((state: RootState) => state.course.selected);
  const chapters = useSelector((state: RootState) => state.course.chapters);
  const isMaximumFeatures = !isUnzipCourses && !isUnzipQuizzes && !isUnzipTutorials;
  const showComments = selectedBannerIndex > - 1 && !noCourses && !isMaximumFeatures;
  const banners = useSelector((state: RootState) => state.course.banners);
  const bannerId = banners[selectedBannerIndex]?.id ?? -1;
  const message = requestIsFetching || requestIsSkeletons ? wait : oops;
  const [singleItemFormVisible, setSingleItemFormVisible] = useState(false);
  const isEditMode = useSelector((state: RootState) => state.settings.editMode);
  const toggleSingleItemFormVisible = isEditMode ? () => setSingleItemFormVisible((prev) => !prev) : () => null;
  const chapterIndexes = chapters ?? [];
  useEffect(() => {
    setWebApp("course")
    dispatch(clearContentTypeSelected("course"));
  }, []);
  useRecords({ convolution, webapp });

  return (
    <CourseGlobal>
      <div className={`container ${pennantStyles["course"]}`}>
        <Copyrights
          skeletons={requestIsSkeletons}
          loading={requestIsFetching}
          convolution={convolution}
          action={coursePersister}
          formatter={convolution}
          confirmation={isMaximumFeatures ?
            <ViewSelector /> :
            <>
              {chapterIndexes.length === 0 ? (
                <ArticleSelector content="Courses" noArticles={noCourses} />
              ) : (
                <ChaptersSelector noArticles={noCourses} chapters={chapterIndexes} />
              )}
            </>}
        >
          {noCourses && (
            <div className={`${styles["notFound"]} ${styles["bigger"]}`}>
              <Notfound message={message} />
            </div>
          )}
          {isMaximumFeatures ?
            <>
              <CourseScreen noCourses={noCourses} />
              <ClassicPager noContent={noCourses} />
            </>
            : <>
              <CourseCanopy noCourses={noCourses} onRouterSelection={toggleSingleItemFormVisible} />
              {selectedBannerIndex === -1 && (<SimplePager noContent={noCourses} />)}
            </>}
        </Copyrights>
        {isEditMode && !noCourses && !isMaximumFeatures && isAuthenticated && <>
          {chapterIndexes.length > 0 ? (
            <>
              <FiltersForm
                singleItemFormVisible={singleItemFormVisible}
                source="coursePennants"
                onSave={(id: number) => onSave(id)}
                onCancel={(id: number) => onCancel(id)}
                onSubmit={(data, options) => formulatorOnSubmit({
                  parentEntity: "sifters",
                  childEntity: "filters",
                  options,
                  data,
                })}
              />
              <InstructionsForm
                singleItemFormVisible={singleItemFormVisible}
                source="courseSlides"
                onSave={(id: number) => onSave(id)}
                onCancel={(id: number) => onCancel(id)}
                onSubmit={(data, options) => formulatorOnSubmit({
                  parentEntity: "filters",
                  childEntity: "instructions",
                  options,
                  data,
                })}
              />
            </>
          ) : (
            <>
              <SiftersForm
                singleItemFormVisible={singleItemFormVisible}
                source="courseBanner"
                onSave={(id: number) => onSave(id)}
                onCancel={(id: number) => onCancel(id)}
                onSubmit={(data, options) => formulatorOnSubmit({
                  parentEntity: "foundation",
                  childEntity: "sifters",
                  options,
                  data,
                })}
              />
              <InstructionsForm
                singleItemFormVisible={singleItemFormVisible}
                source="courseSlideGroupItems"
                onSave={(id: number) => onSave(id)}
                onCancel={(id: number) => onCancel(id)}
                onSubmit={(data, options) => formulatorOnSubmit({
                  parentEntity: "sifters",
                  childEntity: "instructions",
                  options,
                  data,
                })}
              />
            </>
          )}
        </>}
        {showComments && bannerId > 0 && <Comments commentsId={bannerId} _for="course" />}
      </div>
    </CourseGlobal>
  );
};

export default Course; 