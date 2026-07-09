import React from 'react';
import { Image } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useFullAccount } from '../../../Hooks/useFullAccount';
import { FullAccountProps } from '../ShortcutsProps';

const bell = new URL('../../../Images/bell.png', import.meta.url).href;
const save = new URL('../../../Images/save.png', import.meta.url).href;
const exit = new URL('../../../Images/3094700.png', import.meta.url).href;
const account = new URL('../../../Images/user.png', import.meta.url).href;
const gear = new URL('../../../Images/GEAR_DARK.png', import.meta.url).href;
const clearIcon = new URL('../../../Images/clear.png', import.meta.url).href;
const loading = new URL('../../../Images/loading.gif', import.meta.url).href;
const invertIcon = new URL('../../../Images/invert.png', import.meta.url).href;
const fetchdata = new URL('../../../Images/fetchdata.png', import.meta.url).href;
const fetchdataRed = new URL('../../../Images/fetchdata_red.png', import.meta.url).href;
const toggleIcon = new URL('../../../Images/dismissed.png', import.meta.url).href;
const selectallIcon = new URL('../../../Images/selectall.png', import.meta.url).href;
const clearSelIcon = new URL('../../../Images/clear_select.png', import.meta.url).href;
const unselectallIcon = new URL('../../../Images/unselectall.png', import.meta.url).href;

const FullAccount: React.FC<FullAccountProps> = (props) => {
  const {
    saver,
    IsProcessing,
    authenticated,
    loading: isLoading,
    isNotUnzipping,
  } = props;

  const {
    pathname,
    search,
    isApp,
    isSearch,
    isCpanel,
    isSettings,
    isExtras,
    cssClass,
    container,
    shouldHydrate,
    modalHandler,
    clearHandler,
    selectallHandler,
    unselectallHandler,
    clearSelectedHandler,
    sequenceQueryHandler,
    isFsqActive,
    queryHandler,
    invertselectionHandler,
    toggleDismissalsHandler,
    searchParams,
    onSettingsClick,
    onLoginClick,
  } = useFullAccount(props);
  const isSequencialFetch = !shouldHydrate && isFsqActive;
  const fetchdataIcon = isSequencialFetch ? fetchdataRed : fetchdata;
  const fetchHandler = isSequencialFetch ? sequenceQueryHandler : queryHandler;

  return (
    <React.Fragment>
      {!isApp && !isSettings && !isExtras && isNotUnzipping && (
        <div className={container} onClick={fetchHandler} style={{ position: 'relative' }}>
          <Image className={cssClass} src={fetchdataIcon} style={{ position: 'absolute', top: 0, left: 0, opacity: isLoading ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }} />
          <Image className={cssClass} src={loading} style={{ position: 'absolute', top: 0, left: 0, opacity: isLoading ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }} />
        </div>
      )}
      {!isSettings && (
        <div className={container}>
          <Link
            to="/settings"
            state={{ goBackUrl: pathname + (search || '') }}
            onClick={onSettingsClick}
          >
            <Image className={cssClass} src={gear} />
          </Link>
        </div>
      )}
      {authenticated && saver && (
        <div className={container} onClick={saver} style={{ position: 'relative' }}>
          <Image className={cssClass} src={save} style={{ top: 0, left: 0, position: 'absolute', opacity: IsProcessing ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }} />
          <Image className={cssClass} src={loading} style={{ top: 0, left: 0, position: 'absolute', opacity: IsProcessing ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }} />
        </div>
      )}
      {!isApp && !isSearch && !isSettings && !isCpanel && !isExtras && (
        <React.Fragment>
          <div className={container}><Link to="#" onClick={selectallHandler}><Image className={cssClass} src={selectallIcon} /></Link></div>
          <div className={container}><Link to="#" onClick={clearHandler}><Image className={cssClass} src={clearIcon} /></Link></div>
          <div className={container}><Link to="#" onClick={unselectallHandler}><Image className={cssClass} src={unselectallIcon} /></Link></div>
          <div className={container}><Link to="#" onClick={clearSelectedHandler}><Image className={cssClass} src={clearSelIcon} /></Link></div>
          <div className={container}><Link to="#" onClick={toggleDismissalsHandler}><Image className={cssClass} src={toggleIcon} /></Link></div>
        </React.Fragment>
      )}
      {isCpanel && !isExtras && (
        <React.Fragment>
          <div className={container}><Link to="#" onClick={clearHandler}><Image className={cssClass} src={clearIcon} /></Link></div>
          <div className={container}><Link to="#" onClick={toggleDismissalsHandler}><Image className={cssClass} src={toggleIcon} /></Link></div>
        </React.Fragment>
      )}
      <div className={container}><Link to="#" onClick={modalHandler}><Image className={cssClass} src={bell} /></Link></div>
      {!isApp && !isSettings && !isCpanel && !isSearch && !isExtras && (
        <div className={container}><Link to="#" onClick={invertselectionHandler}><Image className={cssClass} src={invertIcon} /></Link></div>
      )}
      <div className={container} style={{ position: 'relative' }}>
        <Link to={{ pathname: '/login', search: searchParams.toString() }} onClick={onLoginClick}>
          <Image className={cssClass} src={account} style={{ top: 0, left: 0, position: 'absolute', opacity: authenticated ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }} />
          <Image className={cssClass} src={exit} style={{ top: 0, left: 0, position: 'absolute', opacity: authenticated ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }} />
        </Link>
      </div>
    </React.Fragment>
  );
};

export default FullAccount;
