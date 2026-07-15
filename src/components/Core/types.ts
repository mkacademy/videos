

export interface FormInput {
  name: string;
  label: string;
  maxlength?: number;
}

export interface FormDropdown extends FormInput {
  options: Array<{
    text: string;
    value: number;
  }>;
}

export interface BaseForm {
  textInputs: FormInput[];
  textAreas: FormInput[];
  dropDowns: FormDropdown[];
}

export interface UserForm extends BaseForm {
  emailInputs: FormInput[];
  passInputs: FormInput[];
}

export interface InstructionForm extends BaseForm {
  fileInputs: FormInput[];
}

export interface BaseEntityData {
  metadata: Metadata;
  status: number;
  id: string;
  sizeInBytes: number;
  descendentsSums: Record<string, number>;
}
export interface Status {
  initial: number;
  current: number;
  owner?: boolean;
}
export interface ActionItem {
  id: string;
  status: Status;
  modified?: boolean;
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

export interface SifterTextProperties extends BaseTextProperties {
  // No additional properties beyond base
}

export interface DashboardTextProperties extends BaseTextProperties {
  // No additional properties beyond base
}

export interface FilterTextProperties extends BaseTextProperties {
  // No additional properties beyond base
}

export interface InstructionTextProperties extends BaseTextProperties {
  // No additional properties beyond base
}

// Union type for all possible text properties
export type EntityTextProperties =
  | BossTextProperties
  | UnderbossTextProperties
  | MinionTextProperties
  | SifterTextProperties
  | DashboardTextProperties
  | FilterTextProperties
  | InstructionTextProperties;

// Improved BaseFormattedData that can handle entity-specific text properties
export interface BaseFormattedData<T = EntityTextProperties> {
  texts: DataRow[] & Partial<T>;
}

export interface BaseNonFormattedData {
  id: number;
  checked: boolean;
  frozen: boolean;
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
export type CpanelRow = LinkTableProps & DatabaseTableProps & { isOpen?: boolean };

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

export interface LinkTableProps {
  interaction?: boolean;
  communications?: string;
  ordinal?: number;
  source?: string;
  filterId?: number;
  sifterId?: number;
  dashboardId?: number;
  instructionId?: number;
  underbossId?: number;
  bossId?: number;
  minionId?: number;
  owner?: boolean;
}

export interface DatabaseTableProps {
  descendentsSums: Record<string, number>;
  status?: number | Status;
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

// Discriminated union type for all mockedData return types
export type MockedDataReturn =
  | Array<BaseEntityData & { purpose: string; dashboard: string; }>
  | Array<BaseEntityData & { email: string; boss: string; }>
  | Array<BaseEntityData & { email: string; underboss: string; }>
  | Array<BaseEntityData & { purpose: string; sifter: string; }>
  | Array<BaseEntityData & { email: string; minion: string; }>
  | Array<BaseEntityData & { purpose: string; filter: string; }>
  | Array<BaseEntityData & { instruction: string; details: string; imageurl: string; }>;

  export type MockedDataReturnTypes =
  | BaseEntityData & { purpose: string; dashboard: string; }
  | BaseEntityData & { email: string; boss: string; }
  | BaseEntityData & { email: string; underboss: string; }
  | BaseEntityData & { purpose: string; sifter: string; }
  | BaseEntityData & { email: string; minion: string; }
  | BaseEntityData & { purpose: string; filter: string; }
  | BaseEntityData & { instruction: string; details: string; imageurl: string; };