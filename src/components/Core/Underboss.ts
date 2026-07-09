import {
  states,
  incrementID,
  sumsFormatter,
  textFieldsExtractor,
} from "../../utils";
import underbossMenu from "../Menus/Underboss";
import {
  BaseEntity, BaseFormattedData, BaseNonFormattedData,
  UserForm,
  MenuItem,
  DataRow,
  MockedDataReturn,
  UnderbossTextProperties,
  Metadata,
} from "../Core/types";
import * as styles from "../../styles/ContraintsCss.module.css";
import * as descendantsWrapper from "../../styles/descendantsWrapper.module.css";
import * as orderAndActions from "../../styles/orderAndActions.module.css";
import { Status } from "../../store/slices/actionSlice";
import { UserMockInput } from "../../library/RowMockingUtils";

interface Underboss extends BaseEntity {
  form: UserForm;
  lowermenu: MenuItem[];
  highermenu: MenuItem[];
  nonFormattedData: (underbosses: DataRow[]) => Array<BaseNonFormattedData>;
  mockedData: (metadatas: UserMockInput[] | Metadata[], connections: string[]) => MockedDataReturn;
  formattedData: (underbosses: DataRow[], connections: string[]) => BaseFormattedData<UnderbossTextProperties>;
}

const Underboss: Underboss = {
  name: "underbosses",
  menu: underbossMenu(""),
  lowermenu: underbossMenu("lower"),
  highermenu: underbossMenu("higher"),
  unlocked: [],
  webapps: {
    tutorial: [],
    incoming: [],
    course: [],
    tutors: [],
    quiz: [],
    cpanel: [
      "bosses",
      "sifters",
      "minions",
      "filters",
      "dashboards",
      "instructions",
      "lowerunderbosses",
      "higherunderbosses",
    ],
    outgoing: ["instructions", "filters", "sifters", "dashboards"],
  },
  fields: ["password", "email", "underboss"],
  form: {
    emailInputs: [
      {
        name: "email",
        label: "Email",
      },
    ],
    textInputs: [
      {
        name: "underboss",
        label: "Username",
      },
    ],
    passInputs: [
      {
        name: "password",
        label: "Password",
      },
    ],
    textAreas: [],
    dropDowns: [
      {
        name: "modified",
        label: "actions",
        options: states.map((key, i) => ({
          text: key,
          value: i,
        })),
      },
    ],
  },
  ordinals: {
    instructionshigherunderbosses: ["instructions", "higherunderbosses"],
    filtersdashboards: ["filters", "dashboards"],
    siftersminions: ["sifters", "minions"],
    lowerunderbossesbosses: ["lowerunderbosses", "bosses"],
  },
  columns: [
    { instructionshigherunderbosses: `${descendantsWrapper["ProgramsCourses"]} ${descendantsWrapper["Qaurtet"]}` },
    { filtersdashboards: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
    { siftersminions: `${descendantsWrapper["ProgramsCourses"]} ${descendantsWrapper["Qaurtet"]}` },
    { lowerunderbossesbosses: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
  ],
  private: [
    { lowerunderbossesbosses: `${descendantsWrapper["SnapshotsNotes"]}` },
    { FlexTable: `${orderAndActions["FlexTablePlusActions"]} Compact` },
    { entityName: "Underboss" },
  ],
  anonymous: [{ entityName: "Underboss" }],
  prefixLen: { private: 2, public: 2, anonymous: 1 },
  public: [{ Actions: "Options" }, { entityName: "Underboss" }],
  constraints: { At1920: 3, At1536: 3, At1440: 3, At992: 2 },
  CSS: () => styles["underboss"],
  descendents: null,
  connections: [
    "bosses",
    "sifters",
    "minions",
    "filters",
    "dashboards",
    "instructions",
    "lowerunderbosses",
    "higherunderbosses",
  ],
  mockedData: (metadatas: UserMockInput[] | Metadata[], connections: string[]) =>
    metadatas.map((metadata: UserMockInput | Metadata) => ({
      metadata,
      status: 0,
      sizeInBytes: 0.0,
      email: "x@mail.com",
      password: "!@#$$%^^&&**((",
      underboss: new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" }),
      id: incrementID().toString(),
      descendentsSums: connections.reduce(
        (obj, key) => ({ ...obj, [key]: 0 }),
        {}
      ),
    })),
  nonFormattedData: (underbosses: DataRow[]) =>
    underbosses.map((underboss: DataRow) => ({
      ...underboss,
      id: parseInt(underboss.id.toString()),
      checked: underboss.checked ?? false,
      frozen: underboss.frozen ?? false,
    })),
  formattedData: (underbosses: DataRow[], connections: string[]) => ({
    descendents: connections.map(sumsFormatter(underbosses)),
    statuses: underbosses.map((underboss) => ({
      status: !underboss.status?.hasOwnProperty("initial")
        ? {
          initial: 0,
          owner: underboss.metadata?.owner,
          current: typeof underboss.status === 'number' ? underboss.status : (underboss.status as Status).current,
        }
        : { ...underboss.status as Status },
      id: underboss.id.toString(),
      modified: underboss.stated ?? false,
    })),
    rows: underbosses.map((underboss, i) => ({
      modified: underboss.reordered ?? false,
      deleted: underboss.deleted ?? false,
      checked: underboss.checked ?? false,
      frozen: underboss.frozen ?? false,
      id: underboss.id.toString(),
      order: i,
      index: i,
    })),
    texts: underbosses.map((underboss) => ({
      ...textFieldsExtractor(underboss),
      id: underboss.id.toString(),
      modified: underboss.modified ?? false,
      password: underboss.password ?? "!@#$$%^^&&**((",
    })),
  }),
};

export default Underboss; 