import React, { useRef, useState } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { BsSearch } from 'react-icons/bs';
import {
  type SearchHistoryDay,
  isSearchHistoryAvailable,
  loadSearchHistory,
  removeDateFromHistory,
  removeSearchFromHistory,
} from '../../library/searchHistory';
import { _500 as NotFound } from './404';
import * as _404styles from '../../styles/404.module.css';
import * as styles from '../../styles/search.module.css';

const Logo = new URL('../../Images/logo256x256.png', import.meta.url).href;

interface SearchLandingProps {
  onSearch: (text: string) => void;
}

/** `YYYY-MM-DD` → local date label, e.g. "Mon, Nov 2, 2026". */
const formatDate = (date: string): string => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/** Studio's min-mode search screen, with localStorage search history in place of badges. */
const SearchLanding: React.FC<SearchLandingProps> = ({ onSearch }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [isAvailable] = useState(isSearchHistoryAvailable);
  const [history, setHistory] = useState<SearchHistoryDay[]>(() =>
    isAvailable ? loadSearchHistory() : [],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = ref.current?.value.trim() ?? '';
    if (text !== '') onSearch(text);
  };

  const update = (change: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    change();
    setHistory(loadSearchHistory());
  };

  const caption = !isAvailable
    ? 'error, local storage not available!'
    : history.length === 0
      ? 'oops, nothing in here!'
      : null;

  return (
    <div className={`screenFlex ${styles['screenFlex']}`}>
      <div className="details noscrollvisible">
        <img src={Logo} width={256} height={256} alt="logo" />
      </div>
      <Form onSubmit={submit} className="searchBox">
        <InputGroup className={`searchBarStyles ${styles['searchBarStyles']}`}>
          <Form.Control type="text" ref={ref} autoFocus className={`form-control ${styles['form-control']}`} />
          <a href="#" className="link" onClick={submit}>
            <div className={`input-group-prepend ${styles['input-group-prepend']}`}>
              <InputGroup.Text className={`input-group-text ${styles['input-group-text']}`}>
                <BsSearch />
              </InputGroup.Text>
            </div>
          </a>
        </InputGroup>
      </Form>
      {caption !== null ? (
        <div className={`${_404styles['notFound']} ${_404styles['bigger']}`}>
          <NotFound message={caption} />
        </div>
      ) : (
        <div className={styles['history']}>
          {history.map(({ date, searches }) => (
            <section key={date} className={styles['historyDay']}>
              <div className={styles['historyDate']}>
                <span>{formatDate(date)}</span>
                <button
                  type="button"
                  className="btn-close"
                  aria-label={`Remove searches from ${date}`}
                  onClick={update(() => removeDateFromHistory(date))}
                />
              </div>
              <div className={styles['historyTags']}>
                {searches.map((search) => (
                  <div
                    key={search}
                    role="button"
                    className={`alert alert-primary text-nowrap ${styles['historyTag']}`}
                    onClick={() => onSearch(search)}
                  >
                    <span>{search}</span>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label={`Remove ${search}`}
                      onClick={update(() => removeSearchFromHistory(date, search))}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchLanding;
