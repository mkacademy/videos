import { Buffer } from "buffer";
import { getAlias, capitalizeFirstLetter } from "../../utils";
import { Icons, IconKey } from "../../Hooks/useIconsAssembler";
import { MenuItem } from "../Core/types";
import { ParentData } from "../../store/slices/viewSlice";

const underbosses: ParentData = {
  parent: "underbosses",
  curApp: 0,
  IDs: [],
};

const jsonToBase64: string = Buffer.from(JSON.stringify(underbosses)).toString("base64");

export default function getMenu(prefix: string): MenuItem[] {
  const entity = prefix + "underbosses";

  return [
    {
      parentData: underbosses,
      from: entity,
      search: undefined,
      to: "minions",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
    },
    {
      parentData: underbosses,
      from: entity,
      search: undefined,
      to: "higherunderbosses",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("higherunderbosses")) as IconKey],
    },
    {
      parentData: underbosses,
      from: entity,
      search: undefined,
      to: "lowerunderbosses",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("lowerunderbosses")) as IconKey],
    },
    {
      parentData: underbosses,
      from: entity,
      to: "bosses",
      search: undefined,
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
    },
    {
      parentData: underbosses,
      from: entity,
      search: undefined,
      to: "dashboards",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("dashboards")) as IconKey],
    },
    {
      parentData: underbosses,
      from: entity,
      search: undefined,
      to: "sifters",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
    },
    {
      from: entity,
      to: "filters",
      search: undefined,
      prefix: "/app/tabulator/",
      parentData: underbosses,
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
    },
    {
      parentData: underbosses,
      from: entity,
      search: undefined,
      to: "instructions",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
    },
  ];
} 