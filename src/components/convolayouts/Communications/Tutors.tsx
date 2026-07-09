import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row } from 'react-bootstrap';
import { avatars } from '../../../library/commsUtils';
import * as commsStyles from '../../../styles/comms.module.css';
import { Tutor, TutorStatus } from '../../../store/slices/commsSlice';
import { showInfos } from '../../../constants';

const styleProps = {
  d: commsStyles["d"],
  w: commsStyles["w"],
  card: commsStyles["card"],
  title: commsStyles["title"],
  expand: commsStyles["expand"],
  avatar: commsStyles["avatar"],
  shrink: commsStyles["shrink"],
  checked: commsStyles["checked"],
  details: commsStyles["details"],
  dismissBtn: commsStyles["dismissBtn"],
  highlighted: commsStyles["highlighted"],
  noscrollvisible: commsStyles["noscrollvisible"],
  colxl3: commsStyles["col-xl-3"],
  collg4: commsStyles["col-lg-4"],
  col12: commsStyles["col-12"],
  info: commsStyles["info"],
}

interface TutorsProps {
  tutors: Tutor[];
  authenticated: boolean;
  clickHandler: (payload: { id: number; isActive?: TutorStatus; isAble?: TutorStatus }) => void;
  outlineHandler: (payload: { ids: string[] }) => void;
  dismissHandler: (payload: string) => void;
  setCurMailer: (payload: number) => void;
}

const avatar = (type: string) => ({
  backgroundImage: `url(${avatars[type as keyof typeof avatars]})`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: 'cover',
});

const Tutors: React.FC<TutorsProps> = ({
  tutors = [],
  clickHandler,
  setCurMailer,
  authenticated,
  dismissHandler,
  outlineHandler,
}) => {
  return (
    <Container>
      <Row className={`hasBorders ${styleProps.avatar}`}>
        {tutors.map((minion) => (
          <div key={minion.id} className={`col-12 col-md-6 col-lg-4 col-xl-3 ${styleProps.col12} ${styleProps.collg4} ${styleProps.colxl3} `}>
            <Member
              id={minion.id}
              type={minion.type}
              email={minion.email}
              title={minion.title}
              status={minion.status}
              isAble={minion.isAble}
              checked={minion.checked}
              isActive={minion.isActive}
              setCurMailer={setCurMailer}
              clickHandler={clickHandler}
              authenticated={authenticated}
              outlineHandler={outlineHandler}
              dismissHandler={dismissHandler}
              isHighlighted={minion.isHighlighted}
            />
          </div>
        ))}
      </Row>
    </Container>
  );
};

interface MemberProps extends Omit<Tutor, 'isDismissed' | 'isModified' | 'ordinal'> {
  authenticated: boolean;
  setCurMailer: (id: number) => void;
  clickHandler: (payload: { id: number; isActive?: TutorStatus; isAble?: TutorStatus }) => void;
  outlineHandler: (payload: { ids: string[] }) => void;
  dismissHandler: (payload: string) => void;
}

const Member: React.FC<MemberProps> = ({
  id,
  type,
  email,
  title,
  status,
  checked,
  setCurMailer,
  clickHandler,
  authenticated,
  isHighlighted,
  outlineHandler,
  dismissHandler,
  isAble: { state: enabled, isModified: isModified0 },
  isActive: { state: connected, isModified: isModified1 },
}) => {
  const [showInfo, setShowInfo] = useState(showInfos[id] ?? false);
  const classes = showInfo ? `${styleProps.info} ${styleProps.expand}` : `${styleProps.info} ${styleProps.shrink}`;
  const ability = { state: enabled, isModified: isModified0 };
  const connection = { state: connected, isModified: isModified1 };
  const classesWithChecked = checked ? `${classes} ${styleProps.checked}` : classes;
  const color = !enabled || status === 2 ? ` d ${styleProps.d}` : status === 0 ? ` w ${styleProps.w}` : '';
  const userHigh = isHighlighted ? `card ${styleProps.card} ${styleProps.highlighted}` : `card ${styleProps.card}`;
  const adminstration = `title noscrollvisible ${styleProps.title} ${styleProps.noscrollvisible} ${color}`;
  const connectionToggler = (e: React.MouseEvent) => {
    clickHandler({ id, isActive: connection });
    e.stopPropagation();
  };

  const abilityToggler = (e: React.MouseEvent) => {
    clickHandler({ id, isAble: ability });
    e.stopPropagation();
  };

  const showToggler = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInfo((previous) => {
      showInfos[id] = !previous;
      return !previous;
    });
  };

  const selector = () => {
    setCurMailer(id);
    clickHandler({ id });
  };

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissHandler(id + type);
  };

  const outline = (e: React.MouseEvent) => {
    e.stopPropagation();
    outlineHandler({ ids: [id + type] });
  };

  const identifier = pad(id, 5);

  return (
    <div className={userHigh} style={avatar(type)} onClick={selector}>
      <span className={styleProps.dismissBtn} onClick={dismiss}>
        x
      </span>
      <div className={classesWithChecked} onClick={showToggler}>
        <h1 className={adminstration}>{title}</h1>
        <span className={`details noscrollvisible ${styleProps.details} ${styleProps.noscrollvisible}`} onClick={outline}>
          {`IsOutlined: ${isHighlighted}`}
        </span>
        <span className={`details noscrollvisible ${styleProps.details} ${styleProps.noscrollvisible}`}>{`Identifier: ${identifier}`}</span>
        {authenticated && (
          <React.Fragment>
            <span className={`details noscrollvisible ${styleProps.details} ${styleProps.noscrollvisible}`}>{email}</span>
            <Link to="#" onClick={connectionToggler} className={`details noscrollvisible ${styleProps.details} ${styleProps.noscrollvisible}`}>
              {`IsConnection: ${connected}`}
            </Link>
          </React.Fragment>
        )}
        <Link to="#" onClick={abilityToggler} className={`details noscrollvisible ${styleProps.details} ${styleProps.noscrollvisible}`}>
          {`IsActive: ${enabled}`}
        </Link>
      </div>
    </div>
  );
};

function pad(num: number, size: number): string {
  const s = '000000000' + num;
  return s.substring(s.length - size);
}

export default Tutors; 