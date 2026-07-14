import {
  states,
  incrementID,
  sumsFormatter,
  textFieldsExtractor,
} from "../../utils";
import {
  BaseEntity,
  BaseFormattedData,
  BaseNonFormattedData,
  BaseForm,
  MenuItem,
  DataRow, MockedDataReturn, SifterTextProperties,
  Metadata,
} from "./types";
import * as styles from "../../styles/ContraintsCss.module.css";
import * as descendantsWrapper from "../../styles/descendantsWrapper.module.css";
import * as orderAndActions from "../../styles/orderAndActions.module.css";
import { Status } from "../../store/slices/actionSlice";
import { BannerInput } from "../../library/RowMockingUtils";

interface Sifter extends BaseEntity {
  form: BaseForm;
  lowermenu: MenuItem[];
  highermenu: MenuItem[];
  nonFormattedData: (sifters: DataRow[]) => Array<BaseNonFormattedData>;
  mockedData: (metadatas: BannerInput[] | Metadata[], connections: string[]) => MockedDataReturn;
  formattedData: (sifters: DataRow[], connections: string[]) => BaseFormattedData<SifterTextProperties>;
}

const Sifter: Sifter = {
  name: "sifters",
  menu: [],
  lowermenu: [],
  highermenu: [],
  unlocked: [],
  webapps: {
    tutors: [],
    tutorial: [],
    outgoing: [],
    incoming: [],
    quiz: ["filters", "instructions"],
    course: ["filters", "instructions"],
    cpanel: [
      "bosses",
      "minions",
      "filters",
      "dashboards",
      "underbosses",
      "instructions",
      "lowersifters",
      "highersifters",
    ],
  },
  fields: ["sifter", "purpose"],
  form: {
    textInputs: [
      {
        maxlength: 50,
        name: "sifter",
        label: "TagName",
      },
    ],
    textAreas: [
      {
        name: "purpose",
        label: "purpose",
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
    instructionshighersifters: ["instructions", "highersifters"],
    filtersdashboards: ["filters", "dashboards"],
    underbossesminions: ["underbosses", "minions"],
    lowersiftersbosses: ["lowersifters", "bosses"],
  },
  columns: [
    { instructionshighersifters: `${descendantsWrapper["ProgramsCourses"]} ${descendantsWrapper["Qaurtet"]}` },
    { filtersdashboards: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
    { underbossesminions: `${descendantsWrapper["ProgramsCourses"]} ${descendantsWrapper["Qaurtet"]}` },
    { lowersiftersbosses: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
  ],
  private: [
    { lowersiftersbosses: `${descendantsWrapper["SnapshotsNotes"]}` },
    { FlexTable: `${orderAndActions["FlexTablePlusActions"]} Compact` },
    { entityName: "Sifter" },
  ],
  anonymous: [{ entityName: "Sifter" }],
  prefixLen: { private: 2, public: 2, anonymous: 1 },
  public: [{ Actions: "Options" }, { entityName: "Sifter" }],
  constraints: { At1920: 3, At1536: 3, At1440: 3, At992: 2 },
  CSS: () => styles["sifter"],
  descendents: null,
  connections: [
    "bosses",
    "minions",
    "filters",
    "dashboards",
    "underbosses",
    "instructions",
    "lowersifters",
    "highersifters",
  ],
  mockedData: (metadatas: BannerInput[] | Metadata[], connections: string[]) =>
    metadatas.map((metadata: BannerInput | Metadata) => ({
      metadata,
      status: 0,
      purpose: '.',
      sizeInBytes: 0.0,
      sifter: new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" }),
      id: incrementID().toString(),
      descendentsSums: connections.reduce(
        (obj, key) => ({ ...obj, [key]: 0 }),
        {}
      ),
    })),
  nonFormattedData: (sifters: DataRow[]) =>
    sifters.map((sifter: DataRow) => ({
      ...sifter,
      id: parseInt(sifter.id.toString()),
      checked: sifter.checked ?? false,
      frozen: sifter.frozen ?? false,
    })),
  formattedData: (sifters: DataRow[], connections: string[]) => ({
    descendents: connections.map(sumsFormatter(sifters)),
    statuses: sifters.map((sifter) => ({
      status: !sifter.status?.hasOwnProperty("initial")
        ? {
          initial: 0,
          owner: sifter.metadata?.owner,
          current: typeof sifter.status === 'number' ? sifter.status : (sifter.status as Status).current,
        }
        : { ...sifter.status as Status },
      id: sifter.id.toString(),
      modified: sifter.stated ?? false,
    })),
    rows: sifters.map((sifter, i) => ({
      modified: sifter.reordered ?? false,
      deleted: sifter.deleted ?? false,
      checked: sifter.checked ?? false,
      frozen: sifter.frozen ?? false,
      id: sifter.id.toString(),
      order: i,
      index: i,
    })),
    texts: sifters.map((sifter) => ({
      ...textFieldsExtractor(sifter),
      id: sifter.id.toString(),
      modified: sifter.modified ?? false,
      password: sifter.password ?? "!@#$$%^^&&**((",
    })),
  }),
};

export default Sifter; 