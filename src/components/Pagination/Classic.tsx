import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pagination } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { Buffer } from 'buffer';
import { pageGroup, setPagedRoutes } from '../../store/slices/paginationSlice';
import { convolutionTake, getConvSearch, } from '../../utils';
import { navigateConvolutionOrWarn, stickyFsqFromState } from '../../library/convolutionNavSearch';
import * as paginationStyles from '../../styles/classicPager.module.css';
import { PagedRoutes } from '../../store/slices/paginationSlice';
import { RootState } from '../../store/types';
import { initTotals } from '../../library/actions';


const appGroups = {
  '/convolution/incoming': 'carders',
  '/convolution/outgoing': 'carders',
  '/convolution/tutors': 'carders',
  '/convolution/cpanel': 'cpanel',
  '/convolution/quiz': 'course',
  '/convolution/tutorial': 'course',
  '/convolution/course': 'course',
}

const styleProps = {
  cpanel: paginationStyles["cpanel"],
  course: paginationStyles["course"],
  carders: paginationStyles["carders"],
  pagination: paginationStyles["pagination"],
  underlined: paginationStyles["underlined"],
  pageItem: paginationStyles['page-item'],
  pageLink: paginationStyles['page-link'],
}

interface ClassicPagerProps {
  noContent: boolean | undefined;
}

interface PageItem {
  slice: number;
  eDisabled?: boolean;
  uDisabled?: boolean;
}

const getPage = (routes: PagedRoutes, route: string) => {
  if (route === undefined || routes === undefined || routes[route] === undefined) return 0;
  const { skip = 0 } = routes[route];
  return Math.floor(skip / convolutionTake());
};

const newPages = [
  { slice: 0 },
  { slice: 1 },
  { slice: 2 },
  { slice: 3 },
  { slice: 4 },
  { slice: 5 },
  { slice: 6 },
];
const defaultTotals = { estimatedTotal: 0, actualTotal: 0 };
const newPagerPred = ({ slice }: { slice: number }): PageItem => ({ slice });
const disPred = ({ eDisabled, uDisabled }: PageItem) => uDisabled || eDisabled;
const diffPred = ({ eDisabled, uDisabled }: PageItem) => uDisabled !== eDisabled;

