import React, { useMemo } from 'react';
import { Pagination } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import * as paginationStyles from '../../styles/classicPager.module.css';
import { useCycleUnzipTypeOnCtrlShiftArrows } from '../../Hooks/useShortcuts';
import {
  SIMPLE_PAGER_DEFAULT_MAX_PAGE_INDEX,
  SIMPLE_PAGER_WINDOW_SIZE,
  getSimplePageIndexFromSearch,
  setSimplePageInSearch,
} from '../../utils';

const styleProps = {
  course: paginationStyles['course'],
  pagination: paginationStyles['pagination'],
  underlinedIncoming: paginationStyles['underlined-incoming'],
  underlinedOutgoing: paginationStyles['underlined-outgoing'],
  pageItem: paginationStyles['page-item'],
  pageLink: paginationStyles['page-link'],
};

export interface SimplePagerProps {
  noContent: boolean;
  /** Inclusive last 0-based page index (default 699 → 700 pages). */
  maxPageIndex?: number;
}

const SimplePager: React.FC<SimplePagerProps> = ({
  noContent,
  maxPageIndex = SIMPLE_PAGER_DEFAULT_MAX_PAGE_INDEX,
}) => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const curSimplePage = getSimplePageIndexFromSearch(search, maxPageIndex);
  const { pageIndex: underlinedPage, side: underlineSide } = useCycleUnzipTypeOnCtrlShiftArrows();
  const navigatePage = (page: number) => {
    navigate({ pathname, search: setSimplePageInSearch(search, page, maxPageIndex) });
  };

  const pageGroupValue = Math.floor(curSimplePage / SIMPLE_PAGER_WINDOW_SIZE);
  const start = pageGroupValue * SIMPLE_PAGER_WINDOW_SIZE;
  const hasNextGroup =
    (pageGroupValue + 1) * SIMPLE_PAGER_WINDOW_SIZE <= maxPageIndex;

  const pages = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < SIMPLE_PAGER_WINDOW_SIZE; i++) {
      out.push(start + i);
    }
    return out;
  }, [start]);

  const appClass = styleProps.course;
  const defaultClass = `${appClass} ${styleProps.pageItem} `;
  const pageLink = `${appClass} ${styleProps.pageLink}`;
  const isDisabled = noContent;

  return (
    <ul className={`classic pagination ${styleProps.pagination}`}>
      {pageGroupValue !== 0 && (
        <>
          <Pagination.First
            onClick={(e) => {
              e.preventDefault();
              navigatePage(0);
            }}
            className={defaultClass}
            linkClassName={pageLink}
            disabled={isDisabled}
          />
          <Pagination.Ellipsis
            onClick={(e) => {
              e.preventDefault();
              navigatePage((pageGroupValue - 1) * SIMPLE_PAGER_WINDOW_SIZE);
            }}
            className={defaultClass}
            linkClassName={pageLink}
            disabled={isDisabled}
          />
        </>
      )}
      {pages.map((slice, i) => {
        const pageNumber = slice + 1;
        const pastMax = slice > maxPageIndex;
        const inActive = isDisabled || pastMax || slice === curSimplePage;
        const pageClass =
          slice === underlinedPage && underlineSide === 'incoming'
            ? `${defaultClass} ${styleProps.underlinedIncoming}`
            : slice === underlinedPage && underlineSide === 'outgoing'
              ? `${defaultClass} ${styleProps.underlinedOutgoing}`
              : defaultClass;
        return (
          <Pagination.Item
            key={`${start}-${i}`}
            linkClassName={pageLink}
            disabled={isDisabled || pastMax}
            className={pageClass}
            active={!isDisabled && !pastMax && slice === curSimplePage}
            onClick={
              inActive || pastMax
                ? undefined
                : (e) => {
                    e.preventDefault();
                    navigatePage(slice);
                  }
            }
          >
            {pageNumber}
          </Pagination.Item>
        );
      })}
      {hasNextGroup && (
        <>
          <Pagination.Ellipsis
            onClick={(e) => {
              e.preventDefault();
              navigatePage((pageGroupValue + 1) * SIMPLE_PAGER_WINDOW_SIZE);
            }}
            className={defaultClass}
            linkClassName={pageLink}
            disabled={isDisabled}
          />
          <Pagination.Last
            onClick={(e) => {
              e.preventDefault();
              navigatePage(maxPageIndex);
            }}
            className={defaultClass}
            linkClassName={pageLink}
            disabled={isDisabled}
          />
        </>
      )}
    </ul>
  );
};

export default SimplePager;
