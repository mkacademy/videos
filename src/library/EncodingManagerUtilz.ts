import {
  Banner as TutorialBanner,
  Content as TutorialContent,
} from "../store/slices/tutorialSlice";
import {
  Banner as CourseBanner,
  SlideGroup,
  SlideGroupItem,
} from "./CourseUtils";
import { Quiz } from "../store/slices/quizSlice";

// Helper function to check if an item should be kept based on the exception rule
// for removePositiveIdsFrom functions
const shouldKeepItemWithPositiveBannerId = <T extends { id: number; bannerId?: number }>(
  item: T,
  _allItems: T[],
  getBannerById: (id: number) => T | undefined
): boolean => {
  if (item.id >= 0 || !item.bannerId || item.bannerId < 0) {
    return false;
  }

  // Check if bannerId chain leads to root with all positive IDs
  let currentBannerId: number | undefined = item.bannerId;
  const visited = new Set<number>();

  while (currentBannerId !== undefined) {
    if (visited.has(currentBannerId)) {
      // Circular reference detected, break
      return false;
    }
    visited.add(currentBannerId);

    const parent = getBannerById(currentBannerId);
    if (!parent) {
      // Reached root (no parent found)
      return true;
    }

    if (parent.id < 0) {
      // Found a negative ID in the chain
      return false;
    }

    // Check if parent's bannerId is negative (if it exists)
    if (parent.bannerId !== undefined && parent.bannerId < 0) {
      return false;
    }

    currentBannerId = parent.bannerId;
  }

  // Reached root (bannerId is undefined)
  return true;
};

// Helper function to get banner by ID from a collection
const getBannerById = <T extends { id: number }>(
  items: T[],
  id: number
): T | undefined => {
  return items.find((item) => item.id === id);
};

// Tutorial functions
export const removePositiveIdsFromTutorials = ({
  banners,
  content,
}: {
  banners: TutorialBanner[];
  content: TutorialContent[][];
}): { banners: TutorialBanner[]; content: TutorialContent[][] } => {
  // Filter banners
  const filteredBanners = banners.filter((banner) => {
    if (banner.id < 0) {
      // Check exception: negative id but positive bannerId with chain to root
      return shouldKeepItemWithPositiveBannerId(
        banner,
        banners,
        (id) => getBannerById(banners, id)
      );
    }
    // Remove positive IDs
    return false;
  });

  // Filter content (steps)
  const filteredContent = content
    .map((slides) => {
      return slides.filter((step) => {
        if (step.id < 0) {
          // Check exception: negative id but positive bannerId with chain to root
          // For steps, we need to check if their bannerId points to a banner that exists
          // and has a positive ID chain to root
          const parentBanner = getBannerById(banners, step.bannerId);
          if (parentBanner && parentBanner.id >= 0) {
            // Check if parent banner has positive chain to root
            return shouldKeepItemWithPositiveBannerId(
              step,
              [...banners, ...slides.flat()],
              (id) => {
                const banner = getBannerById(banners, id);
                if (banner) return banner;
                return getBannerById(slides.flat(), id);
              }
            );
          }
          return false;
        }
        // Remove positive IDs
        return false;
      });
    })
    .filter((slides) => slides.length > 0);

  return { banners: filteredBanners, content: filteredContent };
};

export const removeNegativeIdsFromTutorials = ({
  banners,
  content,
}: {
  banners: TutorialBanner[];
  content: TutorialContent[][];
}): { banners: TutorialBanner[]; content: TutorialContent[][] } => {
  // Filter banners: remove if id is negative or bannerId is negative
  const filteredBanners = banners.filter(
    (banner) => banner.id >= 0 && (banner.bannerId === undefined || banner.bannerId >= 0)
  );

  // Filter content: remove if id is negative or bannerId is negative
  const filteredContent = content
    .map((slides) =>
      slides.filter((step) => step.id >= 0 && step.bannerId >= 0)
    )
    .filter((slides) => slides.length > 0);

  return { banners: filteredBanners, content: filteredContent };
};

