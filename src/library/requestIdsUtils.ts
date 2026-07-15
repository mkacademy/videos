import { getCurAppName } from '../utils';
import { Banner as TutorialBanner } from '../store/slices/tutorialSlice';
import { Banner, Pennant, SlideGroup, SlideGroupItem } from './CourseUtils';
import { Quiz } from '../store/slices/quizSlice';
import { SelectedRoute } from '../store/slices/searchSlice';
import { RootState } from '../store';

const transformSlideGroupItem = (item: SlideGroupItem) => ({
    id: item.id,
    bannerId: item.bannerId
});

const transformCourseSlideGroup = (courseId: number) => (slideGroup: SlideGroup) => {
    const { slides, ...thumbs } = slideGroup;
    const transformedProps: Record<number, Partial<SlideGroupItem>> = {};
    const filteredEntries = Object.entries(thumbs)
        .filter(([_, value]: [string, SlideGroupItem]) => value.bannerId === courseId && value.id > 0)
        .sort(([_, a], [__, b]) => a.sizeInBytes - b.sizeInBytes);

    if (filteredEntries.length > 0) {
        const [_key, value] = filteredEntries[0];
        transformedProps[0] = transformSlideGroupItem(value);
    }

    return {
        ...transformedProps,
        slides: []
    };
};

export const transformCourseSlideGroups = (slideGroups: SlideGroup[], courseId: number) => {
    return slideGroups.map(transformCourseSlideGroup(courseId));
};

export const pennantTutorialBannerPred = (banner: Pennant | TutorialBanner): {
    id: number, ordinal: number, bannerId?: number | undefined, isHighlighted: boolean, descendentsSums: Record<string, number>
} => {
    return {
        id: banner.id,
        ordinal: banner.ordinal,
        bannerId: banner.bannerId,
        isHighlighted: banner.isHighlighted,
        descendentsSums: banner.descendentsSums,
    }
}

const hasHighlightedCoursePennant = (banners: Banner[]): boolean =>
    banners.some((banner) => banner.pennants.some((pennant) => pennant.isHighlighted));

const getPennantIdsFromSelectedChapters = (
    course: Pick<RootState['course'], 'banners' | 'selected' | 'content' | 'chapters'>
): number[] => {
    const { banners, selected, content, chapters } = course;
    if (chapters.length === 0 || selected < 0) return [];
    const selectedBanner = banners[selected];
    if (!selectedBanner) return [];
    const selectedContent = content.find((group) => group[0]?.bannerId === selectedBanner.id);
    const slides = selectedContent?.slides;
    if (!slides) return [];
    const pennantIds = new Set<number>();
    for (const chapterIndex of chapters) {
        const slideRow = slides[chapterIndex];
        const firstSlide = slideRow?.[0];
        if (firstSlide?.bannerId) pennantIds.add(firstSlide.bannerId);
    }
    return [...pennantIds];
};

export const buildChapterPennantFallback = (course: RootState['course']) => {
    if (hasHighlightedCoursePennant(course.banners) || course.chapters.length === 0) return undefined;
    const chapterPennantIds = getPennantIdsFromSelectedChapters(course);
    return chapterPennantIds.length > 0 ? { chapterPennantIds } : undefined;
};

const resolveFiltersInstructionPennants = (
    banner: Banner,
    chapterPennantIds?: number[]
): ReturnType<typeof pennantTutorialBannerPred>[] => {
    const highlighted = banner.pennants.filter((pennant) => pennant.isHighlighted);
    if (highlighted.length > 0) {
        return highlighted.map(pennantTutorialBannerPred);
    }
    if (chapterPennantIds && chapterPennantIds.length > 0) {
        return banner.pennants
            .filter((pennant) => chapterPennantIds.includes(pennant.id))
            .map((pennant) => pennantTutorialBannerPred({ ...pennant, isHighlighted: true }));
    }
    return [];
};

