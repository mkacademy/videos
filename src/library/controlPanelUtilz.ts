import { QuizState, Quiz, Submition } from "../library/QuizUtils";
import { CourseState, Banner as CourseBanner, Pennant, SlideItem, SlideGroup, SlideGroupItem } from "./CourseUtils";
import { TutorialState, Banner as TutorialBanner, Content as TutorialContent } from "../store/slices/tutorialSlice";
import { CourseTrees, QuizTrees, TutorialTrees } from "../library/controlPanelUtils";

const defaultMetadata = {
    owner: false,
    ordinal: 0,
};
const defaultTutorialRootBanner = {
    id: 0,
    title: '.',
    quote: '.',
    sender: '',
    owner: false,
    ordinal: 0,
    metadata: defaultMetadata,
    sizeInBytes: 0,
    isDismissed: false,
    isHighlighted: false,
    status: 0,
    contiguousOrdinal: 0,
    descendentsSums: { instructions: 0 },
    modified: false,
    edited: false,
};

const defaultTutorialChildRow = {
    ...defaultTutorialRootBanner,
    filterId: 0,
    bannerId: 0,
};

const defaultContent = {
    id: 0,
    title: '.',
    sender: '',
    owner: false,
    content: '.',
    bannerId: 0,
    imageurl: 'data:image',
    metadata: defaultMetadata,
    sizeInBytes: 0,
    isHighlighted: false,
    status: 0,
    ordinal: 0,
    contiguousOrdinal: 0,
    descendentsSums: {},
    isDismissed: false,
    modified: false,
    edited: false,
};

const defaultCourseBanner = {
    id: 0,
    title: '.',
    quote: '.',
    sender: '',
    owner: false,
    ordinal: 0,
    sifterId: 0,
    metadata: defaultMetadata,
    sizeInBytes: 0,
    isDismissed: false,
    isHighlighted: false,
    status: 0,
    pennants: [],
    contiguousOrdinal: 0,
    descendentsSums: { instructions: 0, filters: 0 },
    modified: false,
    edited: false,
};

const defaultQuizBanner = {
    id: 0,
    sender: '',
    owner: false,
    title: '.',
    quote: '.',
    ordinal: 0,
    dashboardId: 0,
    metadata: defaultMetadata,
    sizeInBytes: 0,
    isDismissed: false,
    isHighlighted: false,
    status: 0,
    pennants: [],
    contiguousOrdinal: 0,
    descendentsSums: { sifters: 0, filters: 0 },
    modified: false,
    edited: false,
};

export const flushTutorialTrees = (Trees: TutorialTrees | undefined): Partial<TutorialState> => {
    if (!Trees) {
        return {
            banners: [],
            content: [],
        };
    }

    const banners: TutorialBanner[] = [];
    const contentMap: Record<number, TutorialContent[]> = {};

    // Process banners with content
    Object.entries(Trees).forEach(([bannerIdStr, contentIds]) => {
        if (bannerIdStr === '_orphans') return;

        const bannerId = Number(bannerIdStr);
        const contentIdArray = Array.isArray(contentIds) ? contentIds : [];

        // Create banner
        banners.push({
            ...defaultTutorialRootBanner,
            id: bannerId,
        });

        // Create content items
        if (!contentMap[bannerId]) {
            contentMap[bannerId] = [];
        }
        contentIdArray.forEach((contentId) => {
            contentMap[bannerId].push({
                ...defaultContent,
                id: contentId,
                bannerId: bannerId,
            });
        });
    });

    // Process orphan banners (banners without content)
    if (Trees._orphans) {
        Trees._orphans.forEach((bannerId) => {
            banners.push({
                ...defaultTutorialRootBanner,
                id: bannerId,
            });
            // Ensure empty content array exists for this banner
            if (!contentMap[bannerId]) {
                contentMap[bannerId] = [];
            }
        });
    }

    // Convert content map to array of arrays (grouped by bannerId)
    const content: TutorialContent[][] = Object.values(contentMap).filter(arr => arr.length > 0);

    return {
        banners,
        content,
    };
};

