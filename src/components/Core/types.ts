export interface BaseEntityData {
  metadata: Metadata;
  status: number;
  id: string;
  sizeInBytes: number;
  descendentsSums: Record<string, number>;
}

export interface BaseFormattedData<T = EntityTextProperties> {
  texts: DataRow[] & Partial<T>;
}

// Common text properties that entities can extend
export interface BaseTextProperties {
  id: string;
  modified: boolean;
}

// Entity-specific text properties
export interface BossTextProperties extends BaseTextProperties {
  password: string;
}

export interface UnderbossTextProperties extends BaseTextProperties {
  password: string;
}

export interface MinionTextProperties extends BaseTextProperties {
  password: string;
}

export type EntityTextProperties =
  | BossTextProperties
  | UnderbossTextProperties
  | MinionTextProperties

// Improved BaseFormattedData that can handle entity-specific text properties
export interface BaseFormattedData<T = EntityTextProperties> {
  texts: DataRow[] & Partial<T>;
}


/** Server-assigned IDs are positive; local IDs are zero or negative. */
export const isServerId = (id: DataRow['id']): boolean => Number(id) > 0;

export interface Metadata {
  owner: boolean;
  ordinal?: number;
  interaction?: boolean;
  communications?: string;
  instructionId?: number;
  foundationId?: (string | number)[];
  bossId?: (string | number)[] | number;
  minionId?: (string | number)[] | number;
  filterId?: (string | number)[] | number;
  sifterId?: (string | number)[] | number;
  dashboardId?: (string | number)[] | number;
  underbossId?: (string | number)[] | number;
  lowersifterId?: (string | number)[] | number;
  highersifterId?: (string | number)[] | number;
}

export type DataRow = TabulatorProps & DatabaseTableProps;

export interface TabulatorProps {
  metadata?: Metadata;
  index?: number;
  order?: number;
  checked?: boolean;
  frozen?: boolean;
  password?: string;
  modified?: boolean;
  keywords?: string[];
  deleted?: boolean;
  reordered?: boolean;
  stated?: boolean;
  type?: string;
}

export interface DatabaseTableProps {
  descendentsSums: Record<string, number>;
  status?: number;
  id: number | string;
  sizeInBytes: number;
  filter?: string;
  sifter?: string;
  dashboard?: string;
  instruction?: string;
  underboss?: string;
  boss?: string;
  minion?: string;
  details?: string;
  imageurl?: string;
  username?: string;
  email?: string;
  purpose?: string;
}
