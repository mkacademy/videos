import { Buffer } from "buffer";
import { incrementID } from "../utils"; 
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
    console.log((error as Error).message);
  } finally {
    return output;
  }
};


/** Auto-unzip only needs `Trees`; skips unSign* ID remapping of banners/content. */
export const parseZipTrees = <T extends CourseTrees | TutorialTrees | QuizTrees = CourseTrees>(
  encodedStr: string,
): T => {
  try {
    const obj = JSON.parse(Buffer.from(encodedStr, "base64").toString()) as { Trees?: T };
    return (obj.Trees ?? {}) as T;
  } catch (error) {
    console.log((error as Error).message);
    return {} as T;
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

  const mergeBannerId = idsMerger(Tpayload, "id");
  const mergeFilterId = idsMerger(Tpayload, "filterId");
  const mergeBannerIdOnContent = idsMerger(Tpayload, "bannerId");
  const mergeStepId = idsMerger(Spayload, "id");

  const nState = bannerz.map((row: TutorialBanner) => mergeBannerId(row));
  const nState0 = nState.map((row: TutorialBanner) => mergeFilterId(row));
  const nState1 = contend.map((rows: TutorialContent[]) => rows.map(mergeBannerIdOnContent));
  const nState2 = nState1.map((rows: TutorialContent[]) => rows.map(mergeStepId));

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

  const mergeCourseId = idsMerger(Mpayload, "id");
  const mergeSifterId = idsMerger(Mpayload, "sifterId");
  const mergePennantBannerId = idsMerger(Mpayload, "bannerId");
  const mergePennantId = idsMerger(Mpayload, "id");
  const mergeBannerIds = idsMerger(Mpayload, "bannerId");
  const mergeSlideIds = idsMerger(Spayload, "id");

  const nState = bannerz.map((row: CourseBanner) => mergeCourseId(row));
  const nState0 = nState.map((row: CourseBanner) => mergeSifterId(row));
  const nState1 = nState0.map(({ pennants, ...fields }: CourseBanner) => ({
    pennants: pennants.map((row: Pennant) => mergePennantBannerId(row)),
    ...fields,
  }));
  const nState2 = nState1.map(({ pennants, ...fields }: CourseBanner) => ({
    pennants: pennants.map((row: Pennant) => mergePennantId(row)),
    ...fields,
  }));

  // O(k) SlideGroup rebuild — avoid object-spread reduce (O(k²)).
  const nState3 = contend.map((steps: SlideGroup) => {
    const next: SlideGroup = { slides: [] };
    for (const [key, row] of Object.entries(steps) as [string, SlideGroupItem | SlideItem[][]][]) {
      if (key === "slides") {
        next.slides = (row as SlideItem[][]).map((rows) => rows.map(mergeBannerIds));
      } else {
        next[key as keyof SlideGroup] = { ...(row as SlideGroupItem), ...mergeBannerIds(row as SlideGroupItem) } as never;
      }
    }
    return next;
  });

  const nState4 = nState3.map((steps: SlideGroup) => {
    const next: SlideGroup = { slides: [] };
    for (const [key, row] of Object.entries(steps) as [string, SlideGroupItem | SlideItem[][]][]) {
      if (key === "slides") {
        next.slides = (row as SlideItem[][]).map((rows) => rows.map(mergeSlideIds));
      } else {
        next[key as keyof SlideGroup] = { ...(row as SlideGroupItem), ...mergeSlideIds(row as SlideGroupItem) } as never;
      }
    }
    return next;
  });

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

  const mergeQuizId = idsMerger(Mpayload, "id");
  const mergeDashboardId = idsMerger(Mpayload, "dashboardId");
  const mergeSubmissionBannerId = idsMerger(Mpayload, "bannerId");
  const mergeSubmissionId = idsMerger(Mpayload, "id");
  const mergeCourseBannerId = idsMerger(Mpayload, "bannerId");

  const nState = quizzez.map((row: Quiz) => mergeQuizId(row));
  const nState0 = nState.map((row: Quiz) => mergeDashboardId(row));
  const nState1 = nState0.map(({ pennants, ...fields }: Quiz) => ({
    pennants: pennants.map((row: Submition) => mergeSubmissionBannerId(row)),
    ...fields,
  }));
  const nState2 = nState1.map(({ pennants, ...fields }: Quiz) => ({
    pennants: pennants.map((row: Submition) => mergeSubmissionId(row)),
    ...fields,
  }));
  const nState3 = peels?.map((row: CourseBanner) => mergeCourseBannerId(row)) || [];

  return { quizzes: nState2, banners: nState3, content: insides, Trees };
};


