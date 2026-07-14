import { Middleware } from '@reduxjs/toolkit';
import {
    RootState
} from '../../store';

const settingsInitializer: Middleware<{}, RootState> = () => {
    return (next) => (action) => next(action);
};

export default settingsInitializer; 