export const bannerPred = (selectedQueryRoute: string, options?: { chapterPennantIds?: number[] }) => (banner: Banner): {
    id: number, ordinal: number, bannerId?: number | undefined, isHighlighted: boolean, descendentsSums: Record<string, number>, pennants: ReturnType<typeof pennantTutorialBannerPred>[]
} => {
    return {
        id: banner.id,
        ordinal: banner.ordinal,
        bannerId: banner.bannerId,
        isHighlighted: banner.isHighlighted,
        descendentsSums: banner.descendentsSums,
        pennants: selectedQueryRoute === 'filtersinstructions' ?
            resolveFiltersInstructionPennants(banner, options?.chapterPennantIds) : [],
    }
}

export const quizBannerPred = (selectedQueryRoute: string) => (banner: Banner): {
    id: number, ordinal: number, bannerId?: number | undefined, isHighlighted: boolean, descendentsSums: Record<string, number>, pennants: ReturnType<typeof pennantTutorialBannerPred>[]
} => {
    return {
        id: banner.id,
        ordinal: banner.ordinal,
        bannerId: banner.bannerId,
        isHighlighted: banner.isHighlighted,
        descendentsSums: banner.descendentsSums,
        pennants: selectedQueryRoute === 'filtersinstructions' ? banner.pennants.map(pennantTutorialBannerPred) : [],
    }
}

export const quizPred = (quiz: Quiz) => {
    return {
        id: quiz.id,
        descendentsSums: quiz.descendentsSums,
    }
}

export const bannerOrTutorialBannerOrQuizPred = (id: number) => {
    return (banner: Banner | TutorialBanner | Quiz) => {
        return id && banner.id === id;
    }
}

export const highBannerPred = (quizId: number) => (banner: Banner) => {
    return banner.bannerId === quizId && banner.isHighlighted;
}

const transformQuizSlideGroup = (quizBanners: ReturnType<ReturnType<typeof quizBannerPred>>[]) => (slideGroup: SlideGroup) => {
    const { slides, ...thumbs } = slideGroup;
    const transformedProps: Record<number, Partial<SlideGroupItem>> = {};
    const filteredEntries = Object.entries(thumbs)
        .filter(([_, value]: [string, SlideGroupItem]) => quizBanners.some((banner) => banner.id === value.bannerId && value.id > 0))
        .sort(([_, a], [__, b]) => a.sizeInBytes - b.sizeInBytes);
    if (filteredEntries.length > 0) {
        const [_key, value] = filteredEntries[0];
        transformedProps[0] = transformSlideGroupItem(value);
    } return {
        ...transformedProps,
        slides: []
    };
};

export const transformQuizSlideGroups = (slideGroups: SlideGroup[], quizBanners: ReturnType<ReturnType<typeof quizBannerPred>>[]) => {
    return slideGroups.map(transformQuizSlideGroup(quizBanners));
};

export interface StatsPayload {
    app: string,
    webapp: number,
    curMailer: number,
    selectedT: number,
    selectedC: number,
    selectedQ: number,
    quizzes: { id: number }[],
    selectedRoute: SelectedRoute,
    selecteds: Record<number, string>,
    pennants: ReturnType<ReturnType<typeof bannerPred>>[],
    banners: ReturnType<typeof pennantTutorialBannerPred>[],
    pennantz: ReturnType<ReturnType<typeof quizBannerPred>>[],
}

export type QuizBannerIdsAtRequest = {
    id: number;
    bannerId?: number;
    ordinal: number;
    pennantIds: number[];
};

export type CourseBannerIdsAtRequest = {
    id: number;
    pennantIds: number[];
};

/** Snapshot of container ids sent in a records request body (keyed by thunk requestId). */
export type RequestContainerIds = {
    quiz?: {
        quizzes: number[];
        banners: QuizBannerIdsAtRequest[];
    };
    course?: {
        banners: CourseBannerIdsAtRequest[];
    };
    tutorial?: {
        banners: number[];
    };
};

export type IDsAtRequestState = Record<string, RequestContainerIds>;

const hasHighlightedQuizQuestion = (banners: Banner[], quizId: number): boolean =>
    banners.some((banner) => banner.bannerId === quizId && banner.isHighlighted);

const buildQuizQuestionFallback = (
    quiz: RootState['quiz'],
    quizId: number,
) => {
    if (hasHighlightedQuizQuestion(quiz.banners, quizId)) return undefined;
    return undefined;
};

