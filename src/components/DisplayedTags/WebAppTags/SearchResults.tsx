import React from 'react';
import Badge from 'react-bootstrap/Badge';
import ListGroup from 'react-bootstrap/ListGroup';
import { useDispatch, useSelector } from 'react-redux';
import { Route, setSelectedRoute } from '../../../store/slices/searchSlice';
import { setPagedRoute } from '../../../store/slices/paginationSlice';
import { getCurAppName, getRouteAlias } from '../../../utils';
import useQueryMedia from '../../../Hooks/useQueryMedia';

interface SearchResultsProps {
  routes: Record<string, Route>;
  selectedTraversal?: string;
  isLoading?: boolean;
}

interface SessionRootState {
  session: { curApp: number };
}

const SELECTED_BG = '#f0f0f0';

const MAX_GROUPS = 3;

// Screen indices from useQueryMedia: 0:Mobile 1:Phablet 2:Tablet 3:Small 4:14Inch 5:15Inch 6:DeskTop
const getGroupCount = (screen: number): number => {
  if (screen < 3) return 1;
  if (screen < 5) return 2;
  return MAX_GROUPS;
};

// Splits items into `groupCount` near-even buckets; any remainder is absorbed by the first group.
const splitIntoGroups = <T,>(items: T[], groupCount: number): T[][] => {
  const groups: T[][] = Array.from({ length: groupCount }, () => []);
  if (groupCount <= 0 || items.length === 0) return groups;

  const base = Math.floor(items.length / groupCount);
  const remainder = items.length % groupCount;

  let idx = 0;
  for (let g = 0; g < groupCount; g++) {
    const size = base + (g === 0 ? remainder : 0);
    for (let i = 0; i < size; i++, idx++) {
      groups[g].push(items[idx]);
    }
  }
  return groups;
};

type RouteEntry = [string, Route];

const buildRenderItem =
  (
    curAppName: string,
    selectedTraversal: string | undefined,
    isLoading: boolean,
    onSelect: (key: string, route: Route) => void,
  ) =>
  ([key, values]: RouteEntry) => {
    const { to, from, keywords, count } = values;
    const route = getRouteAlias((from ?? '') + (to ?? ''), curAppName);
    const selected = !!selectedTraversal && key === selectedTraversal;
    const clickable = !selected && !isLoading;
    const keywordBadgeBg = selected ? 'success' : 'primary';
    const routeBadgeBg = selected ? 'success' : 'secondary';
    const itemStyle: React.CSSProperties = {
      ...(selected ? { backgroundColor: SELECTED_BG } : {}),
      ...(clickable ? { cursor: 'pointer' } : {}),
    };
    const handleClick = clickable ? () => onSelect(key, values) : undefined;
    return (
      <ListGroup.Item
        as="li"
        key={key}
        style={itemStyle}
        onClick={handleClick}
        className="d-flex justify-content-between align-items-start"
      >
        <div>
          <div>
            <span className="me-3"> {route}</span>
            <Badge pill bg={routeBadgeBg}>
              {count}
            </Badge>
          </div>
          {keywords.map(({ keyword, count }, i) => (
            <div key={i}>
              <span className="mr-3">{keyword}</span>
              <Badge pill bg={keywordBadgeBg}>
                {count}
              </Badge>
            </div>
          ))}
        </div>
      </ListGroup.Item>
    );
  };

const SearchResults: React.FC<SearchResultsProps> = ({
  routes,
  selectedTraversal,
  isLoading = false,
}) => {
  const dispatch = useDispatch();
  const { screen } = useQueryMedia();
  const curApp = useSelector((state: SessionRootState) => state.session.curApp);
  const curAppName = getCurAppName(curApp);
  const handleSelect = (key: string, route: Route) => {
    dispatch(setPagedRoute(key));
    dispatch(setSelectedRoute({
      traversal: key,
      keywords: route.keywords,
      index: route.index,
    }));
  };
  const renderItem = buildRenderItem(curAppName, selectedTraversal, isLoading, handleSelect);
  const entries = Object.entries(routes) as RouteEntry[];

  const desiredGroups = getGroupCount(screen);
  const groupCount = Math.min(desiredGroups, Math.max(1, entries.length));
  const groups = splitIntoGroups(entries, groupCount);

  if (groupCount === 1) {
    return <ListGroup as="ol">{groups[0].map(renderItem)}</ListGroup>;
  }

  return (
    <div className="d-flex flex-row gap-3 align-items-start">
      {groups.map((group, gIdx) => (
        <ListGroup as="ol" key={gIdx} className="flex-fill">
          {group.map(renderItem)}
        </ListGroup>
      ))}
    </div>
  );
};

export default SearchResults;
