import React from 'react';
import PageTag from './PageTag';
import ParentTag from './ParentTag';
import SearchTag from './SearchTag';
import { Col } from 'react-bootstrap';
import { RootState } from '../../../store/types';
import { useSelector, useDispatch } from 'react-redux';
import { ParentData } from '../../../store/slices/viewSlice';
import { Handler } from '../../../store/slices/errorSlice';
import {
  matchKeyId,
  matchKeyword,
  unmatchKeyId,
  unmatchKeyword,
} from '../../../library/actions';
import {
  removePage,
  removeParent,
  removeYoink,
} from '../../../store/slices/viewSlice';
import { capitalizeFirstLetter } from '../../../utils';
import * as styles from '../../../styles/filtertags.module.css';

const styleProps = {
  colSmAuto: styles["col-sm-auto"],
}


interface ScreenProps {
  isMobile?: boolean;
  parentData: ParentData;
}

const Screen: React.FC<ScreenProps> = ({ isMobile, parentData }) => {
  const dispatch = useDispatch();

  // Individual useSelector hooks for each prop as requested
  const pages = useSelector((state: RootState) => state.view.pages);
  const keyIds = useSelector((state: RootState) => state.view.keyids);
  const routes = useSelector((state: RootState) => state.error.handles);
  const keywords = useSelector((state: RootState) => state.view.yoinks);
  const frozens = useSelector((state: RootState) => state.view.keywords);
  const visibility = useSelector((state: RootState) => state.view.visibility);

  // Action dispatchers
  const handleRemovePage = (payload: string) => dispatch(removePage(payload));
  const handleRemoveParent = (payload: string) => dispatch(removeParent(payload));
  const handleUnmarkParent = (payload: string) => dispatch(unmatchKeyId(payload));
  const handleUnmarkSearch = (payload: string) => dispatch(unmatchKeyword(payload));
  const handleMarkParent = (payload: string) => dispatch(matchKeyId(payload));
  const handleMarkSearch = (payload: string) => dispatch(matchKeyword(payload));
  const handleRemoveSearch = (payload: string) => dispatch(removeYoink(payload));

  const { IDs, parent } = parentData;
  const { searches, parents } = visibility;
  const from = capitalizeFirstLetter(parent);
  const handles: Handler[] | undefined = routes?.["handles" + from];
  const parsedIDs = IDs.map((id: string) => parseInt(id));

  return (
    <React.Fragment>
      {parents &&
        parsedIDs.map((id: number) => {
          const pred = ({ id: k }: Handler) => k === id;
          const name = handles?.find(pred)?.keyword;
          return (
            <Col key={id} sm={!isMobile && "auto"} className={styleProps.colSmAuto}>
              <ParentTag
                name={name}
                selected={keyIds.includes(id)}
                unmarkParent={handleUnmarkParent}
                removeParent={handleRemoveParent}
                markParent={handleMarkParent}
                parentId={id}
              />
            </Col>
          );
        })}
      {searches && (
        <React.Fragment>
          {pages.map((page: string, i: number) => (
            <Col key={i} sm={!isMobile && "auto"} className={styleProps.colSmAuto}>
              <PageTag
                page={page}
                markSearch={handleMarkSearch}
                removePage={handleRemovePage}
                unmarkSearch={handleUnmarkSearch}
                selected={frozens.includes(page)}
              />
            </Col>
          ))}
          {keywords.map((yoink: string, i: number) => (
            <Col key={i} sm={!isMobile && "auto"} className={styleProps.colSmAuto}>
              <SearchTag
                search={yoink}
                markSearch={handleMarkSearch}
                unmarkSearch={handleUnmarkSearch}
                removeSearch={handleRemoveSearch}
                selected={frozens.includes(yoink)}
              />
            </Col>
          ))}
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

export default Screen;
