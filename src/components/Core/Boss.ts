import {
  states,
  incrementID,
  sumsFormatter,
  textFieldsExtractor,
} from "../../utils";
import bossMenu from "../Menus/Boss";
import {
  BaseEntity,
  BaseFormattedData,
  BaseNonFormattedData,
  DataRow,
  UserForm,
  MockedDataReturn,
  BossTextProperties,
  Metadata,
} from "../Core/types";
import * as styles from "../../styles/ContraintsCss.module.css";
import * as descendantsWrapper from "../../styles/descendantsWrapper.module.css";
import * as orderAndActions from "../../styles/orderAndActions.module.css";
import { Status } from "../../store/slices/actionSlice";
import { UserMockInput } from "../../library/RowMockingUtils";


interface Boss extends BaseEntity {
  form: UserForm;
  nonFormattedData: (bosses: DataRow[]) => Array<BaseNonFormattedData>;
  mockedData: (metadatas: UserMockInput[] | Metadata[], connections: string[]) => MockedDataReturn;
  formattedData: (bosses: DataRow[], connections: string[]) => BaseFormattedData<BossTextProperties>;
}

const Boss: Boss = {
  name: "bosses",
  menu: bossMenu,
  unlocked: [],
  webapps: {
    tutorial: [],
    incoming: [],
    course: [],
    tutors: [],
    quiz: [],
    cpanel: [
      "sifters",
      "minions",
      "filters",
      "dashboards",
      "milestones",
      "underbosses",
      "instructions",
    ],
    outgoing: ["instructions", "filters", "sifters", "dashboards"],
  },
  fields: ["password", "email", "boss"],
  form: {
    textAreas: [],
    emailInputs: [
      {
        name: "email",
        label: "Email",
      },
    ],
    textInputs: [
      {
        name: "boss",
        label: "Username",
      },
    ],
    passInputs: [
      {
        name: "password",
        label: "Password",
      },
    ],
    dropDowns: [
      {
        name: "modified",
        label: "actions",
        options: states.map((key: string, i: number) => ({
          text: key,
          value: i,
        })),
      },
    ],
  },
  ordinals: {
    instructionsunderbosses: ["instructions", "underbosses"],
    dashboardsfilters: ["dashboards", "filters"],
    siftersminions: ["sifters", "minions"],
  },
  columns: [
    { instructionsunderbosses: `${descendantsWrapper["ProgramsCourses"]} ${descendantsWrapper["Qaurtet"]}` },
    { dashboardsfilters: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
    { siftersminions: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
  ],
  private: [
    { siftersminions: `${descendantsWrapper["SnapshotsNotes"]}` },
    { FlexTable: `${orderAndActions["FlexTablePlusActions"]} Compact` },
    { entityName: "Boss" },
  ],
  anonymous: [{ entityName: "Boss" }],
  prefixLen: { private: 2, public: 2, anonymous: 1 },
  public: [{ Actions: "Options" }, { entityName: "Boss" }],
  constraints: { At1920: 3, At1536: 3, At1440: 3, At992: 2 },
  CSS: () => styles["boss"],
  descendents: null,
  connections: [
    "sifters",
    "minions",
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
      boss: new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" }),
      id: incrementID().toString(),
      descendentsSums: connections.reduce(
        (obj, key) => ({ ...obj, [key]: 0 }),
        {}
      ),
    })),
  nonFormattedData: (bosses: DataRow[]) =>
    bosses.map((boss) => ({
      ...boss,
      id: parseInt(boss.id.toString()),
      checked: boss.checked ?? false,
      frozen: boss.frozen ?? false,
    })),
  formattedData: (bosses: DataRow[], connections: string[]) => ({
    descendents: connections.map(sumsFormatter(bosses)),
    statuses: bosses.map((boss) => ({
      status: !boss.status?.hasOwnProperty("initial")
        ? {
          initial: 0,
          owner: boss.metadata?.owner,
          current: typeof boss.status === 'number' ? boss.status : (boss.status as Status).current,
        }
        : { ...boss.status as Status },
      id: boss.id.toString(),
      modified: boss.stated ?? false,
    })),
    rows: bosses.map((boss, i) => ({
      modified: boss.reordered ?? false,
      deleted: boss.deleted ?? false,
      checked: boss.checked ?? false,
      frozen: boss.frozen ?? false,
      id: boss.id.toString(),
      order: i,
      index: i,
    })),
    texts: bosses.map((boss) => ({
      ...textFieldsExtractor(boss),
      id: boss.id.toString(),
      modified: boss.modified ?? false,
      password: boss.password ?? "!@#$$%^^&&**((",
    })),
  }),
};

export default Boss; 