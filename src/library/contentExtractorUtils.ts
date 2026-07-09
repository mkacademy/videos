import { DataRow, CpanelRow, MockedDataReturnTypes, Metadata } from '../components/Core/types';
import { Status } from '../store/slices/actionSlice';
import { declare } from '../store/slices/contentSlice';
import { Tree as entities } from '../utils';
import {
  bannersMocks,
  filterPred,
  FilterMetadata,
  BannerInput,
  PennantInput,
  pennantsMocks
} from './RowMockingUtils';
import {
  QuizThunkPayload,
  QuestionThunkPayload,
  TutorialThunkPayload,
  CourseThunkPayload,
  IncomingThunkPayload,
  OutgoingThunkPayload,
  PennantThunkPayload,
  TutorsThunkPayload,
  SubmissionThunkPayload
} from '../store/middleware/ContentExtractorJKL';

export interface CpanelData {
  fetchedData: Record<string, CpanelRow[]>;
  from: string;
  to: string;
}
import { Quiz } from '../store/slices/quizSlice';
import { Banner as TutorialBanner, Content } from '../store/slices/tutorialSlice';
import { Banner, SlideGroup, SlideItem, Pennant } from '../store/slices/courseSlice';

// Error message constants
const errorMsg1 = "no selection found, unStash aborted";
const er9 = "no pennants to receive steps in Courses, unStash aborted";

type ContentWebapp = 'course' | 'quiz' | 'tutorial';

const extractAppLabels: Record<ContentWebapp | 'tutors' | 'incoming' | 'outgoing', string> = {
  quiz: 'Quiz',
  course: 'Course',
  tutorial: 'Tutorial',
  tutors: 'Tutors',
  incoming: 'Incoming',
  outgoing: 'Outgoing',
};

const extractTargetLabel = (webapp: string, formatters: string): string => {
  const appLabel = extractAppLabels[webapp as keyof typeof extractAppLabels] ?? webapp;
  if (formatters === 'cpanel') return 'Cpanel';
  if (formatters === 'app') return appLabel;
  return `Cpanel and ${appLabel}`;
};

const buildInsertedMsg = (count: number, itemType: string, target: string): string =>
  `inserted ${count} ${itemType} into ${target}`;

const courseExtractLabels: Record<ContentWebapp, Partial<Record<string, { item: string; pluralItem?: string; subTarget?: string }>>> = {
  course: {
    foundationsifters: { item: 'Courses' },
    siftersfilters: { item: 'Chapter', pluralItem: 'Chapters' },
    siftersinstructions: { item: 'Covers' },
    filtersinstructions: { item: 'Steps', subTarget: 'Chapters' },
  },
  quiz: {
    foundationsifters: { item: 'Questions' },
    siftersfilters: { item: 'Followup Questions' },
    siftersinstructions: { item: 'Options' },
    filtersinstructions: { item: 'Options', subTarget: 'Followups' },
  },
  tutorial: {},
};

const courseExtractNotification = (
  fromto: string,
  count: number,
  formatters: string,
  contentWebapp: ContentWebapp,
): string | undefined => {
  const labels = courseExtractLabels[contentWebapp][fromto];
  if (!labels) return undefined;
  const target = labels.subTarget && formatters === 'app'
    ? labels.subTarget
    : extractTargetLabel(contentWebapp, formatters);
  const itemType = count === 1 ? labels.item : (labels.pluralItem ?? labels.item);
  return buildInsertedMsg(count, itemType, target);
};

// Helper function to remove duplicates
const noDuplicates = (r: { id: number }, i: number, self: { id: number }[]) =>
  i === self.findIndex(({ id }) => id === r.id);

interface BaseExtractContentParams {
  fromto: string;
  fetchedData: DataRow[];
  selecttype: boolean;
  formatters: string;
  showSuc: boolean;
}

export interface QuizExtractContentParams extends BaseExtractContentParams {
  destination: "quiz";
  quizzes: Quiz[];
  quizBanners: Banner[];
  quizContent: SlideGroup[];
}

export interface TutorialExtractContentParams extends BaseExtractContentParams {
  destination: "tutorial";
  tutorialBanners: TutorialBanner[];
}

export interface CourseExtractContentParams extends BaseExtractContentParams {
  destination: "course";
  contentWebapp?: ContentWebapp;
  courseBanners: Banner[];
  courseContent: SlideGroup[];
  quizBanners?: Banner[];
  quizContent?: SlideGroup[];
}

export interface TutorsExtractContentParams extends BaseExtractContentParams {
  destination: "tutors";
}

export interface IncomingExtractContentParams extends BaseExtractContentParams {
  destination: "incoming";
  mailer: number;
}

export interface OutgoingExtractContentParams extends BaseExtractContentParams {
  destination: "outgoing";
}

export type ExtractContentParams =
  | QuizExtractContentParams
  | TutorialExtractContentParams
  | CourseExtractContentParams
  | TutorsExtractContentParams
  | IncomingExtractContentParams
  | OutgoingExtractContentParams;

