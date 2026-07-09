import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMainbar } from '../../../Hooks/useControlPanel/useMainbar';
import { Icons, IconKey } from '../../../Hooks/useIconsAssembler';
import { capitalizeFirstLetter, getAlias } from '../../../utils';
import {
  appendRecords,
  filterRecords,
  showRecords,
  toggleRecord,
  FilterRecordsPayload,
  AppendRecordsPayload,
  ToggleRecordPayload,
  ShowRecordsPayload
} from '../../../store/slices/responseSlice';
import { showAlgorithm } from '../../../library/actions';
import { RootState } from '../../../store';
import * as stylesMain from '../../../styles/cpanelMain.module.css';
import * as styles from '../../../styles/cpanel.module.css';
import { TraversalState } from './Screen';
import { CpanelRow } from '../../Core/types';
import { IdToggledPayload, SelectPayload, SidebarState } from '../../../store/slices/sidebarSlice';
import { InitLoadingPayload } from '../../../library/actions';

const styleProps = {
  mainBar: stylesMain["mainBar"],
  gridCTitle: styles["grid-c-title"],
  gridCTitleIcon: stylesMain["grid-c-title-icon"],
  gridC4Content: stylesMain["grid-c4-content"],
  gridItems: stylesMain["grid-items"],
  gridItem: stylesMain["grid-item"],
  gridItemL: stylesMain["grid-item-l"],
  gridItemR: stylesMain["grid-item-r"],
  icon: stylesMain["icon"],
  text: stylesMain["text"],
  textSilverV1: stylesMain["text-silver-v1"],
  gridCTitleText: stylesMain["grid-c-title-text"],
  selected: stylesMain["selected"],
  cSelected: styles["selected"],
  lgValue: stylesMain["lg-value"],
  bgJet: stylesMain["bg-jet"],
  field: stylesMain["field"],
  total: stylesMain["total"],
}

interface RecordsProps {
  to: string;
  from: string;
  webapp: string;
  fields: string[];
  restart: () => void;
  highlighter: string;
  defaultTake: number;
  isExpandable: boolean;
  connections: string[];
  executables: SidebarState;
  setter: (payload: SelectPayload) => void;
  fetchedData: Record<string, CpanelRow[]>;
  parentGroups: Record<string, CpanelRow[]>;
  selector: (callback: (prev: TraversalState) => TraversalState) => void;
  setParentGroups: (data: Record<string, CpanelRow[]>) => void;
  updateTraversor: (payload: IdToggledPayload) => void;
  cpanelManager: (msg: InitLoadingPayload) => void; 
}

const Records: React.FC<RecordsProps> = (props) => {
  const dispatch = useDispatch();
  const records = useSelector((state: RootState) => state.response.responseData);

  // Redux actions
  const launchAlgorithm = (payload: string) => dispatch(showAlgorithm(payload));
  const showData = (payload: ShowRecordsPayload) => dispatch(showRecords(payload));
  const toggleRow = (payload: ToggleRecordPayload) => dispatch(toggleRecord(payload));
  const appendData = (payload: AppendRecordsPayload) => dispatch(appendRecords(payload));
  const filterData = (payload: FilterRecordsPayload) => dispatch(filterRecords(payload));

  const {
    to,
    rows,
    from,
    tabulator,
    outliner,
    clearer,
    iDselector,
    topField,
    highlighter,
    isExpandable,
    connections,
    fieldNames,
  } = useMainbar({
    ...props,
    records,
    showData,
    toggleRow,
    appendData,
    filterData,
    launchAlgorithm,
  });

  return (
    <div className={`${styleProps.mainBar} ${highlighter}`}>
      <div className={`${styleProps.gridCTitle}`}>
        <h3 className={`${styleProps.gridCTitleText}`} onClick={tabulator}>
          {from + to}
        </h3>
        <div className={`${styleProps.gridCTitleIcon}`}>
          <span className={`${styleProps.lgValue} ${styleProps.total}`} onClick={clearer}>
            {rows.length}
          </span>
          <img src={Icons[from as IconKey]} onClick={outliner} />
          <img src={Icons[to as IconKey]} onClick={outliner} />
        </div>
      </div>
      {rows.map(({ isOpen, id, ...objValues }) => {
        const classNames =
          !isExpandable && isOpen
            ? `${styleProps.cSelected} ${styleProps.textSilverV1}`
            : `${styleProps.textSilverV1}`;
        return (
          <React.Fragment key={id}>
            <div className={classNames} onClick={() => iDselector(id as number, !isOpen)}>
              <h2 className={`${styleProps.lgValue}`}>{objValues[topField]}</h2>
            </div>
            {isExpandable && isOpen && (
              <div className={`${styleProps.gridC4Content} ${styleProps.bgJet}`}>
                <div className={`${styleProps.gridItems}`}>
                  {connections.map((connection, i) => {
                    const alias = capitalizeFirstLetter(getAlias(connection));
                    return (
                      <div className={`${styleProps.gridItem}`} key={i}>
                        <div className={`${styleProps.gridItemL}`}>
                          <div className={`${styleProps.icon}`}>
                            <img src={Icons[alias as IconKey]} />
                          </div>
                          <p className={`${styleProps.text} ${styleProps.textSilverV1}`}>{alias}</p>
                        </div>
                        <div className={`${styleProps.gridItemR}`}>
                          <span className={`${styleProps.textSilverV1}`}>
                            {objValues["descendentsSums"]?.[connection]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {fieldNames.map((fieldName, i) => (
                  <p key={i} className={`${styleProps.field} ${styleProps.textSilverV1}`}>
                    {objValues[fieldName]}
                  </p>
                ))}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Records; 