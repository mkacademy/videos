import { Buffer } from "buffer";
import { incrementID, textEllipsis } from "../utils";
import { idsMerger } from "../library/sliceUtils";
import {
  TutorialState,
  Banner as TutorialBanner,
  Content as TutorialContent,
} from "../store/slices/tutorialSlice";
import {
  Banner as CourseBanner,
  SlideGroup,
  SlideGroupItem,
  Pennant,
  CourseState,
  SlideItem,
} from "./CourseUtils";
import { Quiz, QuizState, Submition } from "../library/QuizUtils";
import { CourseTrees, QuizTrees, TutorialTrees } from "./controlPanelUtils";

// Type for the unsign function parameter
type UnsignFunction<T> = (obj: T, username: string) => Partial<TutorialState>
  & { Trees: TutorialTrees } | Partial<CourseState>
  & { Trees: CourseTrees } | Partial<QuizState>
  & { Trees: QuizTrees };


export const parse = <T = CourseBanner | TutorialBanner | Quiz | SlideGroup | TutorialContent>(
  encodedStr: string,
  username: string,
  unsign: UnsignFunction<T>
): Partial<TutorialState>
& { Trees: TutorialTrees } | Partial<CourseState>
  & { Trees: CourseTrees } | Partial<QuizState>
  & { Trees: QuizTrees } => {
  let output: Partial<TutorialState>
    & { Trees: TutorialTrees } | Partial<CourseState>
    & { Trees: CourseTrees } | Partial<QuizState>
    & { Trees: QuizTrees } = { banners: [], content: [], Trees: {} };
  try {
    const obj = JSON.parse(Buffer.from(encodedStr, "base64").toString());
    output = unsign(obj, username);
  } catch (error) {
    console.log(textEllipsis((error as Error).message, 25));
  } finally {
    return output;
  }
};

export const unSignTZip = ({ banners = [], content = [], Trees }: {
  banners?: TutorialBanner[];
  content?: TutorialContent[][];
  Trees: TutorialTrees;
}, username: string): Partial<TutorialState> & { Trees: TutorialTrees } => {
  const Tpairs: Record<number, number> = {};
  const Spairs: Record<number, number> = {};

  const tutoriaPred = ({ sender, id, ...props }: TutorialBanner) => ({
    ...props,
    id: id < 0 ? ((Tpairs[id] = incrementID()), id) : id,
    owner: sender ? sender?.toLowerCase() === username.toLowerCase() : false,
  });

  const stepPred = ({ sender, id, ...props }: TutorialContent) => ({
    ...props,
    id: id < 0 ? ((Spairs[id] = incrementID()), id) : id,
    owner: sender ? sender?.toLowerCase() === username.toLowerCase() : false,
  });

  const state = {
    banners: banners.map(tutoriaPred),
    content: content.map((slides) => slides.map(stepPred)),
  };

  const { banners: bannerz, content: contend } = state;
  const Tpayload = Object.entries(Tpairs).flat(2).map(String);
  const Spayload = Object.entries(Spairs).flat(2).map(String);

  const nState = bannerz.map((row: TutorialBanner) => idsMerger(Tpayload, "id")(row));
  const nState0 = nState.map((row: TutorialBanner) => idsMerger(Tpayload, "filterId")(row));
  const predicate = (row: TutorialContent) => idsMerger(Tpayload, "bannerId")(row);
  const nState1 = contend.map((rows: TutorialContent[]) => rows.map(predicate));
  const predicate0 = (row: TutorialContent) => idsMerger(Spayload, "id")(row);
  const nState2 = nState1.map((rows: TutorialContent[]) => rows.map(predicate0));

  return { banners: nState0, content: nState2, Trees };
};