type ThunkAction =
  QuizThunkPayload |
  QuestionThunkPayload |
  TutorialThunkPayload |
  CourseThunkPayload |
  PennantThunkPayload |
  TutorsThunkPayload |
  IncomingThunkPayload |
  OutgoingThunkPayload |
  SubmissionThunkPayload;

export interface ExtractContentResult {
  success: boolean;
  error?: string;
  warning?: string;
  response?: ThunkAction;
  cpanel?: CpanelData;
  sucMsg?: string;
  webapp?: string;
  routes?: string[];
  thunkAction?: ThunkAction;
  nextAction?: CpanelData & { webapp: string } | ThunkAction;
}

export const payloadParentLinkError = (
  parent: string,
  child: string,
  destination: string,
): string =>
  `no ${parent} to receive ${child} in ${destination}, unStash aborted`;

/**
 * Real entity ids for parent/child link checks (server ids > 0 or local `incrementID()` ≤ -1).
 * Do not treat -1 as invalid: it is the first local id from `incrementID()`, not only a formatter sentinel.
 */
const isValidPayloadParentId = (id: number | undefined): id is number =>
  id != null && Number.isFinite(id);

export const questionBannersMatchSourceDashboards = (
  banners: Banner[] | undefined,
  sourceDashboards: CpanelRow[],
): boolean => {
  const allowed = new Set(
    sourceDashboards
      .map((d) => Number(d.dashboardId))
      .filter(isValidPayloadParentId),
  );
  if ((banners?.length ?? 0) === 0) return true;
  if (allowed.size === 0) return false;
  return (banners ?? []).every(
    (b) => isValidPayloadParentId(b.bannerId) && allowed.has(b.bannerId),
  );
};

export const tutorialStepsReferencePayloadBanners = (
  banners: Array<{ id?: number }>,
  content: Content[][],
): boolean => {
  const allowed = new Set(
    banners.map((b) => b.id).filter(isValidPayloadParentId),
  );
  if (content.length === 0) return true;
  const steps = content.flat() as Array<{ bannerId?: number }>;
  if (allowed.size === 0) return false;
  return steps.every(
    (s) => isValidPayloadParentId(s.bannerId) && allowed.has(s.bannerId),
  );
};

export const quizPennantsMatchQuizParents = (quizzes: Quiz[]): boolean =>
  quizzes.every(
    (q) =>
      isValidPayloadParentId(q.id) &&
      (q.pennants ?? []).every((p) => p.bannerId === q.id),
  );

export const pennantsAttachToBannerParents = (banners: Banner[]): boolean =>
  banners.every(
    (b) =>
      isValidPayloadParentId(b.id) &&
      (b.pennants ?? []).every((p) => p.bannerId === b.id),
  );

const collectCoursePayloadEntityIds = (banners: Banner[]): Set<number> => {
  const s = new Set<number>();
  for (const b of banners) {
    if (isValidPayloadParentId(b.id)) s.add(b.id);
    for (const p of b.pennants ?? []) {
      if (isValidPayloadParentId(p.id)) s.add(p.id);
    }
  }
  return s;
};

export const courseContentReferencesPayloadEntities = (
  banners: Banner[],
  content: SlideGroup[],
): boolean => {
  if (content.length === 0) return true;
  const allowed = collectCoursePayloadEntityIds(banners);
  if (allowed.size === 0) return false;
  for (const group of content) {
    const g = group as unknown as Record<string, unknown>;
    for (const key of Object.keys(g)) {
      if (key === "slides") continue;
      const item = g[key];
      if (item != null && typeof item === "object" && "bannerId" in item) {
        const bid = (item as { bannerId?: number }).bannerId;
        if (!isValidPayloadParentId(bid) || !allowed.has(bid)) return false;
      }
    }
    for (const row of group.slides ?? []) {
      for (const slide of row) {
        const bid = slide.bannerId;
        if (!isValidPayloadParentId(bid) || !allowed.has(bid)) return false;
      }
    }
  }
  return true;
};

// Helper predicate functions
const createPredicate = (selecttype: boolean) => ({ checked = false }: DataRow) => checked === selecttype;
const metadataMoldsFromRows = (rows: DataRow[]): CpanelRow[] =>
  rows.flatMap((row) => (row.metadata != null ? [row.metadata as CpanelRow] : []));
