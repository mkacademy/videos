// Constants file to avoid circular dependencies
export const tabluarPrefixes = ["/app/tabulator/", "/app/add/", "/app/remove/"]
export const userApps: Record<number, string> = {
  0: "---CHOOSE_USERAPP---",
  1: "TUTORIAL",
  2: "COURSE",
  3: "QUIZ",
  4: "TUTORS",
}
export const memberApps: Record<number, string> = {
  0: "---CHOOSE_MEMBERAPP---",
  5: "INCOMING",
  6: "OUTGOING",
  7: "SESSION",
};

export const adminsApps: Record<number, string> = {
  0: "---CHOOSE_ADMINAPP---",
  8: "CPANEL",
};

// Content delay constant moved here to avoid circular dependency with utils.ts and store
export const contentDelay = 500; 
export const TABULATOR_RENDER_CAP = 1000;
export const showInfos: Record<string, boolean> = {};