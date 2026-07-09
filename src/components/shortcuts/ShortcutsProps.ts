import type { clearFetchedPayload } from '../../library/actions';

export interface ShortcutsProps {
  convCss: string;
  loading: boolean;
  formatter?: string;
  skeletons: boolean;
  saver?: () => void;
}``

export interface FullShortcutsProps {
  convCss: string;
  loading: boolean;
  formatter?: string;
  saver?: () => void;
}

export interface PartialShortcutsProps {
  convCss: string;
  skeletons: boolean;
  formatter?: string;
  loading: boolean;
}

export interface ShortcutStyles {
  shortcut: string;
  [key: string]: string;
  'shortcut-Container': string;
}

export interface NavigationProps {
  webapp: number;
  convCss: string;
  senderIndex: number;
  clearData: () => void;
  clearTabulator: () => void;
  encodedDatas: Record<string, string>;
  styles: ShortcutStyles;
}

export interface PartialNavigationProps {
  isUnzipCourses: boolean;
  isUnzipQuizzes: boolean;
  isUnzipTutorials: boolean;
  convCss: string;
  styles: ShortcutStyles;
}

export interface PartialAccountProps {
  webapp: string;
  convCss: string;
  formatter?: string;
  loading: boolean;
  authenticated: boolean;
  handleSignOut: (redirectUrl?: string) => void;
  showError: (error: string | null) => void;
  isNotUnzipping: boolean;
  isNotSkeletons: boolean;
  skeletons: boolean;
  styles: ShortcutStyles;
}

export interface FullAccountProps {
  webapp: string;
  convCss: string;
  saver?: () => void;
  formatter?: string;
  clearData: () => void;
  IsProcessing: boolean;
  authenticated: boolean;
  handleSignOut: (redirectUrl?: string) => void;
  entity: string | undefined;
  dismissals: Record<string, boolean>;
  setIsOpen: (isOpen: boolean) => void;
  selectall: (pathname: string) => void;
  unSelectall: (pathname: string) => void;
  showError: (error: string | null) => void;
  saveRows: (entity: string | undefined) => void;
  saveContent: (entity: string | undefined) => void;
  clearDismissed: (params: clearFetchedPayload) => void;
  clearSelections: (pathname: string) => void;
  toggleDismissed: (pathname: string) => void;
  invertSelections: (pathname: string) => void;
  isNotUnzipping: boolean;
  loading: boolean;
  styles: ShortcutStyles;
}
