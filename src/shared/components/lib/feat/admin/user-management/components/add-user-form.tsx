/* eslint-disable simple-import-sort/imports */
import { Drawer, Dropdown, FileInput, Input } from '@digital-twin/components';
import { SettingsPreferences } from '@digital-twin/icons';

import { t } from '@digital-twin/utils';
import { useAddUserForm } from './add-user-form.hooks';
import styles from './add-user-form.module.scss';

const AddUserForm = (props: {
  open: boolean;
  onClose: () => void;
  userGroupAlias: string | null;
}) => {
  const { userGroupOptions, control, handleSubmit, onSubmit } = useAddUserForm(
    props.userGroupAlias,
    props.onClose
  );

  return (
    <Drawer
      title={t('common.add_user')}
      open={props.open}
      icon={<SettingsPreferences />}
      onClose={props.onClose}
      onSubmit={handleSubmit(onSubmit)}
      variant="add"
      background="dark"
    >
      <div className={styles['add-user']}>
        {/* User group alias input */}
        <div className={styles['form-group']}>
          <div>{t('common.user_group')}</div>
          <Dropdown
            wrapperClassName={styles['input']}
            options={userGroupOptions}
            control={control}
            registered="user_group_alias"
            background={'default'}
          />
        </div>
        {/* User's id input */}
        <div className={styles['form-group']}>
          <div>{t('common.user_id') + ':'}</div>
          <Input
            wrapperProps={{ className: styles['input'] }}
            control={control}
            registered="user_id"
            background={'default'}
          />
        </div>
        {/* User's name input */}
        <div className={styles['form-group']}>
          <div>{t('common.name') + ':'}</div>
          <Input
            wrapperProps={{ className: styles['input'] }}
            control={control}
            registered="name"
            background={'default'}
          />
        </div>
        {/* User's email input */}
        <div className={styles['form-group']}>
          <div>{t('common.email') + ':'}</div>
          <Input
            wrapperProps={{ className: styles['input'] }}
            control={control}
            registered="email"
            background={'default'}
          />
        </div>
        {/* User's username input */}
        <div className={styles['form-group']}>
          <div>{t('common.username') + ':'}</div>
          <Input
            wrapperProps={{ className: styles['input'] }}
            control={control}
            registered="username"
            background={'default'}
          />
        </div>
        {/* User's password input */}
        <div className={styles['form-group']}>
          <div>{t('common.password') + ':'}</div>
          <Input
            wrapperProps={{ className: styles['input'] }}
            type="password"
            control={control}
            registered="password"
            background={'default'}
          />
        </div>
        {/* User's confirm password input */}
        <div className={styles['form-group']}>
          <div>{t('common.password_confirm') + ':'}</div>
          <Input
            wrapperProps={{ className: styles['input'] }}
            type="password"
            control={control}
            registered="confirm_password"
            background={'default'}
          />
        </div>
        {/* User's photo password input */}
        <FileInput
          accept="image/png, image/jpeg"
          control={control}
          registered="photo"
          label={t('common.photo') + ':'}
        />
      </div>
    </Drawer>
  );
};

export default AddUserForm;
