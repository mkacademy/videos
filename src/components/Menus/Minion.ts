import { Buffer } from "buffer";
import { getAlias, capitalizeFirstLetter } from "../../utils";
import { Icons, IconKey } from "../../Hooks/useIconsAssembler";
import { MenuItem } from "../Core/types";
import { ParentData } from "../../store/slices/viewSlice";

const minions: ParentData = {
  parent: "minions",
  curApp: 0,
  IDs: [],
};

const jsonToBase64: string = Buffer.from(JSON.stringify(minions)).toString("base64");

const menuItems: MenuItem[] = [
  {
    from: "minions",
    to: "underbosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: minions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
  },
  {
    from: "minions",
    to: "bosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: minions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
  },
  {
    from: "minions",
    to: "dashboards",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: minions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
  },
  {
    from: "minions",
    to: "sifters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: minions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
  },
  {
    from: "minions",
    to: "filters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: minions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
  },
  {
    from: "minions",
    to: "instructions",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: minions,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
  },
];

export default menuItems; 