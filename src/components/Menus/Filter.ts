import { Buffer } from "buffer";
import { getAlias, capitalizeFirstLetter } from "../../utils";
import { Icons, IconKey } from "../../Hooks/useIconsAssembler";
import { MenuItem } from "../Core/types";
import { ParentData } from "../../store/slices/viewSlice";

const filters: ParentData = {
  parent: "filters",
  curApp: 0,
  IDs: [],
};

const jsonToBase64: string = Buffer.from(JSON.stringify(filters)).toString("base64");

const menuItems: MenuItem[] = [
  {
    from: "filters",
    to: "minions",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: filters,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
  },
  {
    from: "filters",
    to: "underbosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: filters,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
  },
  {
    from: "filters",
    to: "bosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: filters,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
  },
  {
    from: "filters",
    to: "dashboards",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: filters,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("foundation")) as IconKey],
  },
  {
    from: "filters",
    to: "sifters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: filters,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
  },
  {
    from: "filters",
    to: "instructions",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: filters,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
  },
];

export default menuItems; 