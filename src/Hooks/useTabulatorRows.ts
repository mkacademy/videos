import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { TABULATOR_RENDER_CAP, tabluarPrefixes } from '../constants';
import { Row } from '../store/slices/rowSlice';
import { RootState } from '../store/types';

export { TABULATOR_RENDER_CAP };

export function useVisibleRows(): Row[] {
  const rows = useSelector((state: RootState) => state.row);
  return useMemo(() => rows.filter((row) => !row.deleted), [rows]);
}

export function toGlobalRowIndex(localIndex: number, renderOffset: number): number {
  return renderOffset + localIndex;
}

export function useRowIndexById(ids: string[] | undefined): Map<string, number> {
  return useMemo(() => {
    const map = new Map<string, number>();
    if (!ids) return map;
    ids.forEach((id, index) => map.set(id, index));
    return map;
  }, [ids]);
}

export interface RenderRowsResult {
  renderRows: Row[];
  renderOffset: number;
  totalVisible: number;
  canPrev: boolean;
  canNext: boolean;
}

export function useRenderRows(): RenderRowsResult {
  const visibles = useVisibleRows();
  const rawOffset = useSelector((state: RootState) => state.session.tabulatorRenderOffset);

  return useMemo(() => {
    const totalVisible = visibles.length;
    const maxOffset = Math.max(0, totalVisible - TABULATOR_RENDER_CAP);
    const renderOffset = Math.min(Math.max(0, rawOffset), maxOffset);
    const renderRows = visibles.slice(renderOffset, renderOffset + TABULATOR_RENDER_CAP);
    return {
      renderRows,
      renderOffset,
      totalVisible,
      canPrev: renderOffset > 0,
      canNext: renderOffset < maxOffset,
    };
  }, [visibles, rawOffset]);
}

/** e.g. ` (2 - 5)` when on tabulator with more than {@link TABULATOR_RENDER_CAP} visible rows. */
export function useTabulatorBannerSuffix(): string {
  const { pathname } = useLocation();
  const { renderOffset, totalVisible } = useRenderRows();

  return useMemo(() => {
    const onTabulator = tabluarPrefixes.some((prefix) => pathname.startsWith(prefix));
    if (!onTabulator || totalVisible <= TABULATOR_RENDER_CAP) {
      return '';
    }
    const totalPages = Math.ceil(totalVisible / TABULATOR_RENDER_CAP);
    const currentPage = Math.floor(renderOffset / TABULATOR_RENDER_CAP) + 1;
    return ` (${currentPage} - ${totalPages})`;
  }, [pathname, renderOffset, totalVisible]);
}
