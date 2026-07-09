import React from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import * as styles from '../../../styles/settings.module.css';
import { useAudioImportExport } from '../../../Hooks/useAudioImportExport';
import { AUDIO_CHUNK_SIZE_MB_OPTIONS } from '../../../library/directoryTreeUtils';

const styleProps = {
  colSm12: styles['col-sm-12'],
  btnBlock: styles['btn-block'],
  reset: styles['reset'],
  slctbx: styles['slctbx'],
};

const AudioImportExportButtons: React.FC = () => {
  const {
    inProgress,
    isPncApp,
    isTutorialApp,
    importSupported,
    exportSupported,
    chunkSizeMb,
    handleChunkSizeChange,
    handleImportAudio,
    handleExportAudio,
  } = useAudioImportExport();

  if (!isTutorialApp) return null;

  return (
    <>
      <Row className={`${styleProps.slctbx} mb-1`}>
        <Col sm={12} className={`${styleProps.colSm12} ps-0 pe-1`}>
          <select
            id="audio-chunk-size-select"
            value={chunkSizeMb}
            onChange={handleChunkSizeChange}
            disabled={inProgress || !isPncApp}
          >
            {AUDIO_CHUNK_SIZE_MB_OPTIONS.map((sizeMb) => (
              <option key={sizeMb} value={sizeMb}>
                {sizeMb} MB chunks
              </option>
            ))}
          </select>
        </Col>
      </Row>
      <Row className="mb-1">
        <Col sm={6} className={styleProps.colSm12 + ' ps-0 pe-1'}>
          <Button
            className={styleProps.btnBlock + ' ' + styleProps.reset + ' w-100'}
            onClick={handleImportAudio}
            variant="outline-secondary"
            type="button"
            disabled={inProgress || !importSupported}
          >
            Import Audio
          </Button>
        </Col>
        <Col sm={6} className={styleProps.colSm12 + ' ps-0 pe-1'}>
          <Button
            className={styleProps.btnBlock + ' ' + styleProps.reset + ' w-100'}
            onClick={handleExportAudio}
            variant="outline-secondary"
            type="button"
            disabled={inProgress || !exportSupported}
          >
            Export Audio
          </Button>
        </Col>
      </Row>
    </>
  );
};

export default AudioImportExportButtons;
