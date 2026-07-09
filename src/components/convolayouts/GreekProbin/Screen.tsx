import Records from "./Records";
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Handler } from "../../../store/slices/errorSlice";
import {
  toggleLookUp,
  resetSelected,
  commandSelected,
  idToggled,
  ancestorSelected,
  descendentSelected,
  SelectPayload,
  IdToggledPayload,
  CommandSelectedPayload,
} from "../../../store/slices/sidebarSlice";
import { setParentGroups as _setParentGroups } from "../../../store/slices/responseSlice";
import Sidebar from "./SideBar";
import { Tree, getEntity, capitalizeFirstLetter, orderEntitiesRootToLeafForWebapp } from "../../../utils";
import { RootState } from "../../../store/types";
import { LinkState } from "../../../Hooks/useControlPanel/useSidebar";
import * as styles from '../../../styles/cpanel.module.css';
import { InitLoadingPayload } from "../../../library/actions";
import { CpanelRow } from "../../Core/types";

const styleProps = {
  selected: styles["selected"],
  geekProbin: styles["geekProbin"],
  mainContent: styles["main-content"],
  contentGridOne: styles["content-grid-one"],
  mainContentHolder: styles["main-content-holder"],
}

interface EntityConnection {
  connections: string[];
  label: string;
}

export interface TraversalState {
  to: string | null;
  selectedIds: number[];
  from: string | null;
}

interface ExpandableState {
  id: number;
  isExpandable: boolean;
}

interface ScreenProps {
  webapp: string;
  defaultTake: number;
  setWebApp: (app: string) => void;
  cpanelManager: (msg: InitLoadingPayload) => void;
  response: Record<string, Record<string, CpanelRow[]>>;
}

export const getEntities = (webapp: string): EntityConnection[] => {
  const entities = orderEntitiesRootToLeafForWebapp(Tree.entities, webapp)
    .map(({ name, webapps }) => ({
      connections: webapps[webapp],
      label: name,
    }))
    .filter(({ connections }) => connections?.length ?? 0 > 0);
  return entities;
};

const defaults0: ExpandableState = { id: 3, isExpandable: false };
const defaults: TraversalState = { to: null, selectedIds: [], from: null };

export const getName = (handlers: Record<string, Handler[]>, parent: string | undefined, id: number) => {
  if (!parent) return undefined;
  const from = capitalizeFirstLetter(parent);
  const pred = ({ id: k }: Handler) => k === id;
  return handlers["handles" + from]?.find(pred)?.keyword;
}

export const getNames = (handlers: Record<string, Handler[]>, parent: string | undefined) => {
  if (!parent) return [];
  const from = capitalizeFirstLetter(parent);
  return handlers["handles" + from]?.map(({ keyword }) => keyword);
}

