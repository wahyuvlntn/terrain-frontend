import { t } from '@digital-twin/utils';
import { TabProduct as Tab, TabsProduct as Tabs } from '@digital-twin/reusables';
import { ComponentType, LazyExoticComponent, Suspense, useState } from 'react';

import { Loading } from '../../../others';
import styles from './preview.module.scss';

type PreviewProps = {
  onLoad: () => void;
  WebContent: LazyExoticComponent<ComponentType<{ onLoad: () => void }>>;
};

export const Preview = ({ onLoad, WebContent }: PreviewProps) => {
  const [activeTab, setActiveTab] = useState('web');

  return (
    <div className={styles.preview}>
      <div className={styles['tabs-content']}>
        <Tabs value={activeTab} onChange={setActiveTab} className={styles.tabs}>
          <Tab value={'web'}>{t('common.web_view')}</Tab>
        </Tabs>
        <div
          className={styles.content}
          id={'preview-content'}
          style={{
            borderTopLeftRadius: activeTab === 'web' ? 0 : '8px',
          }}
        >
          <Suspense fallback={<Loading isLoading={true} />}>
            <WebContent onLoad={onLoad} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};