const ClassicPager: React.FC<ClassicPagerProps> =
  ({ noContent }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { search, pathname } = useLocation();
    const pennants = useSelector((state: RootState) => state.course.banners.map(p => p.pennants.filter(p => p.isHighlighted).length).reduce((a, b) => a + b, 0));
    const pennantz = useSelector((state: RootState) => state.quiz.banners.filter(p => p.isHighlighted).length);
    const selectedTutorial = useSelector((state: RootState) => state.tutorial.selected);
    const selectedCourse = useSelector((state: RootState) => state.course.selected);
    const selectedQuiz = useSelector((state: RootState) => state.quiz.selected);
    const total = useSelector((state: RootState) => state.stats.total);
    const webapp = useSelector((state: RootState) => state.session.curApp);
    const routes = useSelector((state: RootState) => state.pagination.pagedRoutes);
    const curGroup = useSelector((state: RootState) => state.pagination.curPageGroup);
    const selecteds = useSelector((state: RootState) => state.pagination.selectedRoutes);
    const stickyFsq = useSelector((state: RootState) => stickyFsqFromState(state));


    const estimatedTotal = total?.estimatedTotal ?? defaultTotals.estimatedTotal;
    const actualTotal = total?.actualTotal ?? defaultTotals.actualTotal;
    const curRoutes = routes[webapp];
    const selected = selecteds[webapp];
    const [page, setPage] = useState(-1);
    const pageGroupValue = curGroup[webapp] ?? 0;
    const [pages, setPages] = useState<PageItem[]>([]);
    const forwardDisabled = pages.find(disPred) !== undefined;
    const underlineEnabled = pages.find(diffPred) !== undefined;
    const isDisabled = selected === undefined || noContent || total === undefined;

    useEffect(() => {
      setTimeout(() => dispatch(initTotals()), 100);
    }, [selectedTutorial, selectedCourse, selectedQuiz, pennantz, pennants]);

    useEffect(() => {
      const pages = newPages.map(newPagerPred);
      const incrementer = pages.length * pageGroupValue;
      for (let i = 0; i < pages.length; i++) {
        pages[i].slice = pages[i].slice + incrementer;
        pages[i].eDisabled = convolutionTake() * pages[i].slice >= estimatedTotal;
        pages[i].uDisabled = convolutionTake() * pages[i].slice >= actualTotal;
      }
      setPages(pages);
    }, [pageGroupValue, actualTotal, estimatedTotal]);

    useEffect(() => {
      setPages((pages) => {
        const page = getPage(curRoutes, selected);
        const prevPage = page - 1 > -1 ? page - 1 : 0;
        const divider = pages.length > 0 ? pages.length : 1;
        const _pageGroup = Math.floor(prevPage / divider);
        const found = pages.find(({ slice }) => slice === page);
        const visible = pages.length === 0 || found;
        const params = [webapp, _pageGroup] as [number, number];
        if (!visible) setTimeout(() => dispatch(pageGroup(params)));
        setTimeout(() => setPage(page));
        return pages;
      });
    }, [curRoutes, selected, dispatch, webapp]);

    const reset = (e: React.MouseEvent, group: number) => {
      dispatch(pageGroup([webapp, group]));
      e.preventDefault();
    };

    const downPager = (e: React.MouseEvent) => {
      dispatch(pageGroup([webapp, pageGroupValue - 1]));
      e.preventDefault();
    };

    const upPager = (e: React.MouseEvent) => {
      dispatch(pageGroup([webapp, pageGroupValue + 1]));
      e.preventDefault();
    };

    const pageView = (e: React.MouseEvent, slice: number) => {
      e.preventDefault();
      const searchRoutes = getConvSearch(search) ?? {};
      const take = convolutionTake();
      const params = {
        skip: (slice * take) - take,
        take: take,
      };
      const pageObj =
        Object.entries(curRoutes ?? {}).length > 0
          ? curRoutes[selected]
            ? {
              ...curRoutes,
              [selected]: {
                ...curRoutes[selected],
                ...params,
              },
            }
            : { ...curRoutes, [selected]: params }
          : { [selected]: params };
      const consolidatedObj =
        Object.keys(searchRoutes).length > 0
          ? { ...searchRoutes, ...pageObj }
          : pageObj;
      const buffer = Buffer.from(JSON.stringify(consolidatedObj));
      const encodedData = buffer.toString('base64');
      pageObj[selected]['skip'] = slice * take;
      dispatch(setPagedRoutes([webapp, pageObj]));
      navigateConvolutionOrWarn(dispatch, navigate, pathname, encodedData, stickyFsq);
    };
    const appClass = styleProps[appGroups[pathname as keyof typeof appGroups] as keyof typeof styleProps];
    const defaultClass = `${appClass} ${styleProps.pageItem} `;
    const underlined = `${defaultClass} ${styleProps.underlined}`;
    const pageLink = `${appClass} ${styleProps.pageLink}`;
    return (
      <ul className={`classic pagination ${styleProps.pagination}`}>
        {pageGroupValue !== 0 && (
          <React.Fragment>
            <Pagination.First
              onClick={(e) => reset(e, 0)}
              className={defaultClass}
              linkClassName={pageLink}
              disabled={isDisabled}
            />
            <Pagination.Ellipsis
              onClick={downPager}
              className={defaultClass}
              linkClassName={pageLink}
              disabled={isDisabled}
            />
          </React.Fragment>
        )}
        {pages.map(({ slice, eDisabled, uDisabled }, i) => {
          const pageNumber = slice + 1;
          const notUnderlined = isDisabled || uDisabled;
          const clazz = underlineEnabled ? underlined : defaultClass;
          const inActive = isDisabled || eDisabled || slice === page;
          return (
            <Pagination.Item
              key={i}
              linkClassName={pageLink}
              disabled={isDisabled || eDisabled}
              className={notUnderlined ? defaultClass : clazz}
              active={isDisabled ? undefined : slice === page}
              onClick={inActive ? undefined : (e) => pageView(e, slice)}
            >
              {pageNumber}
            </Pagination.Item>
          );
        })}
        {!forwardDisabled && pageGroupValue !== 99 && (
          <React.Fragment>
            <Pagination.Ellipsis
              onClick={upPager}
              className={defaultClass}
              linkClassName={pageLink}
              disabled={isDisabled}
            />
            <Pagination.Last
              onClick={(e) => reset(e, 99)}
              className={defaultClass}
              linkClassName={pageLink}
              disabled={isDisabled}
            />
          </React.Fragment>
        )}
      </ul>
    );
  };

export default ClassicPager; 