import { Buffer } from "buffer";
import { getAlias, capitalizeFirstLetter } from "../../utils";
import { Icons, IconKey } from "../../Hooks/useIconsAssembler";
import { MenuItem } from "../Core/types";
import { ParentData } from "../../store/slices/viewSlice";

const foundation: ParentData = {
  parent: "foundation",
  curApp: 0,
  IDs: [],
};

const jsonToBase64: string = Buffer.from(JSON.stringify(foundation)).toString("base64");

const menuItems: MenuItem[] = [
  {
    from: "foundation",
    to: "bosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: foundation,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("foundation")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
  },
  {
    from: "foundation",
    to: "minions",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: foundation,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("foundation")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
  },
  {
    from: "foundation",
    to: "underbosses",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: foundation,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("foundation")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
  },
  {
    from: "foundation",
    to: "dashboards",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: foundation,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("foundation")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
  },
  {
    from: "foundation",
    to: "sifters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: foundation,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("foundation")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
  },
  {
    from: "foundation",
    to: "filters",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: foundation,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("foundation")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
  },
  {
    from: "foundation",
    to: "instructions",
    search: undefined,
    prefix: "/app/tabulator/",
    parentData: foundation,
    encodedData: jsonToBase64,
    fromIMG: Icons[capitalizeFirstLetter(getAlias("foundation")) as IconKey],
    toIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
  },
];

export default menuItems; 