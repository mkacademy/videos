import React, { useRef } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { BsSearch } from 'react-icons/bs';
import * as styles from '../../styles/search.module.css';

const Logo = new URL('../../Images/logo256x256.png', import.meta.url).href;

interface SearchLandingProps {
  onSearch: (text: string) => void;
}

/** Studio's min-mode search screen without badges: logo, textbox, search button. */
const SearchLanding: React.FC<SearchLandingProps> = ({ onSearch }) => {
  const ref = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = ref.current?.value.trim() ?? '';
    if (text !== '') onSearch(text);
  };

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
    </div>
  );
};

export default SearchLanding;