const Screen: React.FC<ScreenProps> = ({
  webapp,
  response,
  setWebApp,
  defaultTake,
  cpanelManager,
}) => {
  const dispatch = useDispatch();
  const filter = useSelector((state: RootState) => state.sidebar.filter);
  const prefix = useSelector((state: RootState) => state.sidebar.prefix);
  const content = useSelector((state: RootState) => state.sidebar.content);
  const response_ = useSelector((state: RootState) => state.sidebar.response);
  const direction = useSelector((state: RootState) => state.sidebar.direction);
  const contentIds = useSelector((state: RootState) => state.sidebar.contentIds);
  const parentData = useSelector((state: RootState) => state.sidebar.parentData);
  const insertedRows = useSelector((state: RootState) => state.sidebar.insertedRows);
  const parentGroups = useSelector((state: RootState) => state.response.parentGroups);
  const isLookupEnabled = useSelector((state: RootState) => state.sidebar.isLookupEnabled);
  const isLookupSelected = useSelector((state: RootState) => state.sidebar.isLookupSelected);
  const isFirstSelection = useSelector((state: RootState) => state.sidebar.isFirstSelection);
  const handles = useSelector((state: RootState) => state.sidebar.handles);

  const executables = {
    filter,
    prefix,
    content,
    handles,
    direction,
    contentIds,
    parentData,
    insertedRows,
    isLookupEnabled,
    response: response_,
    isLookupSelected,
    isFirstSelection,
  };

  const [activeLinks, setActiveLinks] = useState<LinkState[]>([]);
  const [traversal, setTraversal] = useState<TraversalState>(defaults);
  const [isExpandable, setIsExpandable] = useState<ExpandableState>(defaults0);

  // Redux actions
  const setLookUp = () => dispatch(toggleLookUp());
  const setParentGroups = (groups: Record<string, CpanelRow[]>) => dispatch(_setParentGroups(groups));
  const updateTraversor = (payload: IdToggledPayload) => {
    const result = dispatch(idToggled(payload));
    // Calculate the new state values based on current state and payload
    const { id, selected } = payload;
    const { isFirstSelection, direction, contentIds = [], parentData: { IDs = [] } = {} } = executables;
    if (direction) {
      if (!isFirstSelection) {
        // This is the setter0 logic - updating parentData
        const pred = (k: string) => (k !== id.toString() ? true : false);
        const selectedIds = !selected
          ? IDs.filter(pred)
          : [...new Set([...IDs, id.toString()])];
        const cpanelmessage = `(${selectedIds.length})roots selected`;
        setTimeout(() => cpanelManager({ cpanelmessage }));
      } else {
        // This is the setter1 logic - updating contentIds
        const selectedIds = !selected
          ? contentIds.filter((key: string) => key !== id.toString())
          : [...new Set([...contentIds, id.toString()])];
        const cpanelmessage = `(${selectedIds.length})content selected`;
        setTimeout(() => cpanelManager({ cpanelmessage }));
      }
    } else {
      if (!isFirstSelection) {
        // This is the setter1 logic - updating contentIds
        const selectedIds = !selected
          ? contentIds.filter((key: string) => key !== id.toString())
          : [...new Set([...contentIds, id.toString()])];
        const cpanelmessage = `(${selectedIds.length})content selected`;
        setTimeout(() => cpanelManager({ cpanelmessage }));
      } else {
        // This is the setter0 logic - updating parentData
        const pred = (k: string) => (k !== id.toString() ? true : false);
        const selectedIds = !selected
          ? IDs.filter(pred)
          : [...new Set([...IDs, id.toString()])];
        const cpanelmessage = `(${selectedIds.length})roots selected`;
        setTimeout(() => cpanelManager({ cpanelmessage }));
      }
    }
    return result;
  };
  const action = (payload: CommandSelectedPayload) => {
    const result = dispatch(commandSelected({ ...payload }));
    // Handle reset logic after dispatch if direction changed
    const { isFilter, title } = payload;
    const direction = !isFilter ? title === "Downward" : executables.direction;
    if (direction !== executables.direction)
      setTimeout(() => onReset());
    return result;
  };
  const reset = () => {
    const result = dispatch(resetSelected());
    setTimeout(() => cpanelManager({ cpanelmessage: "selection reset" }));
    return result;
  };

  const flags0 = { isReset: true };
  const flags1 = { isReset: false };

  const setter0 = isFirstSelection
    ? (payload: SelectPayload) => {
      const result = dispatch(ancestorSelected({ ...payload, ...flags0 }));
      const { selectedIds: IDs = [] } = payload;
      const milliseconds = flags0.isReset ? 500 : 0;
      const cpanelmessage = `(${IDs.length})roots selected`;
      setTimeout(() => cpanelManager({ cpanelmessage }), milliseconds);
      if (milliseconds > 0)
        setTimeout(() => cpanelManager({ cpanelmessage: "selection reset" }));
      return result;
    }
    : (payload: SelectPayload) => {
      const result = dispatch(descendentSelected({ ...payload, ...flags1 }));
      const { selectedIds: contentIds = [] } = payload;
      const milliseconds = flags1.isReset ? 500 : 0;
      const cpanelmessage = `(${contentIds.length})content selected`;
      setTimeout(() => cpanelManager({ cpanelmessage }), milliseconds);
      if (milliseconds > 0)
        setTimeout(() => cpanelManager({ cpanelmessage: "selection reset" }));
      return result;
    };
  const setter1 = isFirstSelection
    ? (payload: SelectPayload) => {
      const result = dispatch(descendentSelected({ ...payload, ...flags0 }));
      const { selectedIds: contentIds = [] } = payload;
      const milliseconds = flags0.isReset ? 500 : 0;
      const cpanelmessage = `(${contentIds.length})content selected`;
      setTimeout(() => cpanelManager({ cpanelmessage }), milliseconds);
      if (milliseconds > 0)
        setTimeout(() => cpanelManager({ cpanelmessage: "selection reset" }));
      return result;
    }
    : (payload: SelectPayload) => {
      const result = dispatch(ancestorSelected({ ...payload, ...flags1 }));
      const { selectedIds: IDs = [] } = payload;
      const milliseconds = flags1.isReset ? 500 : 0;
      const cpanelmessage = `(${IDs.length})roots selected`;
      setTimeout(() => cpanelManager({ cpanelmessage }), milliseconds);
      if (milliseconds > 0)
        setTimeout(() => cpanelManager({ cpanelmessage: "selection reset" }));
      return result;
    };

  const setter = direction ? setter0 : setter1;

  const onReset = () => {
    setTraversal(defaults);
    setParentGroups({});
    reset();
  };
  useEffect(() => { setParentGroups({}) }, []);
  return (
    <div className={`${styleProps.geekProbin}`} >
      <Sidebar
        cpanelManager={cpanelManager}
        setActiveLinks={setActiveLinks}
        isExpandableId={isExpandable.id}
        highlighter={setIsExpandable}
        executables={executables}
        activeLinks={activeLinks}
        defaultTake={defaultTake}
        setLookUp={setLookUp}
        setWebApp={setWebApp}
        webapp={webapp}
        reset={onReset}
        action={action}
      />
      <div className={`${styleProps.mainContent}`}>
        <div className={`${styleProps.mainContentHolder}`}>
          {activeLinks
            .filter(({ isActive }) => isActive)
            .sort((a, b) => a.order - b.order)
            .map(({ connections, parent }) => {
              const isMatch0 = traversal.from === parent;
              const className = isMatch0
                ? `${styleProps.contentGridOne} ${styleProps.selected}`
                : styleProps.contentGridOne;
              return (
                <div key={parent} className={className}>
                  {connections.map((connection) => {
                    const from = getEntity(parent);
                    const to = getEntity(connection);
                    const connector = capitalizeFirstLetter(to);
                    const fetchedData = response?.[from + connector] ?? {};
                    const isMatch1 = isMatch0 && traversal.to === connection;
                    const highlighter = isMatch1 ? styleProps.selected : "";
                    return (
                      <Records
                        key={connection}
                        from={parent}
                        to={connection}
                        webapp={webapp}
                        setter={setter}
                        restart={onReset}
                        selector={setTraversal}
                        executables={executables}
                        highlighter={highlighter}
                        fetchedData={fetchedData}
                        defaultTake={defaultTake}
                        parentGroups={parentGroups}
                        cpanelManager={cpanelManager}
                        setParentGroups={setParentGroups}
                        updateTraversor={updateTraversor}
                        isExpandable={isExpandable.isExpandable}
                        fields={Tree.getProperty(to, "fields") || []}
                        connections={Tree.getProperty(to, "connections") || []}
                      />
                    );
                  })}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default Screen;
