import React, { useEffect } from 'react';
import { Pagination } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import * as paginationStyles from '../../styles/classicPager.module.css';
import type { AppDispatch, RootState } from '../../store';
import { pageCountForScreen, type PagerScreen } from '../../library/sessionPager';
import { isPagerLocked, pageAdjacent, pageSessionItem } from '../../store/thunks/sessionPager';

const appClass = paginationStyles['course'];
const itemClass = `${appClass} ${paginationStyles['page-item']} `;
const linkClass = `${appClass} ${paginationStyles['page-link']}`;

interface SessionPagerProps {
  screen: PagerScreen;
}

/** One page = one session item. Prev/Next cross into the neighbouring session at the ends. */
const SessionPager: React.FC<SessionPagerProps> = ({ screen }) => {
  const dispatch = useDispatch<AppDispatch>();
  const sessionIds = useSelector((state: RootState) => state.sessionPager.sessionIds);
  const sessionIndex = useSelector((state: RootState) => state.sessionPager.sessionIndex);
  const pageCounts = useSelector((state: RootState) => state.sessionPager.pageCounts);
  const currentPage = useSelector((state: RootState) => state.sessionPager.page[screen]);
  const visibleItemId = useSelector((state: RootState) => state.sessionPager.visibleItemId[screen]);
  const hidden = useSelector((state: RootState) => state.sessionPager.screenHidden);
  const sessionId = sessionIds[sessionIndex];
  const endPage = useSelector((state: RootState) =>
    sessionId === undefined ? undefined : state.sessionPager.endPage[screen][sessionId]);
  const locked = useSelector((state: RootState) => isPagerLocked(state, screen));

  const k = pageCountForScreen(pageCounts, screen);
  const pageEnded = endPage !== undefined && currentPage >= endPage;

  // Screen opened with nothing shown yet for this kind (e.g. after a session change): load its page.
  useEffect(() => {
    if (sessionId === undefined || visibleItemId !== null || hidden || locked || k === 0 || pageEnded) return;
    void dispatch(pageSessionItem({ screen, page: currentPage }));
  }, [dispatch, screen, sessionId, visibleItemId, hidden, locked, k, pageEnded, currentPage]);

  if (sessionIds.length === 0 || k === 0) return null;

  const disabled = hidden || locked;
  const isFirst = sessionIndex === 0 && currentPage <= 1;
  const isLast = sessionIndex === sessionIds.length - 1
    && (currentPage >= k || (endPage !== undefined && currentPage + 1 >= endPage));
  const pages = Array.from({ length: k }, (_, i) => i + 1);

  return (
    <div className="d-flex flex-column align-items-center">
      <small className="text-muted mb-1">
        Session {sessionIndex + 1} / {sessionIds.length}
      </small>
      <ul className={`classic pagination flex-wrap ${paginationStyles['pagination']}`}>
        <Pagination.Prev
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) void dispatch(pageAdjacent({ screen, direction: 'prev' }));
          }}
          className={itemClass}
          linkClassName={linkClass}
          disabled={disabled || isFirst}
        />
        {pages.map((page) => {
          const pastEnd = endPage !== undefined && page >= endPage;
          return (
            <Pagination.Item
              key={page}
              active={page === currentPage && visibleItemId !== null}
              onClick={(e) => {
                e.preventDefault();
                if (!disabled && !pastEnd) void dispatch(pageSessionItem({ screen, page }));
              }}
              className={itemClass}
              linkClassName={linkClass}
              disabled={disabled || pastEnd}
            >
              {page}
            </Pagination.Item>
          );
        })}
        <Pagination.Next
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) void dispatch(pageAdjacent({ screen, direction: 'next' }));
          }}
          className={itemClass}
          linkClassName={linkClass}
          disabled={disabled || isLast}
        />
      </ul>
    </div>
  );
};

export default SessionPager;