// Course functions
export const removePositiveIdsFromCourses = ({
  banners,
  content,
}: {
  banners: CourseBanner[];
  content: SlideGroup[];
}): { banners: CourseBanner[]; content: SlideGroup[] } => {
  // Filter banners
  const filteredBanners = banners
    .map((banner) => {
      if (banner.id < 0) {
        // Check exception for banner
        const shouldKeep = shouldKeepItemWithPositiveBannerId(
          banner,
          banners,
          (id) => getBannerById(banners, id)
        );
        if (!shouldKeep) {
          return null;
        }
      } else {
        // Remove positive IDs
        return null;
      }

      // Filter pennants within banner
      const filteredPennants = banner.pennants.filter((pennant) => {
        if (pennant.id < 0) {
          // Check exception: pennant with negative id but positive bannerId
          return shouldKeepItemWithPositiveBannerId(
            pennant,
            [...banners, ...banner.pennants],
            (id) => {
              const bannerItem = getBannerById(banners, id);
              if (bannerItem) return bannerItem;
              return getBannerById(banner.pennants, id);
            }
          );
        }
        return false;
      });

      return { ...banner, pennants: filteredPennants };
    })
    .filter((banner): banner is CourseBanner => banner !== null);

  // Filter content (SlideGroups)
  const filteredContent = content
    .map((group) => {
      const { slides, ...groupItems } = group;
      const filteredGroupItems: Record<number, SlideGroupItem> = {};
      const allSlideGroupItems: SlideGroupItem[] = Object.values(groupItems);

      // Filter SlideGroupItems (numeric keys)
      Object.entries(groupItems).forEach(([key, item]) => {
        if (typeof item === "object" && item !== null && "id" in item) {
          const slideGroupItem = item as SlideGroupItem;
          if (slideGroupItem.id < 0) {
            // Check exception
            const shouldKeep = shouldKeepItemWithPositiveBannerId(
              slideGroupItem,
              [...banners, ...allSlideGroupItems],
              (id) => {
                const banner = getBannerById(banners, id);
                if (banner) return banner;
                return getBannerById(allSlideGroupItems, id);
              }
            );
            if (shouldKeep) {
              filteredGroupItems[parseInt(key)] = slideGroupItem;
            }
          }
        }
      });

      // Filter slides (SlideItem[][])
      const filteredSlides = slides
        .map((slideArray) => {
          return slideArray.filter((slideItem) => {
            if (slideItem.id < 0) {
              // Check exception
              return shouldKeepItemWithPositiveBannerId(
                slideItem,
                [...banners, ...allSlideGroupItems, ...slideArray],
                (id) => {
                  const banner = getBannerById(banners, id);
                  if (banner) return banner;
                  const groupItem = getBannerById(allSlideGroupItems, id);
                  if (groupItem) return groupItem;
                  return getBannerById(slideArray, id);
                }
              );
            }
            return false;
          });
        })
        .filter((slideArray) => slideArray.length > 0);

      // Only return group if it has items or slides
      if (
        Object.keys(filteredGroupItems).length > 0 ||
        filteredSlides.length > 0
      ) {
        return {
          ...filteredGroupItems,
          slides: filteredSlides,
        } as SlideGroup;
      }
      return null;
    })
    .filter((group): group is SlideGroup => group !== null);

  return { banners: filteredBanners, content: filteredContent };
};

