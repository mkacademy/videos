import React from 'react';
import { Image } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { buildConvolutionNavSearch, warnConvolutionCsFsqConflict } from '../../../library/convolutionNavSearch';
import { resolveMediaPlayerTab } from '../../mediaPlayer/mediaPlayerUtils';
import { PartialNavigationProps } from '../ShortcutsProps';

const quiz = new URL('../../../Images/7128236.png', import.meta.url).href;
const course = new URL('../../../Images/2643368.png', import.meta.url).href;
const tutorial = new URL('../../../Images/5609505.png', import.meta.url).href;
const mediaPlayerIcon = new URL('../../../Images/video_player.png', import.meta.url).href;

const PartialNavigation: React.FC<PartialNavigationProps> = ({
  convCss,
  styles,
  isUnzipCourses,
  isUnzipQuizzes,
  isUnzipTutorials
}) => {
  const { pathname } = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const fsq = useSelector((state: RootState) => state.settings.fsq);
  const shouldHydrate = useSelector((state: RootState) => state.settings.shouldHydrate);
  const stickyFsq = { shouldHydrate, fsq };
  const convolutionLinkProps = (pathname: string) => {
    const search = buildConvolutionNavSearch(undefined, stickyFsq);
    return {
      to: { pathname, search: search ?? undefined },
      onClick: (e: React.MouseEvent) => {
        if (search === null) {
          e.preventDefault();
          warnConvolutionCsFsqConflict(dispatch);
        }
      },
    };
  };
  const defaultMediaPlayerTab = resolveMediaPlayerTab(null, curApp);
  const cssClass = styles.shortcut + ' ' + (styles[convCss] ?? '');
  const container = styles['shortcut-Container'] + ' ' + (styles[convCss] ?? '');
  const isTutorial = pathname.indexOf('/tutorial') > -1;
  const isCourse = pathname.indexOf('/course') > -1;
  const isQuiz = pathname.indexOf('/quiz') > -1;
  const isMediaPlayer = pathname.indexOf('/media-player') > -1;

  return (
    <React.Fragment>
      {!isMediaPlayer && (
        <div className={container}>
          <Link to={`/media-player?tab=${defaultMediaPlayerTab}`}>
            <Image className={cssClass} src={mediaPlayerIcon} alt="Media player" />
          </Link>
        </div>
      )}
      {!isQuiz && isUnzipQuizzes && (
        <div className={container}>
          <Link
            {...convolutionLinkProps('/convolution/quiz')}
          >
            <Image className={cssClass} src={quiz} />
          </Link>
        </div>
      )}
      {!isTutorial && isUnzipTutorials && (
        <div className={container}>
          <Link
            {...convolutionLinkProps('/convolution/tutorial')}
          >
            <Image className={cssClass} src={tutorial} />
          </Link>
        </div>
      )}
      {!isCourse && isUnzipCourses && (
        <div className={container}>
          <Link
            {...convolutionLinkProps('/convolution/course')}
          >
            <Image className={cssClass} src={course} />
          </Link>
        </div>
      )}
    </React.Fragment>
  );
};

export default PartialNavigation;