export const flushCourseTrees = (Trees: CourseTrees | undefined): Partial<CourseState> => {
    if (!Trees) {
        return {
            banners: [],
            content: [],
        };
    }

    const banners: CourseBanner[] = [];
    const contentMap: Record<number, SlideGroup> = {};

    // Process banners with children
    Object.entries(Trees).forEach(([bannerIdStr, children]) => {
        if (bannerIdStr === '_orphans') return;

        const bannerId = Number(bannerIdStr);
        const pennants: Pennant[] = [];
        const slideGroupItems: SlideGroupItem[] = [];
        const slidesByPennantId: Record<number, SlideItem[]> = {};

        // Check if children is an object with pennants and/or slideGroupItems
        if (typeof children === 'object' && children !== null) {
            const childrenRecord = children as Record<string, unknown>;
            const keyedPennantIds = new Set(
                Object.keys(childrenRecord)
                    .filter((key) => key !== '_orphans' && key !== 'slideGroupItems' && Number.isFinite(Number(key)))
                    .map(Number),
            );

            // Process pennants (keys that are numbers, not '_orphans' or 'slideGroupItems')
            Object.entries(children).forEach(([key, value]) => {
                if (key === '_orphans') {
                    // Orphan pennants (pennants without slides). Skip ids also present as keyed
                    // entries — merged trees can list the same pennant in both places.
                    const orphanPennantIds = Array.isArray(value) ? value : [];
                    orphanPennantIds.forEach((pennantId) => {
                        if (keyedPennantIds.has(pennantId)) return;
                        pennants.push({
                            ...defaultTutorialChildRow,
                            id: pennantId,
                            bannerId: bannerId,
                        });
                    });
                } else if (key === 'slideGroupItems') {
                    // Process slideGroupItems
                    const slideGroupItemIds = Array.isArray(value) ? value : [];
                    slideGroupItemIds.forEach((itemId, index) => {
                        slideGroupItems.push({
                            ...defaultContent,
                            id: itemId,
                            ordinal: index,
                            bannerId: bannerId,
                        } as SlideGroupItem);
                    });
                } else {
                    // This is a pennant ID with its slides
                    const pennantId = Number(key);
                    if (!Number.isFinite(pennantId) || pennants.some((p) => p.id === pennantId)) return;
                    const slideIds = Array.isArray(value) ? value : [];

                    // Create pennant
                    pennants.push({
                        ...defaultTutorialChildRow,
                        bannerId: bannerId,
                        id: pennantId,
                    });

                    // Create slides for this pennant
                    if (!slidesByPennantId[pennantId]) {
                        slidesByPennantId[pennantId] = [];
                    }
                    slideIds.forEach((slideId, index) => {
                        slidesByPennantId[pennantId].push({
                            ...defaultContent,
                            id: slideId,
                            ordinal: index,
                            bannerId: pennantId, // slides.bannerId === pennant.id
                        } as SlideItem);
                    });
                }
            });
        }

        // Create banner with pennants
        banners.push({
            ...defaultCourseBanner,
            id: bannerId,
            pennants: pennants.map((pennant, index) => ({ ...pennant, ordinal: index })),
        });

        // Build SlideGroup for this banner
        // SlideGroup structure: { [slideGroupItemId]: SlideGroupItem, slides: SlideItem[][] }
        const slideGroup: SlideGroup = {
            slides: [],
        };

        // Add slideGroupItems as object properties
        slideGroupItems.forEach((item, index) => {
            slideGroup[index] = item;
        });

        // One row per pennant id (keyedPennantIds / pennants are unique after orphan skip)
        pennants.forEach((pennant) => {
            if (slidesByPennantId[pennant.id] && slidesByPennantId[pennant.id].length > 0) {
                slideGroup.slides.push(slidesByPennantId[pennant.id]);
            }
        });

        // Only add to content if there are slideGroupItems or slides
        if (slideGroupItems.length > 0 || slideGroup.slides.length > 0) {
            contentMap[bannerId] = slideGroup;
        }
    });

    // Process orphan banners (banners without children)
    if (Trees._orphans) {
        Trees._orphans.forEach((bannerId) => {
            banners.push({
                ...defaultCourseBanner,
                id: bannerId,
                pennants: [],
            });
        });
    }

    // Convert content map to array
    const content: SlideGroup[] = Object.values(contentMap);

    return {
        banners,
        content,
    };
};

export const flushQuizTrees = (Trees: QuizTrees | undefined): Partial<QuizState> => {
    if (!Trees) {
        return {
            banners: [],
            quizzes: [],
            content: [],
        };
    }

    const quizzes: Quiz[] = [];
    let allBanners: CourseBanner[] = [];
    let allContent: SlideGroup[] = [];

    // Process quizzes with children
    Object.entries(Trees).forEach(([quizIdStr, children]) => {
        if (quizIdStr === '_orphans') return;

        const quizId = Number(quizIdStr);
        const submissions: Submition[] = [];

        // Type guard: check if children is the expected object structure
        if (typeof children === 'object' && children !== null && !Array.isArray(children) 
            && ('banners' in children || 'submissions' in children)) {
            // Process banners (CourseTrees structure)
            if (children.banners) {
                const courseState = flushCourseTrees(children.banners);
                if (courseState.banners) {
                    const newBanners = courseState.banners.map((banner) => ({ ...banner, bannerId: quizId }));
                    allBanners = [...allBanners, ...newBanners];
                }
                if (courseState.content) {
                    allContent = [...allContent, ...courseState.content];
                }
            }

            // Process submissions
            if (children.submissions) {
                const submissionIds = Array.isArray(children.submissions) ? children.submissions : [];
                submissionIds.forEach((submissionId) => {
                    submissions.push({
                        ...defaultTutorialChildRow,
                        id: submissionId,
                        bannerId: quizId, // submission.bannerId === quiz.id
                    });
                });
            }
        }

        // Create quiz
        quizzes.push({
            ...defaultQuizBanner,
            id: quizId,
            pennants: submissions,
        });
    });

    // Process orphan quizzes (quizzes without children)
    if (Trees._orphans) {
        Trees._orphans.forEach((quizId) => {
            quizzes.push({
                ...defaultQuizBanner,
                id: quizId,
                pennants: [],
            });
        });
    }

    return {
        quizzes,
        banners: allBanners,
        content: allContent,
    };
};