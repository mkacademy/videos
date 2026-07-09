import {
  incrementID,
  sumsFormatter,
  textFieldsExtractor,
  states,
} from "../../utils";
import minionMenu from "../Menus/Minion";
import {
  BaseEntity,
  BaseFormattedData,
  BaseNonFormattedData,
  DataRow,
  MinionTextProperties,
  MockedDataReturn,
  UserForm,
  Metadata,
} from "../Core/types";
import * as styles from "../../styles/ContraintsCss.module.css";
import * as descendantsWrapper from "../../styles/descendantsWrapper.module.css";
import * as orderAndActions from "../../styles/orderAndActions.module.css";
import { Status } from "../../store/slices/actionSlice";
import { UserMockInput } from "../../library/RowMockingUtils";

interface Minion extends BaseEntity {
  form: UserForm;
  nonFormattedData: (minions: DataRow[]) => Array<BaseNonFormattedData>;
  mockedData: (metadatas: UserMockInput[] | Metadata[], connections: string[]) => MockedDataReturn;
  formattedData: (minions: DataRow[], connections: string[]) => BaseFormattedData<MinionTextProperties>;
}

const Minion: Minion = {
  name: "minions",
  menu: minionMenu,
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
      "filters",
      "dashboards",
      "underbosses",
      "instructions",
    ],
    outgoing: ["instructions", "filters", "sifters", "dashboards"],
  },
  fields: ["password", "email", "minion"],
  form: {
    emailInputs: [
      {
        name: "email",
        label: "Email",
      },
    ],
    textInputs: [
      {
        name: "minion",
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
    filtersunderbosses: ["filters", "underbosses"],
    dashboardsbosses: ["dashboards", "bosses"],
    siftersinstructions: ["sifters", "instructions"],
  },
  columns: [
    { filtersunderbosses: `${descendantsWrapper["ProgramsCourses"]} ${descendantsWrapper["Qaurtet"]}` },
    { dashboardsbosses: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
    { siftersinstructions: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
  ],
  private: [
    { siftersinstructions: `${descendantsWrapper["SnapshotsNotes"]}` },
    { FlexTable: `${orderAndActions["FlexTablePlusActions"]} Compact` },
    { entityName: "Minion" },
  ],
  anonymous: [{ entityName: "Minion" }],
  prefixLen: { private: 2, public: 2, anonymous: 1 },
  public: [{ Actions: "Options" }, { entityName: "Minion" }],
  constraints: { At1920: 3, At1536: 3, At1440: 3, At992: 2 },
  CSS: () => styles["minion"],
  descendents: null,
  connections: [
    "bosses",
    "sifters",
    "filters",
    "dashboards",
    "underbosses",
    "instructions",
  ],
  mockedData: (metadatas: UserMockInput[] | Metadata[], connections: string[]) =>
    metadatas.map((metadata: UserMockInput | Metadata) => ({
      metadata,
      status: 0,
      sizeInBytes: 0.0,
      email: "x@mail.com",
      password: "!@#$$%^^&&**((",
      minion: new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" }),
      id: incrementID().toString(),
      descendentsSums: connections.reduce(
        (obj, key) => ({ ...obj, [key]: 0 }),
        {}
      ),
    })),
  nonFormattedData: (minions: DataRow[]) =>
    minions.map((minion: DataRow) => ({
      ...minion,
      id: parseInt(minion.id.toString()),
      checked: minion.checked ?? false,
      frozen: minion.frozen ?? false,
    })),
  formattedData: (minions: DataRow[], connections: string[]) => ({
    descendents: connections.map(sumsFormatter(minions)),
    statuses: minions.map((minion) => ({
      status: !minion.status?.hasOwnProperty("initial")
        ? {
          initial: 0,
          owner: minion.metadata?.owner,
          current: typeof minion.status === 'number' ? minion.status : (minion.status as Status).current,
        }
        : { ...minion.status as Status },
      id: minion.id.toString(),
      modified: minion.stated ?? false,
    })),
    rows: minions.map((minion, i) => ({
      modified: minion.reordered ?? false,
      deleted: minion.deleted ?? false,
      checked: minion.checked ?? false,
      frozen: minion.frozen ?? false,
      id: minion.id.toString(),
      order: i,
      index: i,
    })),
    texts: minions.map((minion) => ({
      ...textFieldsExtractor(minion),
      id: minion.id.toString(),
      modified: minion.modified ?? false,
      password: minion.password ?? "!@#$$%^^&&**((",
    })),
  }),
};

export default Minion; 