import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurAppIndex, getEntity, getSingular } from "../../utils";
import { tabluarPrefixes } from "../../constants";
import { TraversalState } from "../../components/convolayouts/GreekProbin/Screen";
import { CpanelRow } from "../../components/Core/types";
import { FilterRecordsPayload, AppendRecordsPayload, ResponseState, ShowRecordsPayload, ToggleRecordPayload } from "../../store/slices/responseSlice";
import { IdToggledPayload, SelectPayload, SidebarState } from "../../store/slices/sidebarSlice";
import { tabulateHandler } from "./useSidebar";
import { InitLoadingPayload } from "../../library/actions";

interface UseMainbarProps {
  to: string;
  from: string;
  webapp: string;
  fields: string[];
  restart: () => void;
  connections: string[];
  highlighter: string;
  defaultTake: number;
  isExpandable: boolean;
  executables: SidebarState;
  records: ResponseState['responseData'];
  fetchedData: Record<string, CpanelRow[]>;
  setter: (payload: SelectPayload) => void;
  parentGroups: Record<string, CpanelRow[]>;
  launchAlgorithm: (payload: string) => void;
  showData: (payload: ShowRecordsPayload) => void;
  cpanelManager: (msg: InitLoadingPayload) => void;
  toggleRow: (payload: ToggleRecordPayload) => void;
  appendData: (payload: AppendRecordsPayload) => void;
  filterData: (payload: FilterRecordsPayload) => void;
  updateTraversor: (payload: IdToggledPayload) => void;
  selector: (callback: (prev: TraversalState) => TraversalState) => void;
}

interface UseMainbarReturn {
  to: string;
  from: string;
  topField: string;
  rows: CpanelRow[];
  highlighter: string;
  isExpandable: boolean;
  connections: string[];
  fieldNames: string[];
  clearer: (e: React.MouseEvent) => void;
  outliner: (e: React.MouseEvent) => void;
  tabulator: (e: React.MouseEvent) => void;
  iDselector: (id: number, selected: boolean) => void;
}

export const useMainbar = ({
  to,
  from,
  webapp,
  fields,
  setter,
  restart,
  records,
  selector,
  showData,
  toggleRow,
  appendData,
  filterData,
  connections,
  fetchedData,
  highlighter,
  defaultTake,
  executables,
  isExpandable,
  parentGroups,
  cpanelManager,
  updateTraversor,
  launchAlgorithm,
}: UseMainbarProps): UseMainbarReturn => {
  const navigate = useNavigate();
  const parent = getEntity(from);
  const connection = getEntity(to);
  const { pathname } = useLocation();
  const [curApp] = getCurAppIndex(webapp);
  const singular = getSingular(connection);
  const key = webapp + "_" + parent + connection;
  const selectedRoute = key;
  const rows = records[key]?.visibles ?? [];
  const topField = fields.find((field: string) => field === singular) ?? "";
  const fieldNames = fields.filter((field: string) => field !== topField);

  useEffect(() => {
    setTimeout(() => appendData({ fetchedData, to: connection, from: parent, webapp }));
  }, [fetchedData, connection, parent, webapp]);

  useEffect(() => {
    if (executables.isLookupSelected)
      showData({
        from: parent,
        to: connection,
        coParents: parentGroups,
        isSelected: highlighter !== "",
      });
  }, [
    executables.isLookupSelected,
    parentGroups,
    highlighter,
    connection,
    parent,
  ]);

  useEffect(() => {
    if (executables.isLookupSelected)
      filterData({
        selectedRoute,
        ...executables,
        parentData: {
          ...executables.parentData,
          parent: executables.parentData.parent || "",
        },
        isSelected: highlighter !== "",
      });
  }, [executables, highlighter, selectedRoute]);

  useEffect(() => {
    if (!executables.isLookupSelected)
      showData({
        isSelected: highlighter !== "",
        to: connection,
        coParents: {},
        from: parent,
      });
  }, [executables.isLookupSelected, highlighter, connection, parent]);

  const clearer = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    restart();
  };

  const outliner = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    selector((prev: TraversalState) => {
      const selected = rows.filter((row: CpanelRow) => row.isOpen);
      const selectedIds = selected.map((row: CpanelRow) => Number(row.id));
      const newState = { ...prev, from, to, selectedIds };
      const setterPayload = { ...newState, selected, selectedIds: selectedIds.map(String) };
      setTimeout(() => setter(setterPayload));
      return newState;
    });
  };

  const tabulator = (e: React.MouseEvent) => {
    e.preventDefault();
    launchAlgorithm(pathname);
    const spread = tabulateHandler({
      webapp,
      defaultTake,
      reset: restart,
      cpanelManager,
      executables: {
        content: to,
        prefix: tabluarPrefixes[0],
        insertedRows: rows.filter((row: CpanelRow) => row.isOpen),
        parentData: { curApp: parseInt(curApp || "0"), IDs: [], parent: from },
        contentIds: rows.filter((row: CpanelRow) => row.isOpen).map((row: CpanelRow) => row.id.toString()),
      },
    });
    if (spread?.url) navigate(spread.url);
  };

  const iDselector = (id: number, selected: boolean) => {
    const isSelectedEntity = highlighter !== "";
    if (isSelectedEntity) {
      updateTraversor({ id, selected });
      toggleRow({ to: connection, from: parent, id });
    } else toggleRow({ to: connection, from: parent, id });
  };

  return {
    to,
    rows,
    from,
    topField,
    tabulator,
    outliner,
    clearer,
    iDselector,
    highlighter,
    isExpandable,
    connections,
    fieldNames,
  };
}; 