import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  updateBosses,
  showAlgorithm,
  reshowAlgorithm,
  updateCourses,
  updateQuizzes,
  updateSteps,
  updateTutorials,
  updateUnderbosses,
  updateMinions,
  hydrateRows,
} from '../../library/actions';
import {
  toggleCourseDismissed,
} from '../slices/courseSlice';
import {
  toggleTutorialDismissed,
} from '../slices/tutorialSlice';
import {
  toggleQuizDismissed,
} from '../slices/quizSlice';
import { mutateAlgorithm } from '../slices/traversalSlice';
import { updateTexts } from '../slices/textSlice';
import { toggleDismissed as sessionToggleDismissed } from '../slices/sessionSlice';
import IdentitiesExtractor, { reEncodeData } from '../../library/IdentitiesExtractor';
import { getCurAppName, orderEntitiesRootToLeafForWebapp, Tree } from '../../utils';
import { DataRow, MenuItem } from '../../components/Core/types';

interface TextUpdateItem {
  id: string;
  modified: boolean;
  dashboard?: string;
  sifter?: string;
  filter?: string;
  instruction?: string;
  boss?: string;
  minion?: string;
  underboss?: string;
}

const DismissalsManager: Middleware<{}, RootState> =
  ({ getState, dispatch }) =>
    (next) =>
      (action) => {
        if (sessionToggleDismissed.match(action)) {
          const { payload } = action;
          if (payload.endsWith("/quiz")) {
            const {
              quiz: { quizzes: quizBanners, selected: quizSelected },
              session: { dismissals },
            } = getState();
            const dismissed = dismissals[payload] ?? false;
            const quizVisibles = quizBanners.filter(
              ({ isDismissed }) => isDismissed === !dismissed
            );
            setTimeout(() =>
              dispatch({
                type: toggleQuizDismissed.type,
                payload: quizSelected === -1 && quizVisibles.length === 0,
              })
            );
          } else if (payload.endsWith("/tutorial")) {
            const {
              tutorial: {
                banners: tutorialBanners,
                selected: tutorialSelected,
              },
              session: { dismissals },
            } = getState();
            const dismissed = dismissals[payload] ?? false;
            const tutorialVisibles = tutorialBanners.filter(
              ({ isDismissed }) => isDismissed === !dismissed
            );
            setTimeout(() =>
              dispatch(toggleTutorialDismissed(tutorialSelected === -1 && tutorialVisibles.length === 0))
            );
          } else if (payload.endsWith("/course")) {
            const {
              session: { dismissals },
              course: {
                banners: courseBanners,
                selected: courseSelected,
              },
            } = getState();
            const dismissed = dismissals[payload] ?? false;
            const courseVisibles = courseBanners.filter(
              ({ isDismissed }) => isDismissed === !dismissed
            );
            setTimeout(() =>
              dispatch(toggleCourseDismissed(courseSelected === -1 && courseVisibles.length === 0))
            );
          }
          return next(action);
        }

        if (reshowAlgorithm.match(action)) {
          const state = getState();
          const { payload } = action;
          const { parentApp, path } = payload;
          const params = { curApp: parentApp, state, path };
          const { selected, searchObj } = IdentitiesExtractor(params);
          const { curApp } = state.session;
          const webapp = getCurAppName(curApp);
          const filterPredicate = (from: string) => ([key]: [string, number[]]) => from === key;
          const reducePredicate = (prev: number[], [_, value]: [string, number[]]) => [...prev, ...value];

          const menu = orderEntitiesRootToLeafForWebapp(Tree.entities, webapp)
            .map(({ webapps, name, menu }) => {
              const routes = webapps[webapp].map((dsc: string) => name + dsc);
              return menu
                .filter(({ from, to }: MenuItem) => routes.includes(from + to))
                .map((menu: MenuItem) => {
                  const { from, to, parentData } = menu;
                  const { search } = searchObj[from + to] ?? {};
                  const traversal = {
                    ...menu,
                    contentIds: [],
                    urlID: from + to,
                    search: search ? `?seek=${search}` : search,
                    parentData: {
                      ...parentData,
                      IDs: Object.entries(selected)
                        .map(([key, value]: [string, number[]]): [string, number[]] => [key.replace('foundation', ''), value])
                        .filter(filterPredicate(from))
                        .reduce(reducePredicate, [])
                        .map(String),
                      curApp,
                    },
                  };
                  const encodedData = reEncodeData(curApp, traversal.parentData);
                  return { ...traversal, encodedData };
                });
            })
            .flat();
          return next(mutateAlgorithm(menu));
        }

        if (showAlgorithm.match(action)) {
          const state = getState();
          const { payload } = action;
          const { curApp } = state.session;
          const webapp = getCurAppName(curApp);
          const params = { curApp, state, path: payload };
          const { selected, searchObj } = IdentitiesExtractor(params);
          const menu = orderEntitiesRootToLeafForWebapp(Tree.entities, webapp)
            .map(({ webapps, name, menu }) => {
              const routes = webapps[webapp].map((dsc: string) => name + dsc);
              return menu
                .filter(({ from, to }: MenuItem) => routes.includes(from + to))
                .map((menu: MenuItem) => {
                  const { from, to } = menu;
                  const { search } = searchObj[from + to] ?? {};
                  const traversal = {
                    ...menu,
                    urlID: from + to,
                    contentIds: selected[from + to] ?? [],
                    parentData: { ...menu.parentData, curApp },
                    search: search ? `?seek=${search}` : search,
                  };
                  const encodedData = reEncodeData(curApp, traversal.parentData);
                  return { ...traversal, encodedData };
                });
            })
            .flat();
          return next(mutateAlgorithm(menu));
        }

        if (hydrateRows.match(action)) {
          const { payload: { entity, payload } } = action;
          switch (entity) {
            case "dashboards": {
              const updates = payload.map(
                ({ dashboard, modified, ...siever }: DataRow) => ({
                  ...siever,
                  title: dashboard,
                  edited: modified,
                  id: parseInt(siever.id.toString()),
                })
              );
              setTimeout(() => dispatch(updateQuizzes(updates)));
              break;
            }
            case "sifters": {
              const updates = payload.map(({ sifter, modified, ...siever }: DataRow) => ({
                ...siever,
                title: sifter,
                edited: modified,
                id: parseInt(siever.id.toString()),
              }));
              setTimeout(() => dispatch(updateCourses(updates)));
              break;
            }
            case "filters": {
              const updates = payload.map(
                ({ filter, modified, ...classifier }: DataRow) => ({
                  ...classifier,
                  title: filter,
                  edited: modified,
                  id: parseInt(classifier.id.toString()),
                })
              );
              setTimeout(() => dispatch(updateTutorials(updates)));
              break;
            }
            case "instructions": {
              const updates = payload.map(
                ({ instruction, modified, ...step }: DataRow) => ({
                  ...step,
                  edited: modified,
                  title: instruction,
                  id: parseInt(step.id.toString()),
                })
              );
              setTimeout(() => dispatch(updateSteps(updates)));
              break;
            }
            default:
              break;
          }
          return next(action);
        }

        if (updateTexts.match(action)) {
          const state = getState();
          const { payload } = action;
          const {
            view: { entity },
          } = state;

          if (payload.length === 0) return next(action);

          switch (entity) {
            case "dashboards": {
              const updates = payload.map(
                ({ dashboard, modified, ...siever }: TextUpdateItem) => ({
                  ...siever,
                  title: dashboard,
                  edited: modified,
                  id: parseInt(siever.id),
                })
              );
              setTimeout(() => dispatch(updateQuizzes(updates)));
              break;
            }
            case "sifters": {
              const updates = payload.map(({ sifter, modified, ...siever }: TextUpdateItem) => ({
                ...siever,
                title: sifter,
                edited: modified,
                id: parseInt(siever.id),
              }));
              setTimeout(() => dispatch(updateCourses(updates)));
              break;
            }
            case "filters": {
              const updates = payload.map(
                ({ filter, modified, ...classifier }: TextUpdateItem) => ({
                  ...classifier,
                  title: filter,
                  edited: modified,
                  id: parseInt(classifier.id),
                })
              );
              setTimeout(() => dispatch(updateTutorials(updates)));
              break;
            }
            case "instructions": {
              const updates = payload.map(
                ({ instruction, modified, ...step }: TextUpdateItem) => ({
                  ...step,
                  edited: modified,
                  title: instruction,
                  id: parseInt(step.id),
                })
              );
              setTimeout(() => dispatch(updateSteps(updates)));
              break;
            }
            case "bosses": {
              const updates = payload.map(({ boss, modified, ...user }: TextUpdateItem) => ({
                ...user,
                title: boss,
                edited: modified,
                id: parseInt(user.id),
              }));
              setTimeout(() => dispatch(updateBosses(updates)));
              break;
            }
            case "underbosses": {
              const updates = payload.map(({ underboss, modified, ...user }: TextUpdateItem) => ({
                ...user,
                title: underboss,
                edited: modified,
                id: parseInt(user.id),
              }));
              setTimeout(() => dispatch(updateUnderbosses(updates)));
              break;
            }
            case "minions": {
              const updates = payload.map(({ minion, modified, ...user }: TextUpdateItem) => ({
                ...user,
                title: minion,
                edited: modified,
                id: parseInt(user.id),
              }));
              setTimeout(() => dispatch(updateMinions(updates)));
              break;
            }
            default:
              break;
          }
          return next(action);
        }

        return next(action);
      };

export default DismissalsManager; 