/**
 * Comments API – comment tree paths and payload types (CommentsTreeController).
 * Base: /api/comments. All tree routes are POST.
 */

import { getBaseUrl } from '../utils';

export const COMMENTS_API_BASE = '/api/comments';

export const commentsPath = (path: string) => `${getBaseUrl()}${COMMENTS_API_BASE}${path}`;

const TREE = '/comments-tree';

/**
 * Path segments for comments-tree endpoints.
 * – viaInstructions: full tree args (filters-instructions, entrypoints: sifters-dashboards/filters/highersifters, sifters-instructions).
 * – viaDashboards / viaSifters / viaFilters: same 9 paths each; body uses ViaContent* types.
 */
export const COMMENTS_TREE_PATHS = {
  viaInstructions: {
    filtersInstructionsBosses: `/via-instructions/filters-instructions-bosses${TREE}`,
    filtersInstructionsMinions: `/via-instructions/filters-instructions-minions${TREE}`,
    filtersInstructionsUnderbosses: `/via-instructions/filters-instructions-underbosses${TREE}`,
    entrypoints: {
      siftersDashboardsBosses: `/via-instructions/sifters-dashboards-bosses${TREE}`,
      siftersDashboardsMinions: `/via-instructions/sifters-dashboards-minions${TREE}`,
      siftersDashboardsUnderbosses: `/via-instructions/sifters-dashboards-underbosses${TREE}`,
      siftersFiltersBosses: `/via-instructions/sifters-filters-bosses${TREE}`,
      siftersFiltersMinions: `/via-instructions/sifters-filters-minions${TREE}`,
      siftersFiltersUnderbosses: `/via-instructions/sifters-filters-underbosses${TREE}`,
      siftersHighersiftersBosses: `/via-instructions/sifters-highersifters-bosses${TREE}`,
      siftersHighersiftersMinions: `/via-instructions/sifters-highersifters-minions${TREE}`,
      siftersHighersiftersUnderbosses: `/via-instructions/sifters-highersifters-underbosses${TREE}`,
    },
    siftersInstructionsBosses: `/via-instructions/sifters-instructions-bosses${TREE}`,
    siftersInstructionsMinions: `/via-instructions/sifters-instructions-minions${TREE}`,
    siftersInstructionsUnderbosses: `/via-instructions/sifters-instructions-underbosses${TREE}`,
  },
  viaDashboards: {
    siftersDashboardsBosses: `/via-dashboards/sifters-dashboards-bosses${TREE}`,
    siftersDashboardsMinions: `/via-dashboards/sifters-dashboards-minions${TREE}`,
    siftersDashboardsUnderbosses: `/via-dashboards/sifters-dashboards-underbosses${TREE}`,
    siftersFiltersBosses: `/via-dashboards/sifters-filters-bosses${TREE}`,
    siftersFiltersMinions: `/via-dashboards/sifters-filters-minions${TREE}`,
    siftersFiltersUnderbosses: `/via-dashboards/sifters-filters-underbosses${TREE}`,
    siftersHighersiftersBosses: `/via-dashboards/sifters-highersifters-bosses${TREE}`,
    siftersHighersiftersMinions: `/via-dashboards/sifters-highersifters-minions${TREE}`,
    siftersHighersiftersUnderbosses: `/via-dashboards/sifters-highersifters-underbosses${TREE}`,
  },
  viaSifters: {
    siftersDashboardsBosses: `/via-sifters/sifters-dashboards-bosses${TREE}`,
    siftersDashboardsMinions: `/via-sifters/sifters-dashboards-minions${TREE}`,
    siftersDashboardsUnderbosses: `/via-sifters/sifters-dashboards-underbosses${TREE}`,
    siftersFiltersBosses: `/via-sifters/sifters-filters-bosses${TREE}`,
    siftersFiltersMinions: `/via-sifters/sifters-filters-minions${TREE}`,
    siftersFiltersUnderbosses: `/via-sifters/sifters-filters-underbosses${TREE}`,
    siftersHighersiftersBosses: `/via-sifters/sifters-highersifters-bosses${TREE}`,
    siftersHighersiftersMinions: `/via-sifters/sifters-highersifters-minions${TREE}`,
    siftersHighersiftersUnderbosses: `/via-sifters/sifters-highersifters-underbosses${TREE}`,
  },
  viaFilters: {
    siftersDashboardsBosses: `/via-filters/sifters-dashboards-bosses${TREE}`,
    siftersDashboardsMinions: `/via-filters/sifters-dashboards-minions${TREE}`,
    siftersDashboardsUnderbosses: `/via-filters/sifters-dashboards-underbosses${TREE}`,
    siftersFiltersBosses: `/via-filters/sifters-filters-bosses${TREE}`,
    siftersFiltersMinions: `/via-filters/sifters-filters-minions${TREE}`,
    siftersFiltersUnderbosses: `/via-filters/sifters-filters-underbosses${TREE}`,
    siftersHighersiftersBosses: `/via-filters/sifters-highersifters-bosses${TREE}`,
    siftersHighersiftersMinions: `/via-filters/sifters-highersifters-minions${TREE}`,
    siftersHighersiftersUnderbosses: `/via-filters/sifters-highersifters-underbosses${TREE}`,
  },
} as const;

