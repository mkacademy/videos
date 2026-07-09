import { B, M, U, FD, FF, FI, FS, BD, BF, BI, BS, MD, MF, MI, MS, UD, UF, UI, US } from "./commsUtils";
import { getConvSearch } from "../utils";
import { RootState } from "../store";
import {
    Quiz,
} from "../store/slices/quizSlice";
import {
    Banner as CourseBanner,
    SlideGroup,
} from "../store/slices/courseSlice";
import {
    Content,
} from "../store/slices/tutorialSlice";
import {
    Tutor,
    IncomingMessage,
    OutgoingMessage,
} from "../store/slices/commsSlice";
import { csObj } from "../Hooks/useSearch/useSearchBar";
import { ParentData } from "../store/slices/viewSlice";

// Type definitions for specific data structures not covered by existing types
interface ItemWithId {
    id: number;
}

interface SearchRoute {
    keywords: Array<{ keyword: string }>;
    index: number;
}

interface IdentitiesExtractorParams {
    curApp: number;
    state: RootState;
    path: string;
}

interface ExtractorOutput {
    selected: Record<string, number[]>;
    searchObj: csObj;
}

const toIdPred = ({ id }: ItemWithId): number => id;

export interface SelectTypeOverride {
    dismissOnly: boolean;
    highlghtOnly: boolean;
}

export interface OverrideSelectorParams {
    selector: keyof SelectTypeOverride;
    value: boolean;
}

const selectTypeOverride: SelectTypeOverride = { dismissOnly: false, highlghtOnly: false };

export const overrideSelector = ({ selector, value }: OverrideSelectorParams): void => {
    selectTypeOverride[selector] = value;
};

export const reEncodeData = (curApp: number, traversal: ParentData): string => {
    const { parent, IDs } = traversal;
    const formated = { curApp, parent, IDs };
    const buffer = Buffer.from(JSON.stringify(formated));
    return buffer.toString('base64');
}

