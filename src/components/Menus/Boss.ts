import { Buffer } from "buffer";
import { MenuItem } from "../Core/types";
import { getAlias, capitalizeFirstLetter } from "../../utils";
import { Icons, IconKey } from "../../Hooks/useIconsAssembler";
import { ParentData } from "../../store/slices/viewSlice";


const bosses: ParentData = {
  parent: "bosses",
  curApp: 0,
  IDs: [],
};

const jsonToBase64: string = Buffer.from(JSON.stringify(bosses)).toString("base64");

const menuItems: MenuItem[] = [
  {
    from: "bosses",
    to: "minions",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: bosses,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
  },
  {
    from: "bosses",
    to: "underbosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: bosses,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
  },
  {
    from: "bosses",
    to: "dashboards",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: bosses,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
  },
  {
    from: "bosses",
    to: "sifters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: bosses,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
  },
  {
    from: "bosses",
    to: "filters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: bosses,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
  },
  {
    from: "bosses",
    to: "instructions",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: bosses,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
  },
];

export default menuItems; 