export interface CommentContentQuery {
  take?: number | null;
  skip?: number | null;
  search?: string | null;
  isMutating?: boolean | null;
  childIds?: number[] | null;
  parentIds?: number[] | null;
  isPrivateView?: boolean | null;
}

// --- Via-instructions: filters-instructions ---

export interface FiltersInstructionsBossesTreeArgs {
  filtersInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsMinionsTreeArgs {
  filtersInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsUnderbossesTreeArgs {
  filtersInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

// --- Via-instructions: sifters-dashboards / sifters-filters / sifters-highersifters (full tree) ---

export interface SiftersDashboardsBossesTreeArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsMinionsTreeArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsUnderbossesTreeArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersBossesTreeArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersMinionsTreeArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersUnderbossesTreeArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersBossesTreeArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersMinionsTreeArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersUnderbossesTreeArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

// --- Via-instructions: sifters-instructions ---

export interface SiftersInstructionsBossesTreeArgs {
  siftersInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsMinionsTreeArgs {
  siftersInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsUnderbossesTreeArgs {
  siftersInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

// --- Via-dashboards / via-sifters / via-filters (ViaContent* in Java) ---

export interface ViaContentSiftersDashboardsBossesTreeArgs {
  siftersDashboards: CommentContentQuery;
  dashboardsBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface ViaContentSiftersDashboardsMinionsTreeArgs {
  siftersDashboards: CommentContentQuery;
  dashboardsMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface ViaContentSiftersDashboardsUnderbossesTreeArgs {
  siftersDashboards: CommentContentQuery;
  dashboardsUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface ViaContentSiftersFiltersBossesTreeArgs {
  siftersFilters: CommentContentQuery;
  filtersBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface ViaContentSiftersFiltersMinionsTreeArgs {
  siftersFilters: CommentContentQuery;
  filtersMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface ViaContentSiftersFiltersUnderbossesTreeArgs {
  siftersFilters: CommentContentQuery;
  filtersUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface ViaContentSiftersHighersiftersBossesTreeArgs {
  siftersHighersifters: CommentContentQuery;
  siftersBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface ViaContentSiftersHighersiftersMinionsTreeArgs {
  siftersHighersifters: CommentContentQuery;
  siftersMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface ViaContentSiftersHighersiftersUnderbossesTreeArgs {
  siftersHighersifters: CommentContentQuery;
  siftersUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export type CommentsTreeInstructionPayload =
  | FiltersInstructionsBossesTreeArgs
  | FiltersInstructionsMinionsTreeArgs
  | FiltersInstructionsUnderbossesTreeArgs
  | SiftersDashboardsBossesTreeArgs
  | SiftersDashboardsMinionsTreeArgs
  | SiftersDashboardsUnderbossesTreeArgs
  | SiftersFiltersBossesTreeArgs
  | SiftersFiltersMinionsTreeArgs
  | SiftersFiltersUnderbossesTreeArgs
  | SiftersHighersiftersBossesTreeArgs
  | SiftersHighersiftersMinionsTreeArgs
  | SiftersHighersiftersUnderbossesTreeArgs
  | SiftersInstructionsBossesTreeArgs
  | SiftersInstructionsMinionsTreeArgs
  | SiftersInstructionsUnderbossesTreeArgs;

export type CommentsViaContentTreePayload =
  | ViaContentSiftersDashboardsBossesTreeArgs
  | ViaContentSiftersDashboardsMinionsTreeArgs
  | ViaContentSiftersDashboardsUnderbossesTreeArgs
  | ViaContentSiftersFiltersBossesTreeArgs
  | ViaContentSiftersFiltersMinionsTreeArgs
  | ViaContentSiftersFiltersUnderbossesTreeArgs
  | ViaContentSiftersHighersiftersBossesTreeArgs
  | ViaContentSiftersHighersiftersMinionsTreeArgs
  | ViaContentSiftersHighersiftersUnderbossesTreeArgs;

export type CommentsTreePayload = CommentsTreeInstructionPayload | CommentsViaContentTreePayload;

type ViaInstructionsTreePaths =
  | (typeof COMMENTS_TREE_PATHS.viaInstructions.entrypoints)[keyof typeof COMMENTS_TREE_PATHS.viaInstructions.entrypoints]
  | (Omit<typeof COMMENTS_TREE_PATHS.viaInstructions, 'entrypoints'>)[keyof Omit<
      typeof COMMENTS_TREE_PATHS.viaInstructions,
      'entrypoints'
    >];

export type CommentsTreePath =
  | ViaInstructionsTreePaths
  | (typeof COMMENTS_TREE_PATHS.viaDashboards)[keyof typeof COMMENTS_TREE_PATHS.viaDashboards]
  | (typeof COMMENTS_TREE_PATHS.viaSifters)[keyof typeof COMMENTS_TREE_PATHS.viaSifters]
  | (typeof COMMENTS_TREE_PATHS.viaFilters)[keyof typeof COMMENTS_TREE_PATHS.viaFilters];
