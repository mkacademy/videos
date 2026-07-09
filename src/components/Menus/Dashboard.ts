import { Buffer } from "buffer";
import { getAlias, capitalizeFirstLetter } from "../../utils";
import { Icons, IconKey } from "../../Hooks/useIconsAssembler";
import { MenuItem } from "../Core/types";
import { ParentData } from "../../store/slices/viewSlice";


const dashboards: ParentData = {
  parent: "dashboards",
  curApp: 0,
  IDs: [],
};

const jsonToBase64: string = Buffer.from(JSON.stringify(dashboards)).toString("base64");

const menuItems: MenuItem[] = [
  {
    from: "dashboards",
    to: "minions",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: dashboards,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
  },
  {
    from: "dashboards",
    to: "underbosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: dashboards,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
  },
  {
    from: "dashboards",
    to: "bosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: dashboards,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
  },
  {
    from: "dashboards",
    to: "sifters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: dashboards,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
  },
  {
    from: "dashboards",
    to: "filters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: dashboards,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
  },
  {
    from: "dashboards",
    to: "instructions",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: dashboards,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
  },
];

export default menuItems; 