const info = new URL("../../../Images/info.png", import.meta.url).href;
const badge = new URL("../../../Images/badge.png", import.meta.url).href;
import { useNavigate } from "react-router-dom";
import { Alert, Image } from "react-bootstrap";
import { Traversal } from "../../../store/slices/traversalSlice";
import { ParentData } from "../../../store/slices/viewSlice";
import { InitNavigatorPayload } from "../../../store/middleware/NavigationTrackerEFG";
import * as menuStyles from '../../../styles/filtertags.module.css';
import { getCurAppName } from "../../../utils";
interface HistoryTagProps {
  to: string;
  from: string;
  toIMG: string;
  urlID: string;
  fromIMG: string;
  search?: string;
  prefix?: string;
  encodedData: string;
  contentIds: number[];
  selectedUrlID: string;
  parentData: ParentData;
  setShow: (show: boolean) => void;
  resetAlgorithm: (path: string) => void;
  cacheClearer?: (urlID: string) => void;
  removeTraversal: (urlID: string) => void;
  cacheSelected: (payload: Traversal) => void;
  navigatorPressed: (data: InitNavigatorPayload) => void;
}

const styleProps = {
  HorizontalFlex: menuStyles["HorizontalFlex"],
  thumbs: menuStyles["thumbs"],
  fromBadge: menuStyles["fromBadge"],
  toBadge: menuStyles["toBadge"],
  small_thumbs: menuStyles["small_thumbs"],
  filterBadge: menuStyles["filterBadge"],
  search: menuStyles["search"],
  menuTag: menuStyles["menuTag"],
  alert: menuStyles["alert"],
  verticalFlex: menuStyles["verticalFlex"],
};

export default function HistoryTag({
  to,
  from,
  toIMG,
  urlID,
  search,
  prefix,
  setShow,
  fromIMG,
  parentData,
  contentIds,
  encodedData,
  cacheClearer,
  selectedUrlID,
  cacheSelected,
  resetAlgorithm,
  removeTraversal,
  navigatorPressed,
}: HistoryTagProps) {
  const navigate = useNavigate();
  const closeBtnHandler = cacheClearer
    ? () => cacheClearer(urlID)
    : () => removeTraversal(urlID);
  const payload = { urlID, contentIds, encodedData, from, fromIMG, toIMG, parentData, to, prefix, search };
  const isTransferable = selectedUrlID.toLowerCase().endsWith(to?.toLowerCase());
  const tranferer = isTransferable ? () => cacheSelected(payload) : undefined;
  const preUrl = prefix + to + "/" + encodedData + (search ?? "");
  const appname = getCurAppName(parentData.curApp);

  return (
    <Alert className={styleProps.alert + " " + styleProps.menuTag}>
      <div className={styleProps.HorizontalFlex}>
        <div className={styleProps.thumbs}>
          <Image src={fromIMG} className={styleProps.fromBadge} onClick={tranferer} />
          <Image
            src={toIMG}
            className={styleProps.toBadge}
            onClick={() => {
              navigatorPressed({ entity: to, encodedData });
              resetAlgorithm('/convolution/' + appname);
              navigate(preUrl);
              setShow(false);
            }}
          />
        </div>
        <div className={styleProps.small_thumbs + " " + styleProps.verticalFlex}>
          <Image
            src={badge}
            roundedCircle
            className={styleProps.filterBadge}
            onClick={closeBtnHandler}
          />
          <Image
            src={info}
            roundedCircle
            className={styleProps.filterBadge + " " + styleProps.search}
            onClick={() => console.log("Show_history_info_clicked")}
          />
        </div>
      </div>
    </Alert>
  );
}