export default function IdentitiesExtractor({ curApp, state, path }: IdentitiesExtractorParams): ExtractorOutput {
    // console.log(selectTypeOverride)
    const output: ExtractorOutput = { selected: {}, searchObj: {} };
    const {
        pagination: { cs },
        session: { dismissals },
        settings: { seltype: highlighter },
    } = state;
    const dismised = dismissals[path] ?? false;
    const appname = path.replace("/convolution/", "");
    const { dismissOnly, highlghtOnly } = selectTypeOverride;

    const selectPred =
        dismissOnly === true
            ? ({ isDismissed }: { isDismissed?: boolean }) => isDismissed === dismised
            : highlghtOnly === true
                ? ({ isHighlighted }: { isHighlighted?: boolean }) => isHighlighted
                : highlighter
                    ? ({ isHighlighted }: { isHighlighted?: boolean }) => isHighlighted
                    : ({ isDismissed }: { isDismissed?: boolean }) => isDismissed !== dismised;

    switch (appname.toLowerCase()) {
        case "tutors": {
            const {
                comms: { tutors },
            } = state;
            const encodedData = cs[curApp] ?? "";
            output["searchObj"] = getConvSearch(encodedData) ?? {};
            const tutorsIds = tutors.filter(selectPred);
            const admins = tutorsIds.filter((c: Tutor) => B === c.type).map(toIdPred);
            const moderators = tutorsIds.filter((c: Tutor) => U === c.type).map(toIdPred);
            const members = tutorsIds.filter((c: Tutor) => M === c.type).map(toIdPred);
            output["selected"]["foundationbosses"] = admins;
            output["selected"]["foundationminions"] = members;
            output["selected"]["foundationunderbosses"] = moderators;
            break;
        }
        case "incoming": {
            const {
                comms: { incoming },
            } = state;
            const encodedData = cs[curApp] ?? "";
            output["searchObj"] = getConvSearch(encodedData) ?? {};
            const imcomingIds = incoming.filter(selectPred);
            const dashboards = imcomingIds.filter((c: IncomingMessage) => FD === c.type).map(toIdPred);
            const sifters = imcomingIds.filter((c: IncomingMessage) => FS === c.type).map(toIdPred);
            const filters = imcomingIds.filter((c: IncomingMessage) => FF === c.type).map(toIdPred);
            const instructions = imcomingIds
                .filter((c: IncomingMessage) => FI === c.type)
                .map(toIdPred);
            output["selected"]["foundationfilters"] = filters;
            output["selected"]["foundationsifters"] = sifters;
            output["selected"]["foundationdashboards"] = dashboards;
            output["selected"]["foundationinstructions"] = instructions;
            break;
        }
        case "outgoing": {
            const {
                comms: { outgoing },
            } = state;
            const encodedData = cs[curApp] ?? "";
            output["searchObj"] = getConvSearch(encodedData) ?? {};
            const outgoingIds = outgoing.filter(selectPred);
            const bfilters = outgoingIds.filter((c: OutgoingMessage) => BF === c.type).map(toIdPred);
            const bsifters = outgoingIds.filter((c: OutgoingMessage) => BS === c.type).map(toIdPred);
            const bdashboards = outgoingIds.filter((c: OutgoingMessage) => BD === c.type).map(toIdPred);
            const binstructions = outgoingIds
                .filter((c: OutgoingMessage) => BI === c.type)
                .map(toIdPred);
            const ufilters = outgoingIds.filter((c: OutgoingMessage) => UF === c.type).map(toIdPred);
            const usifters = outgoingIds.filter((c: OutgoingMessage) => US === c.type).map(toIdPred);
            const udashboards = outgoingIds.filter((c: OutgoingMessage) => UD === c.type).map(toIdPred);
            const uinstructions = outgoingIds
                .filter((c: OutgoingMessage) => UI === c.type)
                .map(toIdPred);
            const mfilters = outgoingIds.filter((c: OutgoingMessage) => MF === c.type).map(toIdPred);
            const msifters = outgoingIds.filter((c: OutgoingMessage) => MS === c.type).map(toIdPred);
            const mdashboards = outgoingIds.filter((c: OutgoingMessage) => MD === c.type).map(toIdPred);
            const minstructions = outgoingIds
                .filter((c: OutgoingMessage) => MI === c.type)
                .map(toIdPred);
            output["selected"]["bossesfilters"] = bfilters;
            output["selected"]["bossessifters"] = bsifters;
            output["selected"]["minionssifters"] = msifters;
            output["selected"]["minionsfilters"] = mfilters;
            output["selected"]["underbossesfilters"] = ufilters;
            output["selected"]["underbossessifters"] = usifters;
            output["selected"]["bossesdashboards"] = bdashboards;
            output["selected"]["minionsdashboards"] = mdashboards;
            output["selected"]["bossesinstructions"] = binstructions;
            output["selected"]["underbossesdashboards"] = udashboards;
            output["selected"]["minionsinstructions"] = minstructions;
            output["selected"]["underbossesinstructions"] = uinstructions;
            break;
        }
        case "quiz": {
            const {
                quiz: { content, quizzes, banners },
            } = state;
            const encodedData = cs[curApp] ?? "";
            output["searchObj"] = getConvSearch(encodedData) ?? {};
            const dashboardIds = quizzes.filter(selectPred).map(toIdPred);
            const filterIds = quizzes
                .map((quiz: Quiz) => quiz.pennants)
                .flat()
                .filter(selectPred)
                .map(toIdPred);
            output["selected"]["dashboardsfilters"] = filterIds;
            output["selected"]["foundationdashboards"] = dashboardIds;
            //course
            const sifterIds = banners.filter(selectPred).map(toIdPred);
            const instructionIds = Object.entries(content)
                .map(([_, slideGroup]: [string, SlideGroup]) => {
                    const { slides, ...steps } = slideGroup;
                    return Object.values(steps);
                })
                .flat()
                .filter(selectPred)
                .map(toIdPred);
            const pennantIds = banners
                .map((banner: CourseBanner) => banner.pennants)
                .flat()
                .filter(selectPred)
                .map(toIdPred);
            const slideIds = Object.values(content)
                .map((slideGroup: SlideGroup) =>
                    slideGroup.slides
                        .flat()
                        .filter(selectPred)
                )
                .flat()
                .map(toIdPred);
            output["selected"]["siftersinstructions"] = instructionIds;
            output["selected"]["filtersinstructions"] = slideIds;
            output["selected"]["dashboardssifters"] = sifterIds;
            output["selected"]["siftersfilters"] = pennantIds;
            break;
        }
        case "tutorial": {
            const {
                tutorial: { content, banners },
            } = state;
            const encodedData = cs[curApp] ?? "";
            output["searchObj"] = getConvSearch(encodedData) ?? {};
            const filterIds = banners.filter(selectPred).map(toIdPred);
            const instructionIds = content
                .map((contentArray: Content[]) => contentArray.filter(selectPred).map(toIdPred))
                .flat();
            output["selected"]["foundationfilters"] = filterIds;
            output["selected"]["filtersinstructions"] = instructionIds;
            break;
        }
        case "course": {
            const {
                course: { content, banners },
            } = state;
            const encodedData = cs[curApp] ?? "";
            output["searchObj"] = getConvSearch(encodedData) ?? {};
            const sifterIds = banners.filter(selectPred).map(toIdPred);
            const instructionIds = Object.entries(content)
                .map(([_, slideGroup]: [string, SlideGroup]) => {
                    const { slides, ...steps } = slideGroup;
                    return Object.values(steps);
                })
                .flat()
                .filter(selectPred)
                .map(toIdPred);
            const pennantIds = banners
                .map((banner: CourseBanner) => banner.pennants)
                .flat()
                .filter(selectPred)
                .map(toIdPred);
            const slideIds = Object.values(content)
                .map((slideGroup: SlideGroup) =>
                    slideGroup.slides
                        .flat()
                        .filter(selectPred)
                )
                .flat()
                .map(toIdPred);
            output["selected"]["siftersinstructions"] = instructionIds;
            output["selected"]["filtersinstructions"] = slideIds;
            output["selected"]["foundationsifters"] = sifterIds;
            output["selected"]["siftersfilters"] = pennantIds;
            break;
        }
        case "search": {
            const {
                search: { routes },
            } = state;
            Object.entries(routes).forEach(([key, values]: [string, SearchRoute]) => {
                const { keywords, index } = values;
                if (keywords[index] === undefined) output["searchObj"][key] = {} as csObj[typeof key];
                else output["searchObj"][key] = { search: keywords[index]["keyword"] };
            });
            break;
        }
        default:
            break;
    }
    return output;
}
