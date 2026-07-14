import { BaseEntity } from "../Core/types";

const Foundation: BaseEntity = {
  name: "foundation",
  menu: [],
  unlocked: ["filters"],
  webapps: {
    outgoing: [],
    quiz: ["dashboards"],
    course: ["sifters"],
    tutorial: ["filters"],
    tutors: ["bosses", "minions", "underbosses"],
    incoming: ["sifters", "filters", "instructions", "dashboards"],
    cpanel: [
      "bosses",
      "sifters",
      "filters",
      "minions",
      "dashboards",
      "underbosses",
      "instructions",
    ],
  },
  connections: [
    "bosses",
    "sifters",
    "filters",
    "minions",
    "dashboards",
    "underbosses",
    "instructions",
  ],
  ordinals: {},
  columns: [],
  fields: [],
  private: [],
  public: [],
  CSS: () => "",
  anonymous: [],
  descendents: null,
  prefixLen: { private: 0, public: 0, anonymous: 0 },
  constraints: { At1920: 0, At1536: 0, At1440: 0, At992: 0 },
};

export default Foundation; 