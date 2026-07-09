import React from 'react';
import { Image } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';


// Import icons
const zipIcon = new URL('../../Images/zip.png', import.meta.url).href;
const rezipIcon = new URL('../../Images/rezip.png', import.meta.url).href;
const addIcon = new URL('../../Images/add.png', import.meta.url).href;
const joinIcon = new URL('../../Images/join.png', import.meta.url).href;
const deleteIMG = new URL('../../Images/delete.png', import.meta.url).href;
const unjoinIcon = new URL('../../Images/unjoin.png', import.meta.url).href;
const transformIcon = new URL('../../Images/unzip.webp', import.meta.url).href;
const pencilIcon = new URL('../../Images/editPencil.png', import.meta.url).href;
const orderIcon = new URL('../../Images/listView-dark.png', import.meta.url).href;

interface CrudsProps {
  convCss: string;
  authenticated: boolean;
  launchzipper: () => void;
  launchrezipper: () => void;
  launchunzipper: () => void;
  setIsOpen: (isOpen: boolean) => void;
  launchJoiner: (pathname: string) => void;
  launchEditor: (pathname: string) => void;
  launchMokito: (pathname: string) => void;
  launchDeleter: (pathname: string) => void;
  launchUnjoiner: (pathname: string) => void;
  launchOrdering: (pathname: string) => void;
  styles: {
    shortcut: string;
    [key: string]: string;
    'shortcut-Container': string;
  };
}

const Cruds: React.FC<CrudsProps> = ({
  convCss,
  setIsOpen,
  launchJoiner,
  launchEditor,
  launchMokito,
  launchzipper,
  launchrezipper,
  launchDeleter,
  authenticated,
  launchUnjoiner,
  launchunzipper,
  launchOrdering,
  styles
}) => {
  const { pathname } = useLocation();
  const isApp = pathname.startsWith('/app');
  const cssClass = styles.shortcut + " " + (styles[convCss] ?? '');
  const isCpanel = pathname.indexOf('/cpanel') > -1;
  const isSearch = pathname.indexOf('/search') > -1;
  const isSettings = pathname.startsWith('/settings');
  const extras = pathname.match(/(\/verify|\/register|\/pricingplans)$/);
  const matches = pathname.match(/(\/course|\/tutorial|\/quiz)$/);
  const container = styles['shortcut-Container'] + " " + (styles[convCss] ?? '');
  const isIncoming = pathname.indexOf('/incoming') > -1;
  const isOutgoing = pathname.indexOf('/outgoing') > -1;
  const isCruds = authenticated && (matches?.length ?? 0) > 0;
  const isExtras = (extras?.length ?? 0) > 0;

  const joinHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    launchJoiner(pathname);
    setTimeout(() => setIsOpen(true));
  };

  const unjoinHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    launchUnjoiner(pathname);
    setTimeout(() => setIsOpen(true));
  };

  const mockHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    launchMokito(pathname);
    setTimeout(() => setIsOpen(true));
  };

  const editHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    launchEditor(pathname);
    setTimeout(() => setIsOpen(true));
  };

  const deleteHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    launchDeleter(pathname);
    setTimeout(() => setIsOpen(true));
  };

  const orderHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    launchOrdering(pathname);
    setTimeout(() => setIsOpen(true));
  };

  const zipHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    launchzipper();
    setTimeout(() => setIsOpen(true));
  };

  const rezipHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    launchrezipper();
  };

  const unzipHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    launchunzipper();
  };

  return (
    <React.Fragment>
      {isCruds && (
        <React.Fragment>
          <div className={container}>
            <Link to="#" onClick={joinHandler}>
              <Image className={cssClass} src={joinIcon} />
            </Link>
          </div>
          <div className={container}>
            <Link to="#" onClick={mockHandler}>
              <Image className={cssClass} src={addIcon} />
            </Link>
          </div>
          <div className={container}>
            <Link to="#" onClick={unjoinHandler}>
              <Image className={cssClass} src={unjoinIcon} />
            </Link>
          </div>
        </React.Fragment>
      )}
      {authenticated && isOutgoing && (
        <React.Fragment>
          <div className={container}>
            <Link to="#" onClick={zipHandler}>
              <Image className={cssClass} src={zipIcon} />
            </Link>
          </div>
          <div className={container}>
            <Link to="#" onClick={rezipHandler}>
              <Image className={cssClass} src={rezipIcon} />
            </Link>
          </div>
        </React.Fragment>
      )}
      {(isOutgoing || isIncoming) && (
        <div className={container}>
          <Link to="#" onClick={unzipHandler}>
            <Image className={cssClass} src={transformIcon} />
          </Link>
        </div>
      )}
      {authenticated && isIncoming && (
        <div className={container}>
          <Link to="#" onClick={deleteHandler}>
            <Image className={cssClass} src={deleteIMG} />
          </Link>
        </div>
      )}
      {authenticated &&
        !isApp &&
        !isCpanel &&
        !isSearch &&
        !isExtras &&
        !isSettings &&
        !isIncoming && (
          <React.Fragment>
            <div className={container}>
              <Link to="#" onClick={deleteHandler}>
                <Image className={cssClass} src={deleteIMG} />
              </Link>
            </div>
            <div className={container}>
              <Link to="#" onClick={editHandler}>
                <Image className={cssClass} src={pencilIcon} />
              </Link>
            </div>
          </React.Fragment>
        )}
      {!isApp && !isSettings && !isCpanel && !isExtras && (
        <div className={container}>
          <Link to="#" onClick={orderHandler}>
            <Image className={cssClass} src={orderIcon} />
          </Link>
        </div>
      )}
    </React.Fragment>
  );
};

export default Cruds; 