import { Settings, UserGroupFill } from '@digital-twin/icons';
import { useTranslate } from '@digital-twin/utils';

import { Container } from '../../../layout';
import UserConfiguration from './components/user-configuration';
import UserGroup from './components/user-group';
import { useUserManagement } from './user-management.hooks';
import styles from './user-management.module.scss';

export const UserManagement = () => {
  const {
    selected,
    setSelected,
    searchValue,
    setSearchValue,
    ascendingUg,
    setAscendingUg,
    ascendingLoc,
    setAscendingLoc,
  } = useUserManagement();
  const { t } = useTranslate();
  return (
    <div className={styles['user-management']}>
      <Container
        title={t('common.user_group')}
        icon={<UserGroupFill />}
        className={styles['user-group']}
        onClick={() => {
          setSelected({
            type: '',
            value: null,
          });
        }}
        background={'none'}
      >
        <UserGroup
          selected={selected}
          setSelected={setSelected}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          ascendingUg={ascendingUg}
          ascendingLoc={ascendingLoc}
          setAscendingUg={setAscendingUg}
          setAscendingLoc={setAscendingLoc}
        />
      </Container>
      <Container
        title={t('common.configuration')}
        icon={<Settings />}
        className={styles['user-configuration']}
        background={'none'}
      >
        <UserConfiguration
          type={selected.type}
          value={selected.value}
          setSelected={setSelected}
        />
      </Container>
    </div>
  );
};
