import {
  textFieldsExtractor,
} from "../../utils";
import {
  DataRow,
  BaseFormattedData,
} from "../Core/types";

interface Instruction {
  name: string;
  formattedData: (instructions: DataRow[]) => BaseFormattedData;
}

const Instruction: Instruction = {
  name: "instructions",
  formattedData: (instructions: DataRow[]) => ({
    texts: instructions.map((instruction) => ({
      ...textFieldsExtractor(instruction),
      id: instruction.id.toString(),
      modified: instruction.modified ?? false,
    })),
  }),
};

export default Instruction; 