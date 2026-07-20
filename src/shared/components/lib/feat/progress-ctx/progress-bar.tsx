// import { ChevronLeft } from '@digital-twin/icons';
import { ChevronDown, ChevronUp, Close } from '@digital-twin/icons';
import { t } from 'i18next';
import { useContext, useState } from 'react';

import { Button, Popup, ProgressBarContext } from '../../../index';
import styles from './progress-bar.module.scss';

export const ProgressBar = () => {
  const progContext = useContext(ProgressBarContext);
  const [collapsed, setCollapsed] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  if (!progContext) {
    return null;
  }

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      <Popup
        variant="apply"
        onClose={() => {
          setCancelConfirm(false);
        }}
        open={cancelConfirm}
        onSubmit={() => {
          setCancelConfirm(false);
          progContext.onAbortAll();
        }}
        title={t('common.cancel_download')}
      >
        <div style={{ padding: 16 }}>
          <span>{t('common.cancel_download_message')}</span>
        </div>
      </Popup>
      {progContext && progContext.queue && progContext.queue.length > 0 && (
        <div
          className={`${styles['progress-modal']} ${
            collapsed ? styles['collapsed'] : ''
          }`}
        >
          {
            <div className={styles.trigger}>
              <span>{t('common.generating') + '...'}</span>
              {collapsed ? (
                <div className={styles.actions}>
                  <Close onClick={() => setCancelConfirm(true)} />
                  <ChevronUp onClick={toggleCollapse} />
                </div>
              ) : (
                <div className={styles.actions}>
                  <Close onClick={() => setCancelConfirm(true)} />
                  <ChevronDown onClick={toggleCollapse} />
                </div>
              )}
            </div>
          }
          {progContext.queue.map(
            (item, index) =>
              item.isDownloading && (
                <div className={styles['progress-bar']} key={item.id}>
                  <div className={styles['progress-content']}>
                    <span>{`${index + 1}. ${item.baseMessage} (${
                      item.progress
                    }/${item.target})`}</span>
                    <Button
                      onClick={() => progContext.onAbort(item.id)}
                      color="error"
                      className={styles['cancel-button']}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </>
  );
};