export const removeNegativeIdsFromCourses = ({
  banners,
  content,
}: {
  banners: CourseBanner[];
  content: SlideGroup[];
}): { banners: CourseBanner[]; content: SlideGroup[] } => {
  // Filter banners: remove if id is negative or bannerId is negative
  const filteredBanners = banners
    .map((banner) => {
      if (banner.id < 0 || (banner.bannerId !== undefined && banner.bannerId < 0)) {
        return null;
      }

      // Filter pennants: remove if id is negative or bannerId is negative
      const filteredPennants = banner.pennants.filter(
        (pennant) => pennant.id >= 0 && pennant.bannerId >= 0
      );

      return { ...banner, pennants: filteredPennants };
    })
    .filter((banner): banner is CourseBanner => banner !== null);

  // Filter content
  const filteredContent = content
    .map((group) => {
      const { slides, ...groupItems } = group;
      const filteredGroupItems: Record<number, SlideGroupItem> = {};

      // Filter SlideGroupItems
      Object.entries(groupItems).forEach(([key, item]) => {
        if (typeof item === "object" && item !== null && "id" in item) {
          const slideGroupItem = item as SlideGroupItem;
          if (
            slideGroupItem.id >= 0 &&
            slideGroupItem.bannerId >= 0
          ) {
            filteredGroupItems[parseInt(key)] = slideGroupItem;
          }
        }
      });

      // Filter slides
      const filteredSlides = slides
        .map((slideArray) =>
          slideArray.filter(
            (slideItem) => slideItem.id >= 0 && slideItem.bannerId >= 0
          )
        )
        .filter((slideArray) => slideArray.length > 0);

      // Only return group if it has items or slides
      if (
        Object.keys(filteredGroupItems).length > 0 ||
        filteredSlides.length > 0
      ) {
        return {
          ...filteredGroupItems,
          slides: filteredSlides,
        } as SlideGroup;
      }
      return null;
    })
    .filter((group): group is SlideGroup => group !== null);

  return { banners: filteredBanners, content: filteredContent };
};

// Quiz functions
export const removePositiveIdsFromQuizzes = ({
  quizzes,
  banners,
  content,
}: {
  quizzes: Quiz[];
  banners: CourseBanner[];
  content: SlideGroup[];
}): { quizzes: Quiz[]; banners: CourseBanner[]; content: SlideGroup[] } => {
  // Filter quizzes
  const filteredQuizzes = quizzes
    .map((quiz) => {
      if (quiz.id < 0) {
        // Check exception for quiz
        const shouldKeep = shouldKeepItemWithPositiveBannerId(
          quiz,
          quizzes,
          (id) => getBannerById(quizzes, id)
        );
        if (!shouldKeep) {
          return null;
        }
      } else {
        // Remove positive IDs
        return null;
      }

      // Filter pennants (Submitions) within quiz
      const filteredPennants = quiz.pennants.filter((pennant) => {
        if (pennant.id < 0) {
          // Check exception: pennant with negative id but positive bannerId
          return shouldKeepItemWithPositiveBannerId(
            pennant,
            [...quizzes, ...quiz.pennants],
            (id) => {
              const quizItem = getBannerById(quizzes, id);
              if (quizItem) return quizItem;
              return getBannerById(quiz.pennants, id);
            }
          );
        }
        return false;
      });

      return { ...quiz, pennants: filteredPennants };
    })
    .filter((quiz): quiz is Quiz => quiz !== null);

  // Filter banners (same logic as courses)
  const filteredBanners = banners
    .map((banner) => {
      if (banner.id < 0) {
        const shouldKeep = shouldKeepItemWithPositiveBannerId(
          banner,
          banners,
          (id) => getBannerById(banners, id)
        );
        if (!shouldKeep) {
          return null;
        }
      } else {
        return null;
      }

      const filteredPennants = banner.pennants.filter((pennant) => {
        if (pennant.id < 0) {
          return shouldKeepItemWithPositiveBannerId(
            pennant,
            [...banners, ...banner.pennants],
            (id) => {
              const bannerItem = getBannerById(banners, id);
              if (bannerItem) return bannerItem;
              return getBannerById(banner.pennants, id);
            }
          );
        }
        return false;
      });

      return { ...banner, pennants: filteredPennants };
    })
    .filter((banner): banner is CourseBanner => banner !== null);

  // Filter content (same logic as courses)
  const filteredContent = content
    .map((group) => {
      const { slides, ...groupItems } = group;
      const filteredGroupItems: Record<number, SlideGroupItem> = {};
      const allSlideGroupItems: SlideGroupItem[] = Object.values(groupItems);

      Object.entries(groupItems).forEach(([key, item]) => {
        if (typeof item === "object" && item !== null && "id" in item) {
          const slideGroupItem = item as SlideGroupItem;
          if (slideGroupItem.id < 0) {
            const shouldKeep = shouldKeepItemWithPositiveBannerId(
              slideGroupItem,
              [...banners, ...allSlideGroupItems],
              (id) => {
                const banner = getBannerById(banners, id);
                if (banner) return banner;
                return getBannerById(allSlideGroupItems, id);
              }
            );
            if (shouldKeep) {
              filteredGroupItems[parseInt(key)] = slideGroupItem;
            }
          }
        }
      });

      const filteredSlides = slides
        .map((slideArray) => {
          return slideArray.filter((slideItem) => {
            if (slideItem.id < 0) {
              return shouldKeepItemWithPositiveBannerId(
                slideItem,
                [...banners, ...allSlideGroupItems, ...slideArray],
                (id) => {
                  const banner = getBannerById(banners, id);
                  if (banner) return banner;
                  const groupItem = getBannerById(allSlideGroupItems, id);
                  if (groupItem) return groupItem;
                  return getBannerById(slideArray, id);
                }
              );
            }
            return false;
          });
        })
        .filter((slideArray) => slideArray.length > 0);

      if (
        Object.keys(filteredGroupItems).length > 0 ||
        filteredSlides.length > 0
      ) {
        return {
          ...filteredGroupItems,
          slides: filteredSlides,
        } as SlideGroup;
      }
      return null;
    })
    .filter((group): group is SlideGroup => group !== null);

  return {
    quizzes: filteredQuizzes,
    banners: filteredBanners,
    content: filteredContent,
  };
};

export const removeNegativeIdsFromQuizzes = ({
  quizzes,
  banners,
  content,
}: {
  quizzes: Quiz[];
  banners: CourseBanner[];
  content: SlideGroup[];
}): { quizzes: Quiz[]; banners: CourseBanner[]; content: SlideGroup[] } => {
  // Filter quizzes: remove if id is negative or bannerId is negative
  const filteredQuizzes = quizzes
    .map((quiz) => {
      if (
        quiz.id < 0 ||
        (quiz.bannerId !== undefined && quiz.bannerId < 0)
      ) {
        return null;
      }

      // Filter pennants: remove if id is negative or bannerId is negative
      const filteredPennants = quiz.pennants.filter(
        (pennant) => pennant.id >= 0 && pennant.bannerId >= 0
      );

      return { ...quiz, pennants: filteredPennants };
    })
    .filter((quiz): quiz is Quiz => quiz !== null);

  // Filter banners (same logic as courses)
  const filteredBanners = banners
    .map((banner) => {
      if (banner.id < 0 || (banner.bannerId !== undefined && banner.bannerId < 0)) {
        return null;
      }

      const filteredPennants = banner.pennants.filter(
        (pennant) => pennant.id >= 0 && pennant.bannerId >= 0
      );

      return { ...banner, pennants: filteredPennants };
    })
    .filter((banner): banner is CourseBanner => banner !== null);

  // Filter content (same logic as courses)
  const filteredContent = content
    .map((group) => {
      const { slides, ...groupItems } = group;
      const filteredGroupItems: Record<number, SlideGroupItem> = {};

      Object.entries(groupItems).forEach(([key, item]) => {
        if (typeof item === "object" && item !== null && "id" in item) {
          const slideGroupItem = item as SlideGroupItem;
          if (
            slideGroupItem.id >= 0 &&
            slideGroupItem.bannerId >= 0
          ) {
            filteredGroupItems[parseInt(key)] = slideGroupItem;
          }
        }
      });

      const filteredSlides = slides
        .map((slideArray) =>
          slideArray.filter(
            (slideItem) => slideItem.id >= 0 && slideItem.bannerId >= 0
          )
        )
        .filter((slideArray) => slideArray.length > 0);

      if (
        Object.keys(filteredGroupItems).length > 0 ||
        filteredSlides.length > 0
      ) {
        return {
          ...filteredGroupItems,
          slides: filteredSlides,
        } as SlideGroup;
      }
      return null;
    })
    .filter((group): group is SlideGroup => group !== null);

  return {
    quizzes: filteredQuizzes,
    banners: filteredBanners,
    content: filteredContent,
  };
};

