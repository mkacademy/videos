import React from 'react';
import Copyrights from './Copyrights';
import { useRecords } from '../../Hooks/useRecords';
import Landing from '../convolayouts/search/Landing';
import { Route, Search as SearchType } from '../../store/slices/searchSlice';
import { AppGlobal } from '../views/wrappers/appGlobal';
import * as styles from '../../styles/shortcuts.module.css';
import { InitLoadingPayload } from '../../library/actions';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/types';

export interface SearchRef {
    routes: Record<string, Route>;
    searches: SearchType[];
}

interface SearchProps {
    webapp: string;
    convolution: string;
    searchHistory: SearchType[];
    setWebApp: (app: string) => void;
    routesRef: { current: Record<string, string>[] };
    cpanelManager: (payload: InitLoadingPayload) => void;
}

const Search: React.FC<SearchProps> = ({
    webapp,
    setWebApp,
    routesRef,
    convolution,
    searchHistory,
    cpanelManager,
}) => {
    useRecords({ convolution, webapp });
    const requestIsFetching = useSelector((state: RootState) => state.view.requestIsFetching);
    const requestIsSkeletons = useSelector((state: RootState) => state.view.requestIsSkeletons);
    return (
        <AppGlobal>
            <div className="container">
                <Copyrights
                    formatter={convolution}
                    loading={requestIsFetching}
                    skeletons={requestIsSkeletons}
                    convolution={styles["carders"]}
                >
                    <Landing
                        webapp={webapp}
                        isLoading={requestIsFetching}
                        routesRef={routesRef}
                        setWebApp={setWebApp}
                        searchHistory={searchHistory}
                        searchManager={cpanelManager}
                    />
                </Copyrights>
            </div>
        </AppGlobal>
    );
};

export default Search; 