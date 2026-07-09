import {
  incrementID,
  sumsFormatter,
  textFieldsExtractor,
  states,
} from "../../utils";
import dashboardMenu from "../Menus/Dashboard";
import { BaseEntity, BaseFormattedData, BaseNonFormattedData, DataRow, MockedDataReturn, Metadata, BaseForm } from "../Core/types";
import * as styles from "../../styles/ContraintsCss.module.css";
import * as descendantsWrapper from "../../styles/descendantsWrapper.module.css";
import * as orderAndActions from "../../styles/orderAndActions.module.css";
import { Status } from "../../store/slices/actionSlice";
import { BannerInput } from "../../library/RowMockingUtils";

interface Dashboard extends BaseEntity {
  form: BaseForm;
  nonFormattedData: (dashboards: DataRow[]) => Array<BaseNonFormattedData>;
  mockedData: (metadatas: BannerInput[] | Metadata[], connections: string[]) => MockedDataReturn;
  formattedData: (dashboards: DataRow[], connections: string[]) => BaseFormattedData<Dashboard> & {
    texts: Array<{
      id: string;
      modified: boolean;
    }>;
  };
}

const Dashboard: Dashboard = {
  name: "dashboards",
  menu: dashboardMenu,
  unlocked: [],
  webapps: {
    tutorial: [],
    outgoing: [],
    incoming: [],
    course: [],
    tutors: [],
    quiz: ["sifters", "filters"],
    cpanel: [
      "bosses",
      "sifters",
      "minions",
      "filters",
      "underbosses",
      "instructions",
    ],
  },
  fields: ["dashboard", "purpose"],
  form: {
    textInputs: [
      {
        maxlength: 50,
        name: "dashboard",
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
    instructionsunderbosses: ["instructions", "underbosses"],
    filtersbosses: ["filters", "bosses"],
    siftersminions: ["sifters", "minions"],
  },
  columns: [
    { instructionsunderbosses: `${descendantsWrapper["ProgramsCourses"]} ${descendantsWrapper["Qaurtet"]}` },
    { filtersbosses: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
    { siftersminions: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
  ],
  private: [
    { siftersminions: `${descendantsWrapper["SnapshotsNotes"]}` },
    { FlexTable: `${orderAndActions["FlexTablePlusActions"]} Compact` },
    { entityName: "Dashboard" },
  ],
  anonymous: [{ entityName: "Dashboard" }],
  prefixLen: { private: 2, public: 2, anonymous: 1 },
  public: [{ Actions: "Options" }, { entityName: "Dashboard" }],
  constraints: { At1920: 3, At1536: 3, At1440: 3, At992: 2 },
  CSS: () => styles["dashboard"],
  descendents: null,
  connections: [
    "bosses",
    "sifters",
    "minions",
    "filters",
    "underbosses",
    "instructions",
  ],
  mockedData: (metadatas: BannerInput[] | Metadata[], connections: string[]) =>
    metadatas.map((metadata: BannerInput | Metadata) => ({
      metadata,
      status: 0,
      purpose: '.',
      sizeInBytes: 0.0,
      dashboard: new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" }),
      id: incrementID().toString(),
      descendentsSums: connections.reduce(
        (obj, key) => ({ ...obj, [key]: 0 }),
        {}
      ),
    })),
  nonFormattedData: (dashboards: DataRow[]) =>
    dashboards.map((dashboard: DataRow) => ({
      ...dashboard,
      id: parseInt(dashboard.id.toString()),
      checked: dashboard.checked ?? false,
      frozen: dashboard.frozen ?? false,
    })),
  formattedData: (dashboards: DataRow[], connections: string[]) => ({
    descendents: connections.map(sumsFormatter(dashboards)),
    statuses: dashboards.map((dashboard) => ({
      status: !dashboard.status?.hasOwnProperty("initial")
        ? {
          initial: 0,
          owner: dashboard.metadata?.owner,
          current: typeof dashboard.status === 'number' ? dashboard.status : (dashboard.status as Status).current,
        }
        : { ...dashboard.status as Status },
      id: dashboard.id.toString(),
      modified: dashboard.stated ?? false,
    })),
    rows: dashboards.map((dashboard, i) => ({
      modified: dashboard.reordered ?? false,
      deleted: dashboard.deleted ?? false,
      checked: dashboard.checked ?? false,
      frozen: dashboard.frozen ?? false,
      id: dashboard.id.toString(),
      order: i,
      index: i,
    })),
    texts: dashboards.map((dashboard) => ({
      ...textFieldsExtractor(dashboard),
      id: dashboard.id.toString(),
      modified: dashboard.modified ?? false,
    })),
  }),
};

export default Dashboard; 