const resolveQuizBannersForRequest = (
    quiz: RootState['quiz'],
    quizId: number,
    selectedQueryRoute: string,
    options?: { followupQuestionId?: number }
): ReturnType<ReturnType<typeof quizBannerPred>>[] => {
    const highlighted = quiz.banners.filter(highBannerPred(quizId));
    if (highlighted.length > 0) {
        return highlighted.map(quizBannerPred(selectedQueryRoute));
    }
    if (options?.followupQuestionId !== undefined) {
        const followup = quiz.banners.find((banner) => banner.id === options.followupQuestionId);
        if (followup) {
            return [quizBannerPred(selectedQueryRoute)({ ...followup, isHighlighted: true })];
        }
    }
    return [];
};

export type RecordStateProps = {
    quizzes: { id: number }[];
    pennants: ReturnType<ReturnType<typeof bannerPred>>[];
    banners: ReturnType<typeof pennantTutorialBannerPred>[];
    pennantz: ReturnType<ReturnType<typeof quizBannerPred>>[];
    content: ReturnType<typeof transformCourseSlideGroups>;
    selecteds: Record<number, string>;
    selectedT: number;
    selectedC: number;
    selectedQ: number;
    webapp: number;
    contend: ReturnType<typeof transformQuizSlideGroups>;
};

export const buildRecordStateProps = (state: RootState, curApp: number): RecordStateProps => {
    const app = getCurAppName(curApp);
    const selectedQueryRoute = state.pagination.selectedRoutes[curApp];
    const quiz = app === 'quiz' ? state.quiz.quizzes[state.quiz.selected]?.id : undefined;
    const course = app === 'course' ? state.course.banners[state.course.selected]?.id : undefined;
    const tutorial = app === 'tutorial' ? state.tutorial.banners[state.tutorial.selected]?.id : undefined;
    const chapterPennantFallback = buildChapterPennantFallback(state.course);
    const quizQuestionFallback = quiz !== undefined
        ? buildQuizQuestionFallback(state.quiz, quiz)
        : undefined;
    const stateProps: RecordStateProps = {
        quizzes: quiz ? state.quiz.quizzes.filter(bannerOrTutorialBannerOrQuizPred(quiz)).map(quizPred) : [],
        pennants: course ? state.course.banners.filter(bannerOrTutorialBannerOrQuizPred(course)).map(bannerPred(selectedQueryRoute, chapterPennantFallback)) : [],
        banners: tutorial ? state.tutorial.banners.filter(bannerOrTutorialBannerOrQuizPred(tutorial)).map(pennantTutorialBannerPred) : [],
        pennantz: quiz ? resolveQuizBannersForRequest(state.quiz, quiz, selectedQueryRoute, quizQuestionFallback) : [],
        content: course ? transformCourseSlideGroups(state.course.content, course) : [],
        selecteds: state.pagination.selectedRoutes,
        selectedT: tutorial ? 0 : -1,
        selectedC: course ? 0 : -1,
        selectedQ: quiz ? 0 : -1,
        webapp: curApp,
        contend: [],
    };
    stateProps.contend = stateProps.pennantz.length > 0
        ? transformQuizSlideGroups(state.quiz.content, stateProps.pennantz)
        : [];
    return stateProps;
};

export const extractIDsAtRequest = (stateProps: RecordStateProps): RequestContainerIds => {
    const ids: RequestContainerIds = {};
    if (stateProps.quizzes.length > 0) {
        ids.quiz = {
            quizzes: stateProps.quizzes.map((quiz) => quiz.id),
            banners: stateProps.pennantz.map((banner) => ({
                id: banner.id,
                bannerId: banner.bannerId,
                ordinal: banner.ordinal,
                pennantIds: banner.pennants.map((pennant) => pennant.id),
            })),
        };
    }
    if (stateProps.pennants.length > 0) {
        ids.course = {
            banners: stateProps.pennants.map((banner) => ({
                id: banner.id,
                pennantIds: [...banner.pennants]
                    .sort((a, b) => a.ordinal - b.ordinal)
                    .map((pennant) => pennant.id),
            })),
        };
    }
    if (stateProps.banners.length > 0) {
        ids.tutorial = {
            banners: stateProps.banners.map((banner) => banner.id),
        };
    }
    return ids;
};
