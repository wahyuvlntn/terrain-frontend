// import { FileTree, FlowsheetFill } from '@digital-twin/icons';
import { t, useLanguageSwitcher } from '@digital-twin/utils';
import {
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProduct as Tab,
  TabProvider,
} from '@digital-twin/reusables';
import { ReactNode } from 'react';
import clsx from 'clsx';
import { Container } from '../../../../../layout';
import style from './gateway-tabs.module.scss';

// Constants
export enum Menu {
  TAG_LIST = 'tag_list',
  CONNECTED_EQUIPMENTS = 'connected_equipments',
}

export const GatewayTabs = ({
  menu,
  onChangeMenu,
  tagList,
  connectedEquipments,
}: {
  menu: Menu;
  onChangeMenu: (menu: Menu) => void;
  tagList: ReactNode;
  connectedEquipments: ReactNode;
}) => {
  useLanguageSwitcher();

  return (
    <Container className={style['gateway-tabs']} background={'none'}>
      <TabProvider
        value={menu}
        onChange={(value) => {
          onChangeMenu(value as Menu);
        }}
        style={{
          height: '100%',
        }}
        type="1"
      >
        <TabList className={style['tab-list']}>
          <Tab
            // icon={<FileTree className={style['tab__icon']} />}
            label={t('common.tag_list')}
            value={Menu.TAG_LIST}
            style={{ fontSize: 22, fontWeight: 600 }}
          />
          <Tab
            // icon={<FlowsheetFill className={style['tab__icon']} />}
            label={t('common.connected_equipments')}
            value={Menu.CONNECTED_EQUIPMENTS}
            style={{ fontSize: 22, fontWeight: 600 }}
          />
        </TabList>
        <TabPanel
          value={Menu.TAG_LIST}
          className={clsx(
            style['tab-panel'],
            style['tab-panel--first-tab-selected']
          )}
        >
          {tagList}
        </TabPanel>
        <TabPanel
          value={Menu.CONNECTED_EQUIPMENTS}
          className={style['tab-panel']}
        >
          <div className={style['content']}>{connectedEquipments}</div>
        </TabPanel>
      </TabProvider>
    </Container>
  );
};
