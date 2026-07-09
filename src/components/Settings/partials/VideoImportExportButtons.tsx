import React from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import * as styles from '../../../styles/settings.module.css';
import { useVideoImportExport } from '../../../Hooks/useVideoImportExport';
import { VIDEO_CHUNK_SIZE_MB_OPTIONS } from '../../../library/videoSegmentImport';

const styleProps = {
  colSm12: styles['col-sm-12'],
  btnBlock: styles['btn-block'],
  reset: styles['reset'],
  slctbx: styles['slctbx'],
};

const VideoImportExportButtons: React.FC = () => {
  const {
    inProgress,
    isPncApp,
    isVideoApp,
    importSupported,
    exportSupported,
    chunkSizeMb,
    handleChunkSizeChange,
    handleImportVideos,
    handleExportVideos,
  } = useVideoImportExport();

  if (!isVideoApp) return null;

  return (
    <>
      <Row className={`${styleProps.slctbx} mb-1`}>
        <Col sm={12} className={`${styleProps.colSm12} ps-0 pe-1`}>
          <select
            id="video-chunk-size-select"
            value={chunkSizeMb}
            onChange={handleChunkSizeChange}
            disabled={inProgress || !isPncApp}
          >
            {VIDEO_CHUNK_SIZE_MB_OPTIONS.map((sizeMb) => (
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
            onClick={handleImportVideos}
            variant="outline-secondary"
            type="button"
            disabled={inProgress || !importSupported}
          >
            Import Videos
          </Button>
        </Col>
        <Col sm={6} className={styleProps.colSm12 + ' ps-0 pe-1'}>
          <Button
            className={styleProps.btnBlock + ' ' + styleProps.reset + ' w-100'}
            onClick={handleExportVideos}
            variant="outline-secondary"
            type="button"
            disabled={inProgress || !exportSupported}
          >
            Export Videos
          </Button>
        </Col>
      </Row>
    </>
  );
};

export default VideoImportExportButtons;
