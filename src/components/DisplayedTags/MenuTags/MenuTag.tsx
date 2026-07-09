import React, { MouseEventHandler } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Image } from "react-bootstrap";
const lockImg = new URL("../../../Images/lock.png", import.meta.url).href;
const loading = new URL("../../../Images/orange_dot.png", import.meta.url).href;
const pickedout = new URL("../../../Images/green_dot.png", import.meta.url).href;
const unselected = new URL("../../../Images/black_dot.png", import.meta.url).href;
const searchIcon = new URL("../../../Images/search_icon.png", import.meta.url).href;
import { ParentData } from "../../../store/slices/viewSlice";
import * as styles from '../../../styles/filtertags.module.css';
import { InitLoadingPayload } from "../../../library/actions";

const styleProps = {
  thumbs: styles["thumbs"],
  filterBadge: styles["filterBadge"],
  small_thumbs: styles["small_thumbs"],
  HorizontalFlex: styles["HorizontalFlex"],
  search: styles["search"],
  toBadge: styles["toBadge"],
  fromBadge: styles["fromBadge"],
  menuTag: styles["menuTag"],
  verticalFlex: styles["verticalFlex"],
};

interface MenuTagProps {
  to: string;
  from: string;
  index: number;
  toIMG: string;
  prefix: string;
  fromIMG: string;
  search?: string;
  selected: boolean;
  curRoutes: string[];
  isFetching: boolean;
  encodedData: string;
  parentData: ParentData;
  toggler?: (type: string) => void;
  setSelected: (data: InitLoadingPayload) => void;
}

const isFunctionEnable = (
  func: () => void,
  visible: boolean
): MouseEventHandler<HTMLImageElement> | undefined => 
  visible ? func : undefined;

const MenuTag: React.FC<MenuTagProps> = ({
  to,
  from,
  index,
  toIMG,
  search,
  prefix,
  fromIMG,
  toggler,
  selected,
  curRoutes,
  parentData,
  isFetching,
  encodedData,
  setSelected,
}) => {
  const navigate = useNavigate();
  const ingredients = { parentData, entity: to, search, prefix };
  const preUrl = prefix + to + "/" + encodedData + (search ?? "");
  const dotImg =
    selected && isFetching ? loading : selected ? pickedout : unselected;
  const isAllowed = curRoutes.indexOf(from + to) > -1;

  return (
    <Alert className={styleProps.menuTag}>
      <div className={styleProps.HorizontalFlex}>
        <div className={styleProps.HorizontalFlex + " " + styleProps.thumbs}>
          <Image
            src={isAllowed ? fromIMG : lockImg}
            className={styleProps.fromBadge}
            onClick={isFunctionEnable(() => {
              if (toggler) toggler("parents");
              else console.log("inactive_Parent_clicked");
            }, isAllowed)}
          />
          <Image
            src={isAllowed ? toIMG : lockImg}
            className={styleProps.toBadge}
            onClick={isFunctionEnable(() => {
              if (selected) return;
              navigate(preUrl);
              setSelected({ selectedTraversal: index, ...ingredients });
            }, isAllowed)}
          />
        </div>
        <div className={styleProps.small_thumbs + " " + styleProps.verticalFlex}>
          <Image
            src={dotImg}
            roundedCircle
            className={styleProps.filterBadge}
            onClick={isFunctionEnable(() => {
              console.log("inactive_dot_clicked");
            }, isAllowed)}
          />
          <Image
            src={searchIcon}
            roundedCircle
            className={styleProps.filterBadge + " " + styleProps.search}
            onClick={() => {
              if (toggler) toggler("searches");
              else console.log("inactive_search_clicked");
            }}
          />
        </div>
      </div>
    </Alert>
  );
};

export default MenuTag;
