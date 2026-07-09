import { Buffer } from "buffer";
import { getAlias, capitalizeFirstLetter } from "../../utils";
import { Icons, IconKey } from "../../Hooks/useIconsAssembler";
import { MenuItem } from "../Core/types";
import { ParentData } from "../../store/slices/viewSlice";


const instructions: ParentData = {
  parent: "instructions",
  curApp: 0,
  IDs: [],
};

const jsonToBase64: string = Buffer.from(JSON.stringify(instructions)).toString("base64");

const menuItems: MenuItem[] = [
  {
    from: "instructions",
    to: "minions",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: instructions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
  },
  {
    from: "instructions",
    to: "underbosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: instructions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
  },
  {
    from: "instructions",
    to: "bosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: instructions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
  },
  {
    from: "instructions",
    to: "dashboards",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: instructions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
  },
  {
    from: "instructions",
    to: "sifters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: instructions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
  },
  {
    from: "instructions",
    to: "filters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: instructions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
  },
];

export default menuItems; 