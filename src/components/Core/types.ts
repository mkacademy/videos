import { PennantInput, BannerInput, RootInput, StepInput, UserMockInput } from "../../library/RowMockingUtils";
import { Row } from "../../store/slices/rowSlice";
import { ParentData } from "../../store/slices/viewSlice";

export interface WebApps {
  tutorial: string[];
  outgoing: string[];
  incoming: string[];
  course: string[];
  tutors: string[];
  quiz: string[];
  cpanel: string[];
  [key: string]: string[];
}

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

export interface Constraints {
  At1920: number;
  At1536: number;
  At1440: number;
  At992: number;
}

export interface BaseEntity {
  name: string;
  menu: MenuItem[];
  unlocked: string[];
  webapps: WebApps;
  fields: string[];
  ordinals: Record<string, string[]>;
  columns: Array<Record<string, string>>;
  private: Array<Record<string, string>>;
  anonymous: Array<Record<string, string>>;
  prefixLen: {
    private: number;
    public: number;
    anonymous: number;
  };
  public: Array<Record<string, string>>;
  constraints: Constraints;
  CSS: () => string;
  descendents: null;
  connections: string[];
}

export interface BaseEntityData {
  metadata: UserMockInput | BannerInput | PennantInput | StepInput | RootInput | Metadata;
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
  rows: Row[];
  statuses: ActionItem[];
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
  rows: Row[];
  statuses: ActionItem[];
  texts: DataRow[] & Partial<T>;
}

export interface BaseNonFormattedData {
  id: number;
  checked: boolean;
  frozen: boolean;
}


export interface MenuItem {
  from: string;
  to: string;
  search?: string;
  prefix?: string;
  parentData: ParentData;
  encodedData: string;
  fromIMG: string;
  toIMG: string;
}

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