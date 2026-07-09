import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Image } from 'react-bootstrap';
import { doCrudUrlAction } from '../../../store/middleware/UiuxManager';
import * as menuStyles from '../../../styles/filtertags.module.css';
// Import images
const info = new URL('../../../Images/info.png', import.meta.url).href;
const nosearch = new URL('../../../Images/black_dot.png', import.meta.url).href;
const hassearch = new URL('../../../Images/green_dot.png', import.meta.url).href;
import { InitLoadingPayload, viewConvolutionPayload } from '../../../library/actions';
import { ParentData } from '../../../store/slices/viewSlice';
import { PayloadWithFromTo } from '../../../store/middleware/CrudsManager123';
interface RootTagProps {
  to: string;
  from: string;
  toIMG: string;
  curApp: number;
  search?: string;
  prefix?: string;
  setShow: (show: boolean) => void;
  crudUrl?: string;
  fromIMG: string;
  parentData?: ParentData;
  contentIds: number[];
  encodedData: string;
  saveConvolution: (payload: viewConvolutionPayload) => void;
  preserveIngredients: (payload: InitLoadingPayload) => void;
  joiner?: (payload: PayloadWithFromTo) => void;
  addMocks?: (payload: PayloadWithFromTo) => void;
  zipOutgoing?: (payload: PayloadWithFromTo) => void;
  unjoiner?: (payload: PayloadWithFromTo) => void;
  inverter?: (payload: PayloadWithFromTo) => void;
  highlighter?: (payload: PayloadWithFromTo) => void;
  selectClearer?: (payload: PayloadWithFromTo) => void;
  unhighlighter?: (payload: PayloadWithFromTo) => void;
  purgeOverview?: (payload: PayloadWithFromTo) => void;
}

const stayUrl = '#';

const styleProps = {
  HorizontalFlex: menuStyles["HorizontalFlex"],
  thumbs: menuStyles["thumbs"],
  fromBadge: menuStyles["fromBadge"],
  toBadge: menuStyles["toBadge"],
  small_thumbs: menuStyles["small_thumbs"],
  filterBadge: menuStyles["filterBadge"],
  search: menuStyles["search"],
  verticalFlex: menuStyles["verticalFlex"],
  alert: menuStyles["alert"],
  menuTag: menuStyles["menuTag"],
};

const RootTag: React.FC<RootTagProps> = ({
  to,
  from,
  toIMG,
  search,
  curApp,
  prefix,
  setShow,
  crudUrl,
  fromIMG,
  parentData,
  contentIds,
  encodedData,
  saveConvolution,
  preserveIngredients,
  ...remainingprops
}) => {
  const navigate = useNavigate();
  const dotImg = search ? hassearch : nosearch;
  const appUrl = prefix + to + '/' + encodedData + (search ?? '');

  let nextUrl = appUrl;
  if (crudUrl) {
    if (crudUrl.indexOf('formulator') > -1) nextUrl = crudUrl + to;
    else nextUrl = stayUrl;
  }


  const handleToClick = () => {
    if (contentIds.length > 0) saveConvolution({ from, to, contentIds, curApp });
    if (crudUrl) doCrudUrlAction({ crudUrl, from, to, ...remainingprops });
    const _parentData = { IDs: parentData?.IDs || [], parent: parentData?.parent || '', curApp: parentData?.curApp || 1 };
    preserveIngredients({ parentData: _parentData, entity: to, search, prefix: prefix ?? '' });
    if (nextUrl !== stayUrl) navigate(nextUrl);
    setShow(false);
  };

  return (
    <Alert className={styleProps.alert + " " + styleProps.menuTag}>
      <div className={styleProps.HorizontalFlex}>
        <div className={styleProps.thumbs}>
          <Image
            src={fromIMG}
            className={styleProps.fromBadge}
            onClick={() => console.log('from_clicked')}
          />
          <Image
            src={toIMG}
            className={styleProps.toBadge}
            onClick={handleToClick}
          />
        </div>
        <div className={styleProps.small_thumbs + " " + styleProps.verticalFlex}>
          <Image
            src={dotImg}
            roundedCircle
            className={styleProps.filterBadge}
            onClick={() => console.log('dot_clicked(searches_indicator)')}
          />
          <Image
            src={info}
            roundedCircle
            className={styleProps.filterBadge + " " + styleProps.search}
            onClick={() => console.log('Show_algorithm_info_clicked')}
          />
        </div>
      </div>
    </Alert>
  );
};

export default RootTag; 