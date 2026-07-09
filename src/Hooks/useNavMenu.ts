import { useEffect, useReducer } from "react";

// Action type constants
const TOGGLE_ROOTS = "toggle_roots";
const TOGGLE_HISTORY = "toggle_history";
const TOGGLE_EXPANDED = "toggle_expanded";
const RESET_NAVIGATION = "reset_navigation";
const FORWARDS_CLICKED = "forwards_clicked";
const BACKWARDS_CLICKED = "backwards_clicked";

// State interface
interface NavMenuState {
  roots: boolean;
  lenOfMenus: number;
  history: boolean;
  expanded: boolean;
  curMenuIndex: number;
}

// Action interfaces
interface ToggleRootsAction {
  type: typeof TOGGLE_ROOTS;
  payload: boolean;
}

interface ToggleHistoryAction {
  type: typeof TOGGLE_HISTORY;
  payload: boolean;
}

interface ToggleExpandedAction {
  type: typeof TOGGLE_EXPANDED;
  payload: boolean;
}

interface ResetNavigationAction {
  type: typeof RESET_NAVIGATION;
  payload: Partial<NavMenuState>;
}

interface ForwardsClickedAction {
  type: typeof FORWARDS_CLICKED;
}

interface BackwardsClickedAction {
  type: typeof BACKWARDS_CLICKED;
}

type NavMenuAction = 
  | ToggleRootsAction 
  | ToggleHistoryAction 
  | ToggleExpandedAction 
  | ResetNavigationAction 
  | ForwardsClickedAction 
  | BackwardsClickedAction;

// Initial state
const initialState: NavMenuState = {
  roots: false,
  lenOfMenus: 1,
  history: false,
  expanded: false,
  curMenuIndex: 0,
};

// Action creators
const actions = {
  setDropDownVisibility: (payload: boolean): ToggleExpandedAction => ({
    type: TOGGLE_EXPANDED,
    payload: payload,
  }),
  setHistoryVisibility: (payload: boolean): ToggleHistoryAction => ({
    type: TOGGLE_HISTORY,
    payload: payload,
  }),
  setRootsVisibility: (payload: boolean): ToggleRootsAction => ({
    type: TOGGLE_ROOTS,
    payload: payload,
  }),
  restNavigation: (payload: Partial<NavMenuState>): ResetNavigationAction => ({
    type: RESET_NAVIGATION,
    payload: payload,
  }),
  nextClicked: (): ForwardsClickedAction => ({
    type: FORWARDS_CLICKED,
  }),
  prevClicked: (): BackwardsClickedAction => ({
    type: BACKWARDS_CLICKED,
  }),
};

// Reducer function
const navReducer = (state: NavMenuState, action: NavMenuAction): NavMenuState => {
  switch (action.type) {
    case RESET_NAVIGATION:
      return { ...state, ...action.payload };
    case TOGGLE_ROOTS:
      return { ...state, roots: action.payload };
    case TOGGLE_HISTORY:
      return { ...state, history: action.payload };
    case TOGGLE_EXPANDED:
      return { ...state, expanded: action.payload };
    case BACKWARDS_CLICKED:
      return { ...state, curMenuIndex: state.curMenuIndex - 1 };
    case FORWARDS_CLICKED:
      return { ...state, curMenuIndex: state.curMenuIndex + 1 };
    default:
      return state;
  }
};

// Hook parameters interface
interface UseNavMenuParams {
  spread: number;
  pickedIndex: number;
  navigateMenu: (index: number) => void;
}

// Hook return type interface
interface UseNavMenuReturn {
  roots: boolean;
  history: boolean;
  expanded: boolean;
  backDisable: boolean;
  nextDisable: boolean;
  setExpanded: (payload: boolean) => void;
  showRoots: (payload: boolean) => void;
  showHistory: (payload: boolean) => void;
  nextClicked: () => void;
  prevClicked: () => void;
}

// Custom hook
export default function useNavMenu({ spread, pickedIndex, navigateMenu }: UseNavMenuParams): UseNavMenuReturn {
  const {
    setDropDownVisibility,
    setHistoryVisibility,
    setRootsVisibility,
    restNavigation,
    nextClicked,
    prevClicked,
  } = actions;
  
  const [state, dispatch] = useReducer(navReducer, initialState);
  const { roots, expanded, history, lenOfMenus, curMenuIndex } = state;
  
  useEffect(() => {
    const payload = { lenOfMenus: spread, curMenuIndex: pickedIndex };
    dispatch(restNavigation(payload));
  }, [spread, pickedIndex, restNavigation]);
  
  const backDisable = curMenuIndex - 1 < 0;
  const nextDisable = curMenuIndex + 1 > lenOfMenus - 1;
  
  const setExpanded = (payload: boolean) => dispatch(setDropDownVisibility(payload));
  const setHistory = (payload: boolean) => dispatch(setHistoryVisibility(payload));
  const setRoots = (payload: boolean) => dispatch(setRootsVisibility(payload));
  
  useEffect(() => {
    navigateMenu(curMenuIndex);
  }, [curMenuIndex, navigateMenu]);

  return {
    roots,
    history,
    expanded,
    backDisable,
    nextDisable,
    setExpanded,
    showRoots: setRoots,
    showHistory: setHistory,
    nextClicked: () => dispatch(nextClicked()),
    prevClicked: () => dispatch(prevClicked()),
  };
}
