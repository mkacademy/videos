import { tabluarPrefixes } from "../constants";
import { Icons } from "../Hooks/useIconsAssembler";


// icons svg images
const alert = new URL("../Images/icons/alert.svg", import.meta.url).href;
const bell = new URL("../Images/icons/bell.svg", import.meta.url).href;
const bills = new URL("../Images/icons/bills.svg", import.meta.url).href;
const budget = new URL("../Images/icons/budget.svg", import.meta.url).href;
const card = new URL("../Images/icons/card.svg", import.meta.url).href;
const check = new URL("../Images/icons/check.svg", import.meta.url).href;
const empty_check = new URL("../Images/icons/empty_check.svg", import.meta.url).href;
const gears = new URL("../Images/icons/gears.svg", import.meta.url).href;
const home = new URL("../Images/icons/home.svg", import.meta.url).href;
const menu = new URL("../Images/icons/menu.svg", import.meta.url).href;
const plane = new URL("../Images/icons/plane.svg", import.meta.url).href;
const plus = new URL("../Images/icons/plus.svg", import.meta.url).href;
const report = new URL("../Images/icons/report.svg", import.meta.url).href;
const search = new URL("../Images/icons/search.svg", import.meta.url).href;
const user = new URL("../Images/icons/user.svg", import.meta.url).href;
const wallet = new URL("../Images/icons/wallet.svg", import.meta.url).href;
const wealth = new URL("../Images/icons/wealth.svg", import.meta.url).href;


// Type definitions
interface IconsImgs {
  alert: string;
  bell: string;
  bills: string;
  budget: string;
  card: string;
  check: string;
  empty_check: string;
  gears: string;
  home: string;
  menu: string;
  plane: string;
  plus: string;
  report: string;
  search: string;
  user: string;
  wallet: string;
  wealth: string;
}

export interface NavLinkTop {
  id: number;
  isActive: boolean;
  title: string;
  image: string;
}

export interface NavLinkMiddle {
  id: number;
  name: string;
  title: string;
  image: string;
}

export interface NavLinkBottom {
  id: number;
  title: string;
  image: string;
  prefix?: string;
}

export const iconsImgs: IconsImgs = {
  alert,
  bell,
  bills,
  budget,
  card,
  check,
  empty_check,
  gears,
  home,
  menu,
  plane,
  plus,
  report,
  search,
  user,
  wallet,
  wealth,
};

export const navLinkTop: NavLinkTop[] = [
  { id: 2, isActive: false, title: "Expand", image: iconsImgs.plane },
  { id: 3, isActive: true, title: "Highlight", image: iconsImgs.wallet },
];

export const navLinkMiddle: NavLinkMiddle[] = [
  {
    id: 5,
    name: "foundation",
    title: "Root",
    image: Icons.Root,
  },
  {
    id: 6,
    name: "instructions",
    title: "Steps",
    image: Icons.Steps,
  },
  {
    id: 7,
    name: "filters",
    title: "Filters",
    image: Icons.Filters,
  },
  {
    id: 8,
    name: "sifters",
    title: "Sifters",
    image: Icons.Sievers,
  },
  {
    id: 9,
    name: "dashboards",
    title: "Partitions",
    image: Icons.Partitions,
  },
  {
    id: 10,
    name: "minions",
    title: "Members",
    image: Icons.Members,
  },
  {
    id: 11,
    title: "Mediators",
    image: Icons.Managers,
    name: "underbosses",
  },
  {
    id: 12,
    name: "bosses",
    title: "Admins",
    image: Icons.Admins,
  },
];

export const navLinkBottom: NavLinkBottom[] = [
  {
    id: 13,
    title: "Downward",
    image: iconsImgs.user,
  },
  {
    id: 14,
    title: "Upward",
    image: iconsImgs.bills,
  },
  {
    id: 15,
    prefix: tabluarPrefixes[2],
    title: "Includes",
    image: iconsImgs.budget,
  },
  {
    id: 16,
    prefix: tabluarPrefixes[1],
    title: "Excludes",
    image: iconsImgs.budget,
  },
];