const predicat0 = ({ status, metadata, keywords, ...record }: DataRow) => ({
  ...record,
  status: (status as Status)?.initial ?? status,
});
const stashRowFields = (row: DataRow) => predicat0(row) as DataRow & Record<string, unknown>;
/** Cascade stash pennants use app `quote`/`title`; PennantFormatter expects cpanel `purpose`/`filter`. */
const toFilterEntityFromStashRow = (row: DataRow) => {
  const { id, quote, title, purpose, filter, ...rest } = stashRowFields(row);
  return {
    ...rest,
    id: parseInt(String(id)),
    purpose: (purpose as string | undefined) ?? (quote as string | undefined) ?? '.',
    filter: (filter as string | undefined) ?? (title as string | undefined) ?? '.',
  };
};
/** App `quote`/`title` → cpanel `purpose`/`sifter` (course/quiz banners and questions). */
const toSifterEntityFromStashRow = (row: DataRow) => {
  const { id, quote, title, purpose, sifter, ...rest } = stashRowFields(row);
  return {
    ...rest,
    id: parseInt(String(id)),
    purpose: (purpose as string | undefined) ?? (quote as string | undefined) ?? '.',
    sifter: (sifter as string | undefined) ?? (title as string | undefined) ?? '.',
  };
};
/** App `quote`/`title` → cpanel `purpose`/`dashboard` (quiz roots). */
const toDashboardEntityFromStashRow = (row: DataRow) => {
  const { id, quote, title, purpose, dashboard, ...rest } = stashRowFields(row);
  return {
    ...rest,
    id: parseInt(String(id)),
    purpose: (purpose as string | undefined) ?? (quote as string | undefined) ?? '.',
    dashboard: (dashboard as string | undefined) ?? (title as string | undefined) ?? '.',
  };
};
/** App slide/cover rows → cpanel `instruction`/`details` (keeps app fields as fallbacks). */
const toInstructionEntityFromStashRow = (row: DataRow) => {
  const { id, quote, title, content, instruction, details, ...rest } = stashRowFields(row);
  return {
    ...rest,
    id: parseInt(String(id)),
    instruction: (instruction as string | undefined) ?? (title as string | undefined) ?? '.',
    details: (details as string | undefined) ?? (content as string | undefined) ?? '.',
    ...(quote != null ? { quote } : {}),
    ...(title != null ? { title } : {}),
    ...(content != null ? { content } : {}),
  };
};
const inferFromToEntities = (fromto: string): { from: string; to: string } | null => {
  const entities = [
    "underbosses",
    "instructions",
    "dashboards",
    "foundation",
    "minions",
    "filters",
    "sifters",
    "bosses",
  ];

  for (const from of entities) {
    for (const to of entities) {
      if (fromto === `${from}${to}`) return { from, to };
    }
  }

  return null;
};

const toIdField = (entity: string) => `${entity.replace(/s$/, '')}Id`;

const predicate2 = (key: keyof Metadata | string, fromto: string) =>
  ({ metadata, id, ...row }: DataRow): CpanelRow[] => {
    const raw = metadata?.[key as keyof Metadata];
    const pairs = inferFromToEntities(fromto);
    const toField = pairs ? toIdField(pairs.to) : null;
    const instructionId = Number(id ?? -1);

    const moldForParent = (parentId: number): CpanelRow => {
      const base = {
        ...metadata,
        [key]: parentId,
        ...(toField ? { [toField]: instructionId } : {}),
      };
      return base as CpanelRow;
    };

    if (Array.isArray(raw) && raw.length > 0) {
      return raw
        .map((parentId) => moldForParent(Number(parentId)))
        .filter((m) => Number.isFinite(m[key as keyof CpanelRow] as number));
    }
    if (raw != null && raw !== '') {
      const parentId = Number(raw);
      if (Number.isFinite(parentId)) return [moldForParent(parentId)];
    }

    if (!pairs) return [];

    const itemMetadata = metadata as Metadata & { bannerId?: number };
    const rowWithBannerId = row as { bannerId?: number };
    const fromId = rowWithBannerId.bannerId ?? itemMetadata.bannerId ?? -1;

    return [moldForParent(Number(fromId))];
  };

/**
 * Pennant ids for matching stash rows to course covers in `filtersinstructions` validation.
 * Uses `metadata.filterId` when present; if metadata is minimal (e.g. `{ owner, ordinal }`) or
 * `filterId` is empty, mirrors {@link predicate2} for `filterId` + `fromto` (derive from
 * `row.bannerId` / `metadata.bannerId` when `inferFromToEntities(fromto)` applies).
 */
const getLinkTableIdsForPennantMatch = (row: DataRow, fromto: string): number[] => {
  const metadata = row.metadata;
  if (metadata?.filterId != null) {
    const f = metadata.filterId;
    if (Array.isArray(f)) {
      const nums = f.map((x) => Number(x)).filter((n) => Number.isFinite(n));
      if (nums.length > 0) return nums;
    } else {
      const n = Number(f);
      if (Number.isFinite(n)) return [n];
    }
  }

  const rowLink = row as { filterId?: number; bannerId?: number };
  if (rowLink.filterId != null) {
    const n = Number(rowLink.filterId);
    if (Number.isFinite(n)) return [n];
  }

  if (!inferFromToEntities(fromto)) return [];

  const itemMetadata = metadata as (Metadata & { bannerId?: number }) | undefined;
  const fromId = rowLink.bannerId ?? itemMetadata?.bannerId ?? -1;
  const n = Number(fromId);
  if (!isValidPayloadParentId(n)) return [];
  return [n];
};

