import React, { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Buffer } from "buffer";
import { Tree as entities } from "../../../utils";
import MenuTags from "./MenuTags";
import AlertTags from "../FilterTags/Screen";
import useMediaQuery from "../../../Hooks/useQueryMedia";
import { selectTraversal, initNavigator, InitLoadingPayload } from "../../../library/actions";
import { viewPayload as escrowPayload, ParentData } from "../../../store/slices/viewSlice";
import { viewSpread } from "../../../store/slices/viewSlice";
import useScreensBuilder from "../../../Hooks/useScreensBuilder";
import { getValidParams } from "../../Pagination/TableViewPager";
import { RootState } from "../../../store/types";
import { InitNavigatorPayload } from "../../../store/middleware/NavigationTrackerEFG";
import { MenuItem } from "../../Core/types";

interface LoadingAnimationProps {
  location: Location;
  defaultTake: number;
  clearQuery: (payload: { pages: string[]; yoinks: string[] }) => void;
  navigatorPressed: (payload: InitNavigatorPayload) => void;
}
export type MenuItemWithOverrides = Omit<MenuItem, 'parentData'> & { encodedData: string; prefix: string; parentData: ParentData | undefined };
const loadingAnimation = ({
  location,
  clearQuery,
  defaultTake,
  navigatorPressed,
}: LoadingAnimationProps): React.ReactElement => {
  setTimeout(() => {
    const { pathname, search } = location;
    const splits = pathname.split("/");
    const entity = splits[splits.length - 2];
    const encodedData = splits[splits.length - 1];
    navigatorPressed({ encodedData, entity });
    const { seek, skip, take } = getValidParams(search, defaultTake);
    clearQuery({
      pages: [`${skip}-${take}`],
      yoinks: seek ? [seek] : [],
    });
  });
  return <React.Fragment />;
};

const sizes = [2, 2, 3, 8, 12, 13, 14];

const TagsScreen: React.FC = () => {
  const dispatch = useDispatch();

  // One useSelector per prop as requested
  const parent = useSelector((state: RootState) => state.view.parent);
  const prefix = useSelector((state: RootState) => state.session.prefix);
  const parentData = useSelector((state: RootState) => state.view.parentData);
  const activeIndex = useSelector((state: RootState) => state.view.selectedMenu);
  const pickedChunk = useSelector((state: RootState) => state.session.selectedMenu);
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const selectedTraversal = useSelector((state: RootState) => state.session.selectedTraversal);

  // Action dispatchers
  const setSelectedMenu = (size: number, spread: number) => {
    dispatch(viewSpread(spread));
    dispatch(selectTraversal({ menuSize: size }));
  };

  const clearQuery = (payload: { pages: string[]; yoinks: string[] }) =>
    dispatch(escrowPayload(payload));

  const setSelected = (payload: InitLoadingPayload) => dispatch(selectTraversal(payload));

  const navigatorPressed = (payload: InitNavigatorPayload) =>
    dispatch(initNavigator(payload));

  const { screen } = useMediaQuery();

  const badges = useMemo(() => {
    if (!parent) return [];
    const traversals = entities.getProperty(parent, "menu");
    const buffer = Buffer.from(JSON.stringify(parentData));
    const encodedData = buffer.toString("base64");
    const overrides = { encodedData, prefix, parentData };
    return traversals?.map((m: MenuItem, i: number) => ({ ["_" + i]: { ...m, ...overrides } })) || [];
  }, [parent, prefix, parentData]);

  const params: [number, number[], Record<string, MenuItemWithOverrides>[]] = [screen, sizes, badges];
  const [chunks, pickedIndex, selct] = useScreensBuilder(...params);

  useEffect(() => {
    if (selct && pickedChunk !== undefined) {
      selct(pickedChunk);
    }
  }, [pickedChunk, selct]);

  useEffect(() => {
    setSelectedMenu(sizes[screen], chunks.length);
  }, [screen, chunks.length, parentData?.curApp]);

  const isMobile = screen === 0;

  if (parent === undefined) {
    return loadingAnimation({
      location: window.location,
      navigatorPressed,
      defaultTake,
      clearQuery,
    });
  }

  const chunk = chunks[pickedIndex];
  const size = badges.length < sizes[screen] ? badges.length : sizes[screen];
  const objindex = pickedIndex * size + selectedTraversal;
  const traversal = chunk ? chunk["_" + objindex] : undefined;

  return traversal && chunks[activeIndex] ? (
    <MenuTags
      traversalsObj={chunks[activeIndex]}
      selectedTraversal={"_" + objindex}
      setSelected={setSelected}
      isMobile={isMobile}
    >
      <AlertTags parentData={parentData!} isMobile={isMobile} />
    </MenuTags>
  ) : (
    <React.Fragment />
  );
};

export default TagsScreen;
