import { Buffer } from "buffer";
import { getAlias, capitalizeFirstLetter } from "../../utils";
import { Icons, IconKey } from "../../Hooks/useIconsAssembler";
import { MenuItem } from "../Core/types";
import { ParentData } from "../../store/slices/viewSlice";

export default function getMenu(prefix: string): MenuItem[] {
  const entity = prefix + "sifters";
  const parentData: ParentData = { parent: entity, curApp: 0, IDs: [] };
  const jsonToBase64: string = Buffer.from(JSON.stringify(parentData)).toString("base64");

  return [
    {
      parentData,
      search: undefined,
      from: entity,
      to: "minions",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("minions")) as IconKey],
    },
    {
      parentData,
      from: entity,
      search: undefined,
      to: "underbosses",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("underbosses")) as IconKey],
    },
    {
      parentData,
      from: entity,
      to: "bosses",
      search: undefined,
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("bosses")) as IconKey],
    },
    {
      parentData,
      search: undefined,
      from: entity,
      to: "dashboards",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("foundation")) as IconKey],
    },
    {
      parentData,
      from: entity,
      search: undefined,
      to: "highersifters",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("highersifters")) as IconKey],
    },
    {
      parentData,
      from: entity,
      search: undefined,
      to: "lowersifters",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("lowersifters")) as IconKey],
    },
    {
      parentData,
      from: entity,
      search: undefined,
      to: "filters",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("filters")) as IconKey],
    },
    {
      parentData,
      from: entity,
      search: undefined,
      to: "instructions",
      prefix: "/app/tabulator/",
      encodedData: jsonToBase64,
      fromIMG: Icons[capitalizeFirstLetter(getAlias("sifters")) as IconKey],
      toIMG: Icons[capitalizeFirstLetter(getAlias("instructions")) as IconKey],
    },
  ];
} 