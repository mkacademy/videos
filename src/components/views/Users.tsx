import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Col } from "react-bootstrap";
import IconsWidget from "../navbar/IconsWidget";
import { initLoading, InitLoadingPayload } from "../../library/actions";
import { toggleRow } from "../../store/slices/rowSlice";
import { toggleContent } from "../../store/slices/contentSlice";
import { DataRow } from "../Core/types";
import { RootState } from "../../store/types";
import { IconKey } from "../../Hooks/useIconsAssembler";
import * as commsStyles from "../../styles/avatar.module.css";

const styleProps = {
  card: commsStyles["card"],
  title: commsStyles["title"],
  expand: commsStyles["expand"],
  avatar: commsStyles["avatar"],
  shrink: commsStyles["shrink"],
  checked: commsStyles["checked"],
  details: commsStyles["details"],
  noscrollvisible: commsStyles["noscrollvisible"],
  colxl3: commsStyles['col-xl-3'],
  collg4: commsStyles['col-lg-4'],
  col12: commsStyles['col-12'],
  info: commsStyles["info"],
}

interface ContainerProps {
  avatarImage: string;
  titleKey?: string;
}

interface UserCardProps {
  preserveIngredients: (payload: InitLoadingPayload) => void;
  defaultTake: number;
  toggler: (id: number) => void;
  icons: Record<IconKey, string> | undefined;
  item: DataRow;
  avatar: React.CSSProperties;
  titleKey: string;
  curApp: number;
}

const Container: React.FC<ContainerProps> = ({
  avatarImage,
  titleKey = 'boss' 
}) => {
  const icons = useSelector((state: RootState) => state.view.icons);
  const fetchedData = useSelector((state: RootState) => state.content);
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const curApp = useSelector((state: RootState) => state.session.curApp);
  const dispatch = useDispatch();

  const avatar: React.CSSProperties = {
    background: `url(${avatarImage})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "cover",
  };

  const toggler = (payload: number) => {
    dispatch(toggleRow(payload.toString()));
    dispatch(toggleContent(payload));
  };

  const preserveIngredients = (payload: InitLoadingPayload) => {
    dispatch(initLoading(payload));
  };

  const visibles = fetchedData.filter((row: DataRow) => !row.deleted);

  return (
    <React.Fragment>
      {visibles.map((item: DataRow) => (
        <Col key={item.id} xs={12} md={6} lg={4} xl={3} className={styleProps.colxl3 + ' ' + styleProps.collg4 + ' ' + styleProps.col12}>
          <UserCard
            preserveIngredients={preserveIngredients}
            defaultTake={defaultTake}
            toggler={toggler}
            icons={icons}
            item={item}
            avatar={avatar}
            titleKey={titleKey}
            curApp={curApp}
          />
        </Col>
      ))}
    </React.Fragment>
  );
};

const UserCard: React.FC<UserCardProps> = ({
  preserveIngredients,
  defaultTake,
  toggler,
  icons,
  item,
  avatar,
  titleKey,
  curApp,
}) => {
  const { username, email } = item;
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const classes = showInfo ? `info expand ${styleProps.info} ${styleProps.expand}` : `info shrink ${styleProps.info} ${styleProps.shrink}`;
  const classesWithChecked = item.checked ? `${classes} checked ${styleProps.checked}` : classes;

  return (
    <div style={avatar} className={`card ${styleProps.card}`} onClick={() => toggler(item.id as number)}>
      <div
        className={classesWithChecked}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setShowInfo((previous) => !previous);
        }}
      >
        <h1 className={`title noscrollvisible ${styleProps.title} ${styleProps.noscrollvisible}`}>{item[titleKey]}</h1>
        <span className={`details noscrollvisible ${styleProps.details} ${styleProps.noscrollvisible}`}>{username}</span>
        <span className={`details noscrollvisible ${styleProps.details} ${styleProps.noscrollvisible}`}>{email}</span>
        <IconsWidget
          preserveIngredients={preserveIngredients}
          defaultTake={defaultTake}
          curApp={curApp}
          icons={icons}
          data={item}
          inline
        />
      </div>
    </div>
  );
};

export default Container;
