import {
  incrementID,
  sumsFormatter,
  textFieldsExtractor,
  states,
} from "../../utils";
import instructionMenu from "../Menus/Instruction";
import {
  BaseEntity,
  BaseFormattedData,
  BaseNonFormattedData,
  DataRow,
  InstructionForm,
  InstructionTextProperties,
  MockedDataReturn,
  Metadata,
} from "../Core/types";
import * as styles from "../../styles/ContraintsCss.module.css";
import * as descendantsWrapper from "../../styles/descendantsWrapper.module.css";
import * as orderAndActions from "../../styles/orderAndActions.module.css";
import { Status } from "../../store/slices/actionSlice";
import { StepInput } from "../../library/RowMockingUtils";

interface Instruction extends BaseEntity {
  form: InstructionForm;
  nonFormattedData: (instructions: DataRow[]) => Array<BaseNonFormattedData>;
  mockedData: (metadatas: StepInput[] | Metadata[], connections: string[]) => MockedDataReturn;
  formattedData: (instructions: DataRow[], connections: string[]) => BaseFormattedData<InstructionTextProperties>;
}

const Instruction: Instruction = {
  name: "instructions",
  menu: instructionMenu,
  unlocked: [],
  webapps: {
    tutorial: [],
    outgoing: [],
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
      "underbosses",
    ],
  },
  fields: ["instruction", "details", "imageurl"],
  form: {
    textInputs: [
      {
        maxlength: 50,
        name: "instruction",
        label: "Title",
      },
    ],
    textAreas: [
      {
        name: "details",
        label: "Details",
      },
    ],
    fileInputs: [
      {
        name: "imageurl",
        label: "ImageUrl",
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
    filtersunderbosses: ["filters", "underbosses"],
    dashboardsbosses: ["dashboards", "bosses"],
    siftersminions: ["sifters", "minions"],
  },
  columns: [
    { filtersunderbosses: `${descendantsWrapper["ProgramsCourses"]} ${descendantsWrapper["Qaurtet"]}` },
    { dashboardsbosses: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
    { siftersminions: `${descendantsWrapper["TutorialsInstructions"]} ${descendantsWrapper["Qaurtet"]}` },
  ],
  private: [
    { siftersminions: `${descendantsWrapper["SnapshotsNotes"]}` },
    { FlexTable: `${orderAndActions["FlexTablePlusActions"]} Compact` },
    { entityName: "Instruction" },
  ],
  anonymous: [{ entityName: "Instruction" }],
  prefixLen: { private: 2, public: 2, anonymous: 1 },
  public: [{ Actions: "Options" }, { entityName: "Instruction" }],
  constraints: { At1920: 3, At1536: 3, At1440: 3, At992: 2 },
  CSS: () => styles["instruction"],
  descendents: null,
  connections: [
    "bosses",
    "sifters",
    "minions",
    "filters",
    "dashboards",
    "underbosses",
  ],
  mockedData: (metadatas: StepInput[] | Metadata[], connections: string[]) =>
    metadatas.map((metadata: StepInput | Metadata) => ({
      metadata,
      status: 0,
      details: ".",
      sizeInBytes: 0.0,
      imageurl: "data:image",
      instruction: new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" }),
      id: incrementID().toString(),
      descendentsSums: connections.reduce(
        (obj, key) => ({ ...obj, [key]: 0 }),
        {}
      ),
    })),
  nonFormattedData: (instructions: DataRow[]) =>
    instructions.map((instruction: DataRow) => ({
      ...instruction,
      id: parseInt(instruction.id.toString()),
      checked: instruction.checked ?? false,
      frozen: instruction.frozen ?? false,
    })),
  formattedData: (instructions: DataRow[], connections: string[]) => ({
    descendents: connections.map(sumsFormatter(instructions)),
    statuses: instructions.map((instruction) => ({
      status: !instruction.status?.hasOwnProperty("initial")
        ? {
          initial: 0,
          owner: instruction.metadata?.owner,
          current: typeof instruction.status === 'number' ? instruction.status : (instruction.status as Status).current,
        }
        : { ...instruction.status as Status },
      id: instruction.id.toString(),
      modified: instruction.stated ?? false,
    })),
    rows: instructions.map((instruction, i) => ({
      modified: instruction.reordered ?? false,
      deleted: instruction.deleted ?? false,
      checked: instruction.checked ?? false,
      frozen: instruction.frozen ?? false,
      id: instruction.id.toString(),
      order: i,
      index: i,
    })),
    texts: instructions.map((instruction) => ({
      ...textFieldsExtractor(instruction),
      id: instruction.id.toString(),
      modified: instruction.modified ?? false,
    })),
  }),
};

export default Instruction; 