const handleQuizDestination = (
  params: QuizExtractContentParams,
  predicate: ReturnType<typeof createPredicate>
): ExtractContentResult => {
  const {
    fromto,
    fetchedData,
    selecttype,
    formatters,
    showSuc,
    quizBanners = [],
    quizContent = [],
    quizzes = [],
  } = params;

  if (fromto === "foundationdashboards") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const foundationDashboards = {
      foundation: metadataMoldsFromRows(selected),
      dashboards: selected.map(toDashboardEntityFromStashRow),
    };

    const sucMsg = buildInsertedMsg(selected.length, 'Quizzes', extractTargetLabel('quiz', formatters));
    const response: QuizThunkPayload = {
      content: { records: { foundationDashboards } },
    };

    const cpanel: CpanelData = {
      fetchedData: foundationDashboards,
      from: "foundation",
      to: "dashboards",
    };

    return {
      success: true,
      response,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'quiz',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/quiz']
          : ['/convolution/cpanel', '/convolution/quiz'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'quiz' }
        : formatters === "app"
          ? response
          : undefined
    };
  } else if (fromto === "dashboardssifters") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const dashboardsSifters = {
      sifters: selected.map(toSifterEntityFromStashRow),
      dashboards: selected.map(predicate2("dashboardId", fromto)).flat(),
    };

    const sucMsg = buildInsertedMsg(selected.length, 'Questions', extractTargetLabel('quiz', formatters));
    const response: QuestionThunkPayload = {
      content: {
        records: {
          dashboardsSifters,
        }
      }
    };

    const cpanel: CpanelData = {
      fetchedData: dashboardsSifters,
      from: "dashboards",
      to: "sifters",
    };

    return {
      success: true,
      response,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'quiz',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/quiz']
          : ['/convolution/cpanel', '/convolution/quiz'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'quiz' }
        : formatters === "app"
          ? response
          : undefined
    };
  } else if (fromto === "dashboardsfilters") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const dashboardsFilters = {
      filters: selected.map(toFilterEntityFromStashRow),
      dashboards: selected.map(predicate2("dashboardId", fromto)).flat(),
    };

    const sucMsg = buildInsertedMsg(selected.length, 'Submissions', extractTargetLabel('quiz', formatters));
    const response: SubmissionThunkPayload = {
      content: {
        records: {
          dashboardsFilters,
          quizzes: quizzes.filter(({ isHighlighted }: Quiz) => isHighlighted),
        }
      }
    };

    const cpanel: CpanelData = {
      fetchedData: dashboardsFilters,
      from: "dashboards",
      to: "filters",
    };

    return {
      success: true,
      response,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'quiz',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/quiz']
          : ['/convolution/cpanel', '/convolution/quiz'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'quiz' }
        : formatters === "app"
          ? response
          : undefined
    };
  }

  const result = handleCourseDestination({
    destination: 'course',
    contentWebapp: 'quiz',
    fromto,
    fetchedData,
    selecttype,
    formatters,
    showSuc,
    courseBanners: quizBanners,
    courseContent: quizContent,
    quizBanners,
    quizContent,
  }, predicate);
  return { ...result, webapp: 'quiz' };
};
const handleCourseDestination = (
  params: CourseExtractContentParams,
  predicate: ReturnType<typeof createPredicate>
): ExtractContentResult => {
  const {
    fromto,
    fetchedData,
    formatters,
    showSuc,
    contentWebapp = 'course',
    courseBanners,
    courseContent,
    quizBanners = [],
    quizContent = [],
  } = params;
  const resolvedCourseBanners = courseBanners ?? quizBanners;
  const resolvedCourseContent = courseContent ?? quizContent;
  if (fromto === "foundationsifters") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const foundationSifters = {
      foundation: metadataMoldsFromRows(selected),
      sifters: selected.map(toSifterEntityFromStashRow),
    };

    const sucMsg = courseExtractNotification(fromto, selected.length, formatters, contentWebapp);
    const response: CourseThunkPayload = { content: { records: { foundationSifters } } };

    const cpanel: CpanelData = {
      fetchedData: foundationSifters,
      from: "foundation",
      to: "sifters",
    };

    return {
      success: true,
      response,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'course',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/course']
          : ['/convolution/cpanel', '/convolution/course'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'course' }
        : formatters === "app"
          ? response
          : undefined
    };
  } else if (fromto === "siftersfilters") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const siftersFilters = {
      filters: selected.map(toFilterEntityFromStashRow),
      sifters: selected.map(predicate2("sifterId", fromto)).flat(),
    };

    const banners = resolvedCourseBanners;
    const highlightedBanners = banners.filter(({ isHighlighted }) => isHighlighted);
    const parentBanners = (highlightedBanners.length > 0 ? highlightedBanners : banners)
      .map(({ pennants, ...rest }) => ({ ...rest, pennants: [] }));
    const sucMsg = courseExtractNotification(fromto, selected.length, formatters, contentWebapp);
    const response: PennantThunkPayload = {
      content: {
        records: {
          siftersFilters,
          banners: parentBanners,
        }
      }
    };

    const cpanel: CpanelData = {
      fetchedData: siftersFilters,
      from: "sifters",
      to: "filters",
    };

    return {
      success: true,
      response,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'course',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/course']
          : ['/convolution/cpanel', '/convolution/course'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'course' }
        : formatters === "app"
          ? response
          : undefined
    };
  } else if (fromto === "siftersinstructions") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const siftersInstructions = {
      instructions: selected.map(toInstructionEntityFromStashRow),
      sifters: selected.map(predicate2("sifterId", fromto)).flat(),
    };
    // Convert course banners to DataRow format similar to RowsExtractorDEF.ts
    const containers = resolvedCourseBanners;
    const isQuizSiftersInstructions =
      (courseBanners == null || courseBanners.length === 0) && quizBanners.length > 0;
    const parentChildMock = isQuizSiftersInstructions
      ? bannersMocks('dashboards', 'sifters')
      : bannersMocks('foundation', 'sifters');
    const metadatas = containers
      .filter(({ isHighlighted }: Banner) => isHighlighted)
      .map(parentChildMock);
    const mockedData0 = entities.getProperty('sifters', "mockedData");
    const connections0 = entities.getProperty('sifters', "connections");
    const mocks = mockedData0?.(metadatas, connections0 ?? []) ?? [];
    const data = mocks.map((mock: MockedDataReturnTypes) => mock)
      .map((mock) => {
        const metadata = mock.metadata as BannerInput;
        const statusValue = typeof metadata.status === 'number'
          ? metadata.status
          : (metadata.status as Status)?.current ?? 0;
        return filterPred({
          ...mock,
          metadata: {
            ...mock.metadata,
            status: statusValue,
            sizeInBytes: metadata.sizeInBytes ?? 0,
          } as FilterMetadata
        });
      })
      .map((item: DataRow) => declare([])(item));
    const foundationSifters = {
      records: { siftersInstructions },
      foundation: metadataMoldsFromRows(data),
      sifters: data.map(predicat0).map(({ id, ...rest }: DataRow) => ({ ...rest, id: parseInt(id.toString()) })),
    };
    const resp: CourseThunkPayload = { content: { records: { foundationSifters } } };

    const sucMsg = courseExtractNotification(fromto, selected.length, formatters, contentWebapp);

    const cpanel: CpanelData = {
      fetchedData: siftersInstructions,
      to: "instructions",
      from: "sifters",
    };

    return {
      success: true,
      response: resp,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'course',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/course']
          : ['/convolution/cpanel', '/convolution/course'],
      thunkAction: formatters === "cpanelapp" ? resp : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'course' }
        : formatters === "app"
          ? resp
          : undefined
    };
  } else if (fromto === "filtersinstructions") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const sucMsg = courseExtractNotification(fromto, selected.length, formatters, contentWebapp);

    // Validation logic for course content
    if (formatters !== "cpanel") {
      const { banners, content } = { banners: resolvedCourseBanners, content: resolvedCourseContent };
      const pennantPred = ({ pennants }: Banner) =>
        selected.find((row: DataRow) => {
          const fids = getLinkTableIdsForPennantMatch(row, fromto);
          return pennants.find(({ id }: Pennant) => fids.includes(id));
        });
      const matches = banners.filter(pennantPred);

      if (matches.length === 0) {
        return { success: false, error: er9 };
      }

      const covers = content
        .map(({ slides, ...obj }: SlideGroup) => Object.values(obj))
        .map(([{ bannerId }]: SlideItem[], i: number, arr: SlideItem[][]) => ({
          bannerId,
          total: arr[i].length,
        }));

      const coversPred0 = ({ pennants: b }: Banner) =>
        covers.find(({ bannerId }: { bannerId: number, total: number }) => b[0]?.bannerId === bannerId);
      const matches000 = matches.filter(coversPred0);
      const errMsg = `${matches.length} Pennants have no Covers, unTabulate aborted`;

      if (matches000.length === 0) {
        return { success: false, error: errMsg };
      }

      // Note: Warning message calculation moved to return statement
    }
    const filtersInstructions = {
      instructions: selected.map(toInstructionEntityFromStashRow),
      filters: selected.map(predicate2("filterId", fromto)).flat(),
    };
    // Convert course banners (pennants) to DataRow format similar to RowsExtractorDEF.ts
    const banners = resolvedCourseBanners;
    const selectedPennants = banners
      .map(({ pennants }: Banner) => pennants)
      .flat()
      .filter(predicate)
      .filter(noDuplicates);
    const metadatas: PennantInput[] = selectedPennants.map(pennantsMocks('foundation', 'filters'));
    const mockedData0 = entities.getProperty('filters', "mockedData");
    const connections0 = entities.getProperty('filters', "connections");
    const mocks = mockedData0?.(metadatas, connections0 ?? []) ?? [];
    const data = mocks.map((mock: MockedDataReturnTypes) => mock)
      .map((mock) => {
        const metadata = mock.metadata as PennantInput;
        const statusValue = typeof metadata.status === 'number'
          ? metadata.status
          : (metadata.status as Status)?.current ?? 0;
        return filterPred({
          ...mock,
          metadata: {
            ...mock.metadata,
            status: statusValue,
            sizeInBytes: metadata.sizeInBytes ?? 0,
          } as FilterMetadata
        });
      })
      .map((item: DataRow) => declare([])(item));

    const foundationFilters = {
      records: { filtersInstructions },
      foundation: metadataMoldsFromRows(data),
      filters: data.map(predicat0).map(({ id, ...rest }: DataRow) => ({ ...rest, id: parseInt(id as string) })),
    };
    const resp: TutorialThunkPayload = { content: { records: { foundationFilters } } };

    const cpanel: CpanelData = {
      fetchedData: filtersInstructions,
      to: "instructions",
      from: "filters",
    };

    // Check for warning (if validation was performed)
    let warning: string | undefined;
    if (formatters !== "cpanel") {
      const { banners: courseBannerItems, content } = { banners: resolvedCourseBanners, content: resolvedCourseContent };
      const pennantPred = ({ pennants }: Banner) =>
        selected.find((row: DataRow) => {
          const fids = getLinkTableIdsForPennantMatch(row, fromto);
          return pennants.find(({ id }: Pennant) => fids.includes(id));
        });
      const matches = courseBannerItems.filter(pennantPred);
      if (matches.length > 0) {
        const covers = content
          .map(({ slides, ...obj }: SlideGroup) => Object.values(obj))
          .map(([{ bannerId }]: SlideItem[], i: number, arr: SlideItem[][]) => ({
            bannerId,
            total: arr[i].length,
          }));
        const coversPred = ({ pennants }: Banner) =>
          covers.find(
            ({ bannerId, total }: { bannerId: number, total: number }) =>
              pennants.length > total &&
              pennants[0]?.bannerId === bannerId
          );
        const matches00 = matches.filter(coversPred);
        if (matches00.length > 0) {
          warning = `warning: ${matches00.length} Banners have more Pennants than Covers`;
        }
      }
    }

    return {
      success: true,
      response: resp,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      warning,
      webapp: 'course',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/course']
          : ['/convolution/cpanel', '/convolution/course'],
      thunkAction: formatters === "cpanelapp" ? resp : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'course' }
        : formatters === "app"
          ? resp
          : undefined
    };
  }

  return { success: false, error: "invalid course route" };
};
const handleTutorialDestination = (
  params: TutorialExtractContentParams,
  predicate: ReturnType<typeof createPredicate>
): ExtractContentResult => {
  const {
    fromto,
    fetchedData,
    formatters,
    showSuc,
    tutorialBanners = []
  } = params;

  if (fromto === "foundationfilters") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const foundationFilters = {
      foundation: metadataMoldsFromRows(selected),
      filters: selected.map(toFilterEntityFromStashRow),
    };

    const sucMsg = buildInsertedMsg(selected.length, 'Banners', extractTargetLabel('tutorial', formatters));
    const response: TutorialThunkPayload = { content: { records: { foundationFilters } } };

    const cpanel: CpanelData = {
      fetchedData: foundationFilters,
      from: "foundation",
      to: "filters",
    };

    return {
      success: true,
      response,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'tutorial',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/tutorial']
          : ['/convolution/cpanel', '/convolution/tutorial'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'tutorial' }
        : formatters === "app"
          ? response
          : undefined
    };
  } else if (fromto === "filtersinstructions") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const filtersInstructions = {
      instructions: selected.map(toInstructionEntityFromStashRow),
      filters: selected.map(predicate2("filterId", fromto)).flat(),
    };

    // Convert tutorial banners to DataRow format similar to RowsExtractorDEF.ts
    const containers = tutorialBanners;
    const highlightedBanners = containers.filter(({ isHighlighted }) => isHighlighted);
    // Cascade unstash can run extract before every banner is flagged; use those or all.
    const metadatas = (highlightedBanners.length > 0 ? highlightedBanners : containers)
      .map(bannersMocks('foundation', 'filters'));
    const mockedData0 = entities.getProperty('filters', "mockedData");
    const connections0 = entities.getProperty('filters', "connections");
    const mocks = mockedData0?.(metadatas, connections0 ?? []) ?? [];
    const data = mocks.map((mock: MockedDataReturnTypes) => mock)
      .map((mock) => {
        const metadata = mock.metadata as BannerInput;
        const statusValue = typeof metadata.status === 'number'
          ? metadata.status
          : (metadata.status as Status)?.current ?? 0;
        return filterPred({
          ...mock,
          metadata: {
            ...mock.metadata,
            status: statusValue,
            sizeInBytes: metadata.sizeInBytes ?? 0,
          } as FilterMetadata
        });
      })
      .map((item: DataRow) => declare([])(item));
    const foundationFilters = {
      records: { filtersInstructions },
      foundation: metadataMoldsFromRows(data),
      filters: data.map(predicat0).map(({ id, ...rest }: DataRow) => ({ ...rest, id: parseInt(id.toString()) })),
    };

    const resp: TutorialThunkPayload = { content: { records: { foundationFilters } } };
    const sucMsg = buildInsertedMsg(selected.length, 'Steps', extractTargetLabel('tutorial', formatters));

    const cpanel: CpanelData = {
      fetchedData: filtersInstructions,
      to: "instructions",
      from: "filters",
    };

    return {
      success: true,
      response: resp,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'tutorial',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/tutorial']
          : ['/convolution/cpanel', '/convolution/tutorial'],
      thunkAction: formatters === "cpanelapp" ? resp : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'tutorial' }
        : formatters === "app"
          ? resp
          : undefined
    };
  }

  return { success: false, error: "invalid tutorial route" };
};
const handleTutorsDestination = (
  params: TutorsExtractContentParams,
  predicate: ReturnType<typeof createPredicate>
): ExtractContentResult => {
  const { fromto, fetchedData, formatters, showSuc } = params;
  const tutorsTarget = formatters === "cpanel"
    ? "Cpanel"
    : formatters === "app"
      ? "Tutors"
      : "Cpanel and Tutors";

  if (fromto === "foundationbosses") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const foundationBosses = {
      foundation: metadataMoldsFromRows(selected),
      bosses: selected.map(predicat0).map(({ id, ...rest }: DataRow) => ({ ...rest, id: parseInt(id.toString()) })),
    };

    const sucMsg = `inserted ${selected.length} Admins into ${tutorsTarget}`;
    const response: TutorsThunkPayload = {
      content: {
        records: {
          foundationBosses,
        }
      }
    };
    const cpanel: CpanelData = {
      fetchedData: foundationBosses,
      from: "foundation",
      to: "bosses",
    };

    return {
      success: true,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'tutors',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/tutors']
          : ['/convolution/cpanel', '/convolution/tutors'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'tutors' }
        : formatters === "app"
          ? response
          : undefined
    };
  } else if (fromto === "foundationminions") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const foundationMinions = {
      foundation: metadataMoldsFromRows(selected),
      minions: selected.map(predicat0).map(({ id, ...rest }: DataRow) => ({ ...rest, id: parseInt(id.toString()) })),
    };

    const sucMsg = `inserted ${selected.length} Members into ${tutorsTarget}`;
    const response: TutorsThunkPayload = {
      content: {
        records: {
          foundationMinions,
        }
      }
    };
    const cpanel: CpanelData = {
      fetchedData: foundationMinions,
      from: "foundation",
      to: "minions",
    };

    return {
      success: true,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'tutors',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/tutors']
          : ['/convolution/cpanel', '/convolution/tutors'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'tutors' }
        : formatters === "app"
          ? response
          : undefined
    };
  } else if (fromto === "foundationunderbosses") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const foundationUnderbosses = {
      foundation: metadataMoldsFromRows(selected),
      underbosses: selected.map(predicat0).map(({ id, ...rest }: DataRow) => ({ ...rest, id: parseInt(id.toString()) })),
    };

    const sucMsg = `inserted ${selected.length} Moderators into ${tutorsTarget}`;
    const response: TutorsThunkPayload = {
      content: {
        records: {
          foundationUnderbosses,
        }
      }
    };
    const cpanel: CpanelData = {
      fetchedData: foundationUnderbosses,
      from: "foundation",
      to: "underbosses",
    };

    return {
      success: true,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'tutors',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/tutors']
          : ['/convolution/cpanel', '/convolution/tutors'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'tutors' }
        : formatters === "app"
          ? response
          : undefined
    };
  }

  return { success: false, error: "invalid tutors route" };
};
const handleIncomingDestination = (
  params: IncomingExtractContentParams,
  predicate: ReturnType<typeof createPredicate>
): ExtractContentResult => {
  const { fromto, fetchedData, formatters, showSuc, mailer } = params;
  const incomingTarget = formatters === "cpanel"
    ? "Cpanel"
    : formatters === "app"
      ? "Incoming"
      : "Cpanel and Incoming";

  if (fromto === "foundationfilters") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const foundationFilters = {
      foundation: metadataMoldsFromRows(selected),
      filters: selected.map(predicat0).map(({ id, ...rest }: DataRow) => ({ ...rest, id: parseInt(id.toString()) })),
    };

    const sucMsg = `inserted ${selected.length} Filters into ${incomingTarget}`;
    const response: IncomingThunkPayload = {
      content: {
        records: {
          foundationFilters,
        }
      },
      mailer,
    };
    const cpanel: CpanelData = {
      fetchedData: foundationFilters,
      from: "foundation",
      to: "filters",
    };

    return {
      success: true,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'incoming',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/incoming']
          : ['/convolution/cpanel', '/convolution/incoming'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'incoming' }
        : formatters === "app"
          ? response
        : undefined
    };
  } else if (fromto === "foundationsifters") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const foundationSifters = {
      foundation: metadataMoldsFromRows(selected),
      sifters: selected.map(predicat0).map(({ id, ...rest }: DataRow) => ({ ...rest, id: parseInt(id.toString()) })),
    };

    const sucMsg = `inserted ${selected.length} Classifiers into ${incomingTarget}`;
    const response: IncomingThunkPayload = {
      content: {
        records: {
          foundationSifters,
        }
      },
      mailer,
    };
    const cpanel: CpanelData = {
      fetchedData: foundationSifters,
      from: "foundation",
      to: "sifters",
    };

    return {
      success: true,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'incoming',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/incoming']
          : ['/convolution/cpanel', '/convolution/incoming'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'incoming' }
        : formatters === "app"
          ? response
        : undefined
    };
  } else if (fromto === "foundationdashboards") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const foundationDashboards = {
      foundation: metadataMoldsFromRows(selected),
      dashboards: selected.map(predicat0).map(({ id, ...rest }: DataRow) => ({ ...rest, id: parseInt(id as string) })),
    };

    const sucMsg = `inserted ${selected.length} Dashboards into ${incomingTarget}`;
    const response: IncomingThunkPayload = {
      content: {
        records: {
          foundationDashboards,
        }
      },
      mailer,
    };
    const cpanel: CpanelData = {
      fetchedData: foundationDashboards,
      from: "foundation",
      to: "dashboards",
    };

    return {
      success: true,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'incoming',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/incoming']
          : ['/convolution/cpanel', '/convolution/incoming'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'incoming' }
        : formatters === "app"
          ? response
        : undefined
    };
  } else if (fromto === "foundationinstructions") {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const foundationInstructions = {
      foundation: metadataMoldsFromRows(selected),
      instructions: selected.map(predicat0).map(({ id, ...rest }: DataRow) => ({ ...rest, id: parseInt(id as string) })),
    };

    const sucMsg = `inserted ${selected.length} Steps into ${incomingTarget}`;
    const response: IncomingThunkPayload = {
      content: {
        records: {
          foundationInstructions,
        }
      },
      mailer,
    };
    const cpanel: CpanelData = {
      fetchedData: foundationInstructions,
      from: "foundation",
      to: "instructions",
    };

    return {
      success: true,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'incoming',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/incoming']
          : ['/convolution/cpanel', '/convolution/incoming'],
      thunkAction: formatters === "cpanelapp" ? response : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'incoming' }
        : formatters === "app"
          ? response
        : undefined
    };
  }

  return { success: false, error: "invalid incoming route" };
};
const handleOutgoingDestination = (
  params: OutgoingExtractContentParams,
  predicate: ReturnType<typeof createPredicate>
): ExtractContentResult => {
  const { fromto, fetchedData, formatters, showSuc } = params;

  const handleOutgoingCase = (
    fromEntity: string,
    toEntity: string,
    idField: string
  ) => {
    const selected = fetchedData.filter(predicate);
    if (selected.length === 0) {
      return { success: false, error: errorMsg1 };
    }

    const entityData: Record<string, CpanelRow[]> = {
      [toEntity]: selected.map(predicat0),
      [fromEntity]: selected.map(predicate2(idField, fromto)).flat(),
    };

    const resp: OutgoingThunkPayload = {
      content: {
        records: {
          [`${fromEntity}${toEntity.charAt(0).toUpperCase() + toEntity.slice(1)}`]: entityData
        }
      }
    };
    const sucMsg = `inserted ${selected.length} ${toEntity}`;

    const cpanel: CpanelData = {
      fetchedData: entityData,
      from: fromEntity,
      to: toEntity,
    };

    return {
      success: true,
      response: resp,
      cpanel,
      sucMsg: showSuc ? sucMsg : undefined,
      webapp: 'outgoing',
      routes: formatters === "cpanel"
        ? ['/convolution/cpanel']
        : formatters === "app"
          ? ['/convolution/outgoing']
          : ['/convolution/cpanel', '/convolution/outgoing'],
      thunkAction: formatters === "cpanelapp" ? resp : undefined,
      nextAction: formatters === "cpanel" || formatters === "cpanelapp"
        ? { ...cpanel, webapp: 'outgoing' }
        : formatters === "app"
          ? resp
          : undefined
    };
  };

  const outgoingCases: Record<string, [string, string, string]> = {
    "minionsfilters": ["minions", "filters", "minionId"],
    "minionssifters": ["minions", "sifters", "minionId"],
    "minionsdashboards": ["minions", "dashboards", "minionId"],
    "minionsinstructions": ["minions", "instructions", "minionId"],
    "bossesfilters": ["bosses", "filters", "bossId"],
    "bossessifters": ["bosses", "sifters", "bossId"],
    "bossesdashboards": ["bosses", "dashboards", "bossId"],
    "bossesinstructions": ["bosses", "instructions", "bossId"],
    "underbossesfilters": ["underbosses", "filters", "underbossId"],
    "underbossessifters": ["underbosses", "sifters", "underbossId"],
    "underbossesdashboards": ["underbosses", "dashboards", "underbossId"],
    "underbossesinstructions": ["underbosses", "instructions", "underbossId"],
  };

  const caseParams = outgoingCases[fromto];
  if (caseParams) {
    const [fromEntity, toEntity, idField] = caseParams;
    return handleOutgoingCase(fromEntity, toEntity, idField);
  }

  return { success: false, error: "invalid outgoing route" };
};

export const extractContentLogic = (params: ExtractContentParams): ExtractContentResult => {
  const { destination, selecttype } = params;
  const predicate = createPredicate(selecttype);

  switch (destination) {
    case "quiz":
      return handleQuizDestination(params, predicate);
    case "tutorial":
      return handleTutorialDestination(params, predicate);
    case "course":
      return handleCourseDestination(params, predicate);
    case "tutors":
      return handleTutorsDestination(params, predicate);
    case "incoming":
      return handleIncomingDestination(params, predicate);
    case "outgoing":
      return handleOutgoingDestination(params, predicate);
    default:
      return { success: false, error: "unknown destination webapp" };
  }
};

