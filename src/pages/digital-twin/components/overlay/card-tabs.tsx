import {
  TabProduct as Tab,
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProvider,
} from '@digital-twin/reusables';
import { ReactNode } from 'react';

import styles from './overlay.module.scss';

export type CardTab = { value: string; label: string };

type CardTabsProps = {
  tabs: CardTab[];
  value: string;
  onChange: (value: string) => void;
  /** controls at the right end of the tab row (e.g. a time window) */
  extra?: ReactNode;
  /** the `CardTabPanel`s */
  children: ReactNode;
};

/** Tabs of a floating card: the tab row stays put, the active panel is the card's one scroller */
export const CardTabs = ({ tabs, value, onChange, extra, children }: CardTabsProps) => (
  <TabProvider value={value} onChange={onChange} type="2" className={styles.tabs}>
    <div className={styles.tabs__bar}>
      <TabList className={styles.tabs__list}>
        {tabs.map((t) => (
          <Tab key={t.value} value={t.value} className={styles.tabs__tab}>
            {/* a real button: focusable, Enter / Space select the tab (its click reaches the Tab) */}
            <button
              type="button"
              role="tab"
              aria-selected={value === t.value}
              className={styles.tabs__btn}
            >
              {t.label}
            </button>
          </Tab>
        ))}
      </TabList>
      {extra ? <div className={styles.tabs__extra}>{extra}</div> : null}
    </div>
    {children}
  </TabProvider>
);

export const CardTabPanel = ({ value, children }: { value: string; children: ReactNode }) => (
  <TabPanel value={value} className={styles.tabs__panel}>
    {children}
  </TabPanel>
);
