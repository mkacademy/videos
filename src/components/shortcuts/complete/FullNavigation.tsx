import React from 'react';
import { Image } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { buildConvolutionNavSearch, warnConvolutionCsFsqConflict } from '../../../library/convolutionNavSearch';
import { NavigationProps } from '../ShortcutsProps';

const quiz = new URL('../../../Images/7128236.png', import.meta.url).href;
const course = new URL('../../../Images/2643368.png', import.meta.url).href;
const tutorial = new URL('../../../Images/5609505.png', import.meta.url).href;
const cpanelIcon = new URL('../../../Images/cpnael.png', import.meta.url).href;
const incomingIcon = new URL('../../../Images/incoming.webp', import.meta.url).href;
const searchIcon = new URL('../../../Images/search-icon.png', import.meta.url).href;
const tutorsIcon = new URL('../../../Images/tutors-icon.png', import.meta.url).href;
const outgoingIcon = new URL('../../../Images/messenger-icon.png', import.meta.url).href;
const mediaPrepper = new URL('../../../Images/video_prepper.png', import.meta.url).href;

const FullNavigation: React.FC<NavigationProps> = ({
  webapp,
  convCss,
  clearData,
  senderIndex,
  encodedDatas,
  clearTabulator,
  styles
}) => {
  const { pathname } = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const fsq = useSelector((state: RootState) => state.settings.fsq);
  const shouldHydrate = useSelector((state: RootState) => state.settings.shouldHydrate);
  const stickyFsq = { shouldHydrate, fsq };
  const isApp = pathname.startsWith('/app');
  const cssClass = styles.shortcut + ' ' + (styles[convCss] ?? '');
  const container = styles['shortcut-Container'] + ' ' + (styles[convCss] ?? '');
  const matches = pathname.match(/(\/tutors|\/incoming|\/outgoing)$/);
  const isTutorial = pathname.indexOf('/tutorial') > -1;
  const isCourse = pathname.indexOf('/course') > -1;
  const isSearch = pathname.indexOf('/search') > -1;
  const isCpanel = pathname.indexOf('/cpanel') > -1;
  const isQuiz = pathname.indexOf('/quiz') > -1;
  const isMessenger = matches !== null && matches.length > 0;
  const isMediaPrepper = pathname.indexOf('/media-prepper') > -1;
  const clear = () => {
    setTimeout(() => {
      clearTabulator();
      clearData();
    }, 100);
  };
  const convolutionLinkProps = (pathname: string, csEncoded?: string) => {
    const search = buildConvolutionNavSearch(csEncoded, stickyFsq);
    return {
      to: { pathname, search: search ?? undefined },
      onClick: (e: React.MouseEvent) => {
        if (search === null) {
          e.preventDefault();
          warnConvolutionCsFsqConflict(dispatch);
          return;
        }
        clear();
      },
    };
  };

  return (
    <React.Fragment>
      {!isSearch && (
        <div className={container}>
          <Link to="/convolution/search" onClick={clear}>
            <Image className={cssClass} src={searchIcon} />
          </Link>
        </div>
      )}
      {!isMediaPrepper && (
        <div className={container}>
          <Link to="/media-prepper">
            <Image className={cssClass} src={mediaPrepper} alt="Media prepper" />
          </Link>
        </div>
      )}
      {!isApp && !isQuiz && !isSearch && (
        <div className={container}>
          <Link
            {...convolutionLinkProps('/convolution/quiz', encodedDatas[1])}
          >
            <Image className={cssClass} src={quiz} />
          </Link>
        </div>
      )}
      {!isApp && !isTutorial && !isSearch && (
        <div className={container}>
          <Link
            {...convolutionLinkProps('/convolution/tutorial', encodedDatas[4])}
          >
            <Image className={cssClass} src={tutorial} />
          </Link>
        </div>
      )}
      {!isApp && !isCourse && !isSearch && (
        <div className={container}>
          <Link
            {...convolutionLinkProps('/convolution/course', encodedDatas[3])}
          >
            <Image className={cssClass} src={course} />
          </Link>
        </div>
      )}
      {!isApp && !isMessenger && !isSearch && (
        <React.Fragment>
          <div className={container}>
            <Link
              {...convolutionLinkProps('/convolution/tutors', encodedDatas[2])}
            >
              <Image className={cssClass} src={tutorsIcon} />
            </Link>
          </div>
          {senderIndex > -1 && (
            <div className={container}>
              <Link
                {...convolutionLinkProps('/convolution/incoming', encodedDatas[5])}
              >
                <Image className={cssClass} src={incomingIcon} />
              </Link>
            </div>
          )}
          <div className={container}>
            <Link
              {...convolutionLinkProps('/convolution/outgoing', encodedDatas[6])}
            >
              <Image className={cssClass} src={outgoingIcon} />
            </Link>
          </div>
        </React.Fragment>
      )}
      {!isCpanel && (
        <div className={container}>
          <Link
            {...convolutionLinkProps('/convolution/cpanel', encodedDatas[webapp])}
          >
            <Image className={cssClass} src={cpanelIcon} />
          </Link>
        </div>
      )}
    </React.Fragment>
  );
};

export default FullNavigation;