export const unSignMZip = ({ banners = [], content = [], Trees }: {
  banners?: CourseBanner[];
  content?: SlideGroup[];
  Trees: CourseTrees;
}, username: string): Partial<CourseState> & { Trees: CourseTrees } => {
  const Mpairs: Record<number, number> = {};
  const Spairs: Record<number, number> = {};

  const bannersPred = ({ sender, id, ...props }: CourseBanner | Pennant) => ({
    ...props,
    id: id < 0 ? ((Mpairs[id] = incrementID()), id) : id,
    owner: sender ? sender?.toLowerCase() === username.toLowerCase() : false,
  });

  const penanntsPred = ({ pennants, ...props }: CourseBanner) => ({
    pennants: pennants?.map(bannersPred) || [],
    ...props,
  });

  const predicate1 = ({ sender, id, ...props }: SlideGroupItem) => ({
    ...props,
    id: id < 0 ? ((Spairs[id] = incrementID()), id) : id,
    owner: sender ? sender?.toLowerCase() === username.toLowerCase() : false,
  });

  const insidesPred = ({ slides, ...objSlides }: SlideGroup) => ({
    ...Object.values(objSlides).map(predicate1),
    slides: slides?.map((slide) => slide.map(predicate1)) || [],
  });

  const state = {
    banners: (banners.map(bannersPred) as CourseBanner[]).map(penanntsPred) as CourseBanner[],
    content: content.map(insidesPred),
  };

  const { banners: bannerz, content: contend } = state;
  const Mpayload = Object.entries(Mpairs).flat(2).map(String);
  const Spayload = Object.entries(Spairs).flat(2).map(String);

  const nState = bannerz.map((row: CourseBanner) => idsMerger(Mpayload, "id")(row));
  const nState0 = nState.map((row: CourseBanner) => idsMerger(Mpayload, "sifterId")(row));
  const nState1 = nState0.map(({ pennants, ...fields }: CourseBanner) => ({
    pennants: pennants.map((row: Pennant) => idsMerger(Mpayload, "bannerId")(row)),
    ...fields,
  }));
  const nState2 = nState1.map(({ pennants, ...fields }: CourseBanner) => ({
    pennants: pennants.map((row: Pennant) => idsMerger(Mpayload, "id")(row)),
    ...fields,
  }));

  const nState3 = contend.map((steps: SlideGroup) =>
    Object.entries(steps)
      .map(([key, row]: [string, SlideGroupItem | SlideItem[][]]) => {
        if (key === "slides") {
          const predicate = (row: SlideItem) => idsMerger(Mpayload, "bannerId")(row);
          const nState = (row as SlideItem[][]).map((rows) => rows.map(predicate));
          return [key, nState];
        }
        const updates = idsMerger(Mpayload, "bannerId")(row as SlideGroupItem);
        return [key, { ...row, ...updates }];
      })
      .reduce((prev: SlideGroup, [key, value]) => ({ ...prev, [key as keyof SlideGroup]: value }), {} as SlideGroup)
  );

  const nState4 = nState3.map((steps: SlideGroup) =>
    Object.entries(steps)
      .map(([key, row]: [string, SlideGroupItem | SlideItem[][]]) => {
        if (key === "slides") {
          const predicate = (row: SlideItem) => idsMerger(Spayload, "id")(row);
          const nState = (row as SlideItem[][]).map((rows) => rows.map(predicate));
          return [key, nState];
        }
        const updates = idsMerger(Spayload, "id")(row as SlideGroupItem);
        return [key, { ...row, ...updates }];
      })
      .reduce((prev: SlideGroup, [key, value]) => ({ ...prev, [key as keyof SlideGroup]: value }), {} as SlideGroup)
  );

  return { banners: nState2, content: nState4, Trees };
};

export const unSignQZip = ({ quizzes = [], banners = [], content = [], Trees }: {
  quizzes?: Quiz[];
  banners?: CourseBanner[];
  content?: SlideGroup[];
  Trees: QuizTrees;
}, username: string): Partial<QuizState> & { Trees: QuizTrees } => {
  // Extract a CourseTrees from QuizTrees - we'll use an empty structure since 
  // unSignMZip is only used here for processing, not for the final tree structure
  const emptyCourseTree: CourseTrees = {};
  const { banners: peels, content: insides } = unSignMZip(
    { banners, content, Trees: emptyCourseTree },
    username
  );

  const Mpairs: Record<number, number> = {};

  const bannersPred = ({ sender, id, ...props }: Quiz | Submition) => ({
    ...props,
    id: id < 0 ? ((Mpairs[id] = incrementID()), id) : id,
    owner: sender ? sender?.toLowerCase() === username.toLowerCase() : false,
  });

  const penanntsPred = ({ pennants, ...props }: Quiz) => ({
    pennants: pennants?.map(bannersPred) || [],
    ...props,
  });

  const Mpayload = Object.entries(Mpairs).flat(2).map(String);
  const quizzez = (quizzes.map(bannersPred) as Quiz[]).map(penanntsPred) as Quiz[];

  const nState = quizzez.map((row: Quiz) => idsMerger(Mpayload, "id")(row));
  const nState0 = nState.map((row: Quiz) => idsMerger(Mpayload, "dashboardId")(row));
  const nState1 = nState0.map(({ pennants, ...fields }: Quiz) => ({
    pennants: pennants.map((row: Submition) => idsMerger(Mpayload, "bannerId")(row)),
    ...fields,
  }));
  const nState2 = nState1.map(({ pennants, ...fields }: Quiz) => ({
    pennants: pennants.map((row: Submition) => idsMerger(Mpayload, "id")(row)),
    ...fields,
  }));
  const nState3 = peels?.map((row: CourseBanner) => idsMerger(Mpayload, "bannerId")(row)) || [];

  return { quizzes: nState2, banners: nState3, content: insides, Trees };
};

