import {
  incrementID,
  textFieldsExtractor,
} from "../../utils";
import {
  BaseEntity,
  BaseFormattedData,
  BaseNonFormattedData,
  DataRow,
  InstructionTextProperties,
  MockedDataReturn,
  Metadata,
} from "../Core/types";
import { StepInput } from "../../library/RowMockingUtils";
import { Status } from "./types";

interface Instruction extends BaseEntity {
  nonFormattedData: (instructions: DataRow[]) => Array<BaseNonFormattedData>;
  mockedData: (metadatas: StepInput[] | Metadata[], connections: string[]) => MockedDataReturn;
  formattedData: (instructions: DataRow[], connections: string[]) => BaseFormattedData<InstructionTextProperties>;
}

const Instruction: Instruction = {
  name: "instructions",
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
  formattedData: (instructions: DataRow[]) => ({
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