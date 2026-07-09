import {
  incrementID,
  sumsFormatter,
  textFieldsExtractor,
  states,
} from "../../utils";
import filterMenu from "../Menus/Filter";
import {
  BaseEntity,
  BaseFormattedData,
  BaseNonFormattedData,
  DataRow,
  FilterTextProperties,
  Metadata,
  MockedDataReturn,
  BaseForm,
} from "../Core/types";
import * as styles from "../../styles/ContraintsCss.module.css";
import * as descendantsWrapper from "../../styles/descendantsWrapper.module.css";
import * as orderAndActions from "../../styles/orderAndActions.module.css";
import { Status } from "../../store/slices/actionSlice";
import { BannerInput, PennantInput } from "../../library/RowMockingUtils";

interface Filter extends BaseEntity {
  form: BaseForm;
  nonFormattedData: (filters: DataRow[]) => Array<BaseNonFormattedData>;
  mockedData: (metadatas: PennantInput[] | BannerInput[] | Metadata[], connections: string[]) => MockedDataReturn;
  formattedData: (filters: DataRow[], connections: string[]) => BaseFormattedData<FilterTextProperties>;
}

const Filter: Filter = {
  name: "filters",
  menu: filterMenu,
  unlocked: ["instructions"],
  webapps: {
    tutorial: ["instructions"],
    course: ["instructions"],
    quiz: ["instructions"],
    outgoing: [],
    incoming: [],
    tutors: [],
    cpanel: [
      "bosses",
      "sifters",
      "minions",
      "dashboards",
      "underbosses",
      "instructions",
    ],
  },
  fields: ["filter", "purpose"],
  form: {
    textInputs: [
      {
        maxlength: 50,
        name: "filter",
        label: "tagname",
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
    dashboardsbosses: ["dashboards", "bosses"],
    siftersminions: ["sifters", "minions"],
  },
  columns: [
    { instructionsunderbosses: `${descendantsWrapper["ProgramsCourses"]} ${descendantsWrapper["Qaurtet"]}` },
    { dashboardsbosses: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
    { siftersminions: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
  ],
  private: [
    { siftersminions: `${descendantsWrapper["SnapshotsNotes"]}` },
    { FlexTable: `${orderAndActions["FlexTablePlusActions"]} Compact` },
    { entityName: "Filter" },
  ],
  anonymous: [{ entityName: "Filter" }],
  prefixLen: { private: 2, public: 2, anonymous: 1 },
  public: [{ Actions: "Options" }, { entityName: "Filter" }],
  constraints: { At1920: 3, At1536: 3, At1440: 3, At992: 2 },
  CSS: () => styles["filter"],
  descendents: null,
  connections: [
    "bosses",
    "sifters",
    "minions",
    "dashboards",
    "underbosses",
    "instructions",
  ],
  mockedData: (metadatas: PennantInput[] | BannerInput[] | Metadata[], connections: string[]) => {
    return metadatas.map((metadata: PennantInput | BannerInput | Metadata) => ({
      metadata,
      status: 0,
      purpose: '.',
      sizeInBytes: 0.0,
      id: incrementID().toString(),
      filter: new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" }),
      descendentsSums: connections.reduce(
        (obj, key) => ({ ...obj, [key]: 0 }),
        {}
      ),
    }));
  },
  nonFormattedData: (filters: DataRow[]) =>
    filters.map((filter) => ({
      ...filter,
      id: parseInt(filter.id.toString()),
      checked: filter.checked ?? false,
      frozen: filter.frozen ?? false,
    })),
  formattedData: (filters: DataRow[], connections: string[]) => ({
    descendents: connections.map(sumsFormatter(filters)),
    statuses: filters.map((filter) => ({
      status: !filter.status?.hasOwnProperty("initial")
        ? {
          initial: 0,
          owner: filter.metadata?.owner,
          current: typeof filter.status === 'number' ? filter.status : (filter.status as Status).current,
        }
        : { ...filter.status as Status },
      id: filter.id.toString(),
      modified: filter.stated ?? false,
    })),
    rows: filters.map((filter, i) => ({
      modified: filter.reordered ?? false,
      deleted: filter.deleted ?? false,
      checked: filter.checked ?? false,
      frozen: filter.frozen ?? false,
      id: filter.id.toString(),
      order: i,
      index: i,
    })),
    texts: filters.map((filter) => ({
      ...textFieldsExtractor(filter),
      id: filter.id.toString(),
      modified: filter.modified ?? false,
    })),
  }),
};

export default Filter; 