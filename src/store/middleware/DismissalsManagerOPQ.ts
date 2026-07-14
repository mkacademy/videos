import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  updateCourses,
  updateQuizzes,
  updateSteps,
  updateTutorials,
  hydrateRows,
} from '../../library/actions';
import {
  DataRow } from '../../components/Core/types';

const DismissalsManager: Middleware<{}, RootState> =
  ({ dispatch }) =>
    (next) =>
      (action) => {

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

        return next(action);
      };

export default DismissalsManager; 