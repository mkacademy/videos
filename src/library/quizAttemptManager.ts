import { Buffer } from "buffer";
import { Dispatch } from "redux";
import { RootState } from "../store/index";
import createValidTexts from "./CrudsManagerUtils";
import { Attempt, Quiz, setQuizzes, Submition } from "../store/slices/quizSlice";
import { DataRow, Metadata } from "../components/Core/types";
import { textEllipsis } from "../utils";

interface Response {
  quizzes: Quiz[];
}

const selPred0 = ({ id }: { id: number }): boolean => id < 0;

const attemptExtractor0 = ({ pennants: savedAttempts }: { pennants: Submition[] }): Submition[] =>
  savedAttempts.filter(selPred0);

const attemptExtractor1 = ({ pennants: savedAttempts }: { pennants: Submition[] }): Submition[] =>
  savedAttempts;

export const insertSubmitted = ({ state, dispatch }: { state: RootState; dispatch: Dispatch }): Submition[] => {
  const {
    quiz: { quizzes, attempt, banners },
    settings: { isUnzipCourses, isUnzipQuizzes, isUnzipTutorials },
  } = state;
  const isMaximumFeatures = !isUnzipCourses && !isUnzipQuizzes && !isUnzipTutorials;
  const submitted = banners
    .filter(({ isDismissed }) => !isMaximumFeatures || isDismissed)
    .map(({ id }) => attempt["choice" + id])
    .filter((submission): submission is Attempt => !!submission)
    .map((submission) => Object.entries(submission).pop() || [])
    .reduce((p, [k, v]) => ({ ...p, ...{ [k]: { [k]: v } } }), {} as Record<string, Attempt>);

  const insertables = quizzes.map(attemptExtractor0).flat();
  const nonInsertables = quizzes
    .map(attemptExtractor1)
    .flat()
    .map(getChoices)
    .reduce((prev, cur) => ({ ...prev, ...cur }), {} as { [x: string]: (string | null | undefined)[]; });

  const unInsertedAttempts: { [x: string]: (string | null | undefined)[]; }[] = Object.entries(submitted)
    .filter(([key]) => nonInsertables[key] === undefined)
    .map(([_, value]) => Object.entries(value).pop() || [])
    .map(([key, value]) => ({ [key]: { ...[value] } }));

  const mocks = unInsertedAttempts.length > 0
    ? createValidTexts({
      childIds: unInsertedAttempts.length,
      from: "dashboards",
      webapp: "quiz",
      to: "filters",
      dispatch,
      state
    })
    : [];

  const encondingPred = (mockedAttempt: DataRow, i: number): Submition => ({
    id: typeof mockedAttempt.id === 'number' ? mockedAttempt.id : Number(mockedAttempt.id) || 0,
    quote: encodeAttempts(unInsertedAttempts[i]),
    isDismissed: true,
    isHighlighted: false,
    title: mockedAttempt.filter || "",
    status: mockedAttempt.status || 0,
    sizeInBytes: mockedAttempt.sizeInBytes || 0,
    ordinal: mockedAttempt.metadata?.ordinal || 0,
    owner: mockedAttempt.metadata?.owner || false,
    bannerId: Array.isArray(mockedAttempt.metadata?.dashboardId) ? mockedAttempt.metadata.dashboardId[0] as number : (mockedAttempt.metadata?.dashboardId || 0),
  });

  const inserts = [
    ...insertables,
    ...mocks.map(encondingPred)
  ];

  if (inserts.length === 0) return [];

  const response: Response = {
    quizzes: quizzes
      .map((banner) => ({
        ...banner,
        pennants: inserts.filter(({ bannerId }) => bannerId === banner.id),
      }))
      .filter(({ pennants }) => pennants.length > 0),
  };
  setTimeout(() => dispatch(setQuizzes(response)));
  return inserts;
};

const isOwner = (owner: boolean | undefined, metadata?: Metadata): boolean =>
  (owner !== undefined && owner) || Boolean(metadata?.owner);

const selPred = (isMaximumFeatures: boolean) => ({ id, owner, metadata, isDismissed }: Submition): boolean =>
  (!isMaximumFeatures || isDismissed) && id > 0 && isOwner(owner, metadata);

const attemptExtractor = (isMaximumFeatures: boolean) => ({ pennants: savedAttempts }: { pennants: Submition[] }): Submition[] =>
  savedAttempts.filter(selPred(isMaximumFeatures));

export const updateSubmitted = (
  state: RootState,
  dispatch: Dispatch
): Submition[] => {
  const { quiz: { attempt, quizzes, banners } } = state;
  const { settings: { isUnzipCourses, isUnzipQuizzes, isUnzipTutorials } } = state;
  const isMaximumFeatures = !isUnzipCourses && !isUnzipQuizzes && !isUnzipTutorials;
  const submitted = banners
    .filter(({ isDismissed }) => !isMaximumFeatures || isDismissed)
    .map(({ id }) => attempt["choice" + id])
    .filter((submission): submission is Attempt => !!submission)
    .map((submission) => Object.entries(submission).pop() || [])
    .reduce((p, [k, v]) => ({ ...p, ...{ [k]: { [k]: v } } }), {} as Record<string, Attempt>);

  const updateables = quizzes.map(attemptExtractor(isMaximumFeatures)).flat();
  const savedChoices = updateables
    .map(getChoices)
    .reduce((prev, cur) => ({ ...prev, ...cur }), {} as { [x: string]: (string | null | undefined)[]; });

  const unUpdatedAttempts = Object.entries(submitted)
    .filter(([key]) => savedChoices[key])
    .map(([_, value]) => Object.entries(value).pop() || [])
    .map(([key, value]) => ({ [key]: [value] }));

  if (unUpdatedAttempts.length === 0) return [];

  const encondingPred = (savedAttempt: Submition): Submition => ({
    ...savedAttempt,
    quote: reEncodeAttempts(savedAttempt, unUpdatedAttempts),
  });

  const updates = updateables.map(encondingPred);
  const response: Response = {
    quizzes: quizzes
      .map((banner) => ({
        ...banner,
        pennants: updates.filter(({ bannerId }) => bannerId === banner.id),
      }))
      .filter(({ pennants }) => pennants.length > 0),
  };
  setTimeout(() => dispatch(setQuizzes(response)));
  return updates;
};

const encodeAttempts = (consolidatedattempts: { [x: string]: (string | null | undefined)[]; }): string => {
  const buffer = Buffer.from(JSON.stringify(consolidatedattempts));
  return buffer.toString("base64");
};

const reEncodeAttempts = (prevAttempt: Submition, curAttempts: { [x: string]: (string | null | undefined)[]; }[]): string => {
  const choices = getChoices(prevAttempt);
  const [key, arr] = Object.entries(choices).pop() || [];
  const entries: [string, (string | null | undefined)[]][] = curAttempts.map((a) => Object.entries(a)).flat();
  const [_, newAttempt] = entries.find(([k]) => key === k) || [];
  const consolidated = { [key as string]: { ...[...(arr ?? []), ...(newAttempt ?? [])] } };
  const buffer = Buffer.from(JSON.stringify(consolidated));
  return buffer.toString("base64");
};

export const getChoices = ({ quote }: Partial<Submition>): { [x: string]: (string | null | undefined)[]; } => {
  let latestChoice: { [x: string]: (string | null | undefined)[]; } = {};
  try {
    const obj = JSON.parse(Buffer.from(quote || "", "base64").toString()) as { [x: string]: (string | null)[]; };
    const [key, value] = Object.entries(obj)?.pop() || [];
    latestChoice = { [key as string]: [Object.values(value ?? []).pop()] };
  } catch (error) {
    console.log("incorrect format " + textEllipsis(quote || "", 30));
  } finally {
    return latestChoice;
  }
};

export const highlightChoice = (highlighted: boolean) => (quote: string): Record<string, boolean> => {
  let latestChoice: Record<string, boolean> = {};
  try {
    const obj = JSON.parse(Buffer.from(quote, "base64").toString());
    const key = Object.keys(obj)?.pop();
    latestChoice = key ? { [key]: highlighted } : {};
  } catch (error) {
    console.log("incorrect format " + textEllipsis(quote, 30));
  } finally {
    return latestChoice;
  }
};

const pred = ({ pennants: submittedAttempts }: { pennants: Submition[] }): Submition[] => submittedAttempts;

export const getAttempts = (quizzes: Quiz[] | undefined): {
  [x: string]: { [x: string]: string | null | undefined; };
} => {
  const attempts = quizzes?.map(pred).flat() || [];
  return attempts
    .map(getChoices)
    .map((choice) => {
      const [key, value] = Object.entries(choice).pop() || [];
      return { [key as string]: { [key as string]: value?.pop() } };
    })
    .reduce((prev, cur) => ({ ...prev, ...cur }), {});
};

const pred0 = ({ quote, isHighlighted }: Submition) =>
  highlightChoice(isHighlighted)(quote);

export const getFocuses = (quizzes: Quiz[] | undefined): Record<string, boolean> => {
  const attempts = quizzes?.map(pred).flat() || [];
  return attempts.map(pred0).reduce((prev, cur) => ({ ...prev, ...cur }), {});
};
