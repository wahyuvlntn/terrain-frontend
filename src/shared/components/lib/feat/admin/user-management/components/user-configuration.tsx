import { t } from '@digital-twin/utils';
import {
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProduct as Tab,
  TabProvider,
} from '@digital-twin/reusables';
import { useState } from 'react';

import ScreenAccess from './screen-access';
import styles from './user-configuration.module.scss';
import UserForm from './user-form';
import UserGroupForm from './user-group-form';

const UserConfiguration = (props: {
  type: string;
  value: string | null;
  setSelected: React.Dispatch<
    React.SetStateAction<{
      type: string;
      value: string | null;
    }>
  >;
}) => {
  // const [viewInfo, setViewInfo] = useState(true);
  // console.log(prj);
  const [tabValue, setTabValue] = useState('1');

  return (
    <div className={styles['content']}>
      {/* <div className={styles['navigation']}>
        <div
          className={viewInfo ? styles['chosen'] : ''}
          onClick={() => setViewInfo(true)}
        >
          Information
        </div>
        <div
          className={!viewInfo ? styles['chosen'] : ''}
          onClick={() => setViewInfo(false)}
        >
          Screen Access
        </div>
      </div>
      <div className={styles['inner-content']}>
        {viewInfo ? (
          <>
            {props.value && props.type === 'USER' && (
              <UserForm
                username={props.value}
                setSelected={props.setSelected}
              />
            )}
            {props.value && props.type === 'USER_GROUP' && (
              <UserGroupForm
                alias={props.value}
                setSelected={props.setSelected}
              />
            )}
          </>
        ) : (
          props.value && (
            <ScreenAccess
              type={props.type}
              value={props.value}
              setSelected={props.setSelected}
            />
          )
        )}
      </div> */}
      <TabProvider
        style={{ height: '100%' }}
        value={tabValue}
        className={styles.tabprovider}
        onChange={(e) => {
          setTabValue(e);
        }}
        type="4"
      >
        <TabList className={styles.tablist}>
          <Tab
            className={styles.tab}
            value="1"
            label={t('common.information')}
            wrapperStyle={{ flex: 1 }}
          />
          <Tab
            className={styles.tab}
            value="2"
            label={t('common.screen_access')}
            wrapperStyle={{ flex: 1 }}
          />
        </TabList>

        <TabPanel
          value="1"
          style={{ display: 'flex', height: '100%', padding: 0 }}
        >
          <div className={styles['inner-content']}>
            {props.value && props.type === 'USER' && (
              <UserForm
                username={props.value}
                setSelected={props.setSelected}
              />
            )}
            {props.value && props.type === 'USER_GROUP' && (
              <UserGroupForm
                alias={props.value}
                setSelected={props.setSelected}
              />
            )}
          </div>
        </TabPanel>
        <TabPanel
          value="2"
          style={{ display: 'flex', height: '100%', padding: 0 }}
        >
          <div className={styles['inner-content']}>
            {props.value && (
              <ScreenAccess
                type={props.type}
                value={props.value}
                setSelected={props.setSelected}
              />
            )}
          </div>
        </TabPanel>
      </TabProvider>
    </div>
  );
};

export default UserConfiguration;
