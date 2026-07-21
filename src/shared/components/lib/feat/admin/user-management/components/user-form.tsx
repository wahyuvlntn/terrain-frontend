import { PopupDelete } from '@digital-twin/components';
import { SaveFill, TrashDeleteFill, UserCircle } from '@digital-twin/icons';
import { getURL } from '@digital-twin/utils';
import { t } from '@digital-twin/utils';
import { UserAvatar } from '@digital-twin/reusables';

import {
  Button,
  Checkbox,
  Dropdown,
  FileInput,
  Input,
} from '../../../../input';
import { useUserForm } from './user-form.hooks';
import styles from './user-form.module.scss';

const UserForm = (props: {
  username: string;
  setSelected: React.Dispatch<
    React.SetStateAction<{
      type: string;
      value: string | null;
    }>
  >;
}) => {
  const {
    control,
    userGroupOptions,
    isUpdatingImage,
    setIsUpdatingImage,
    isUpdatingPassword,
    setIsUpdatingPassword,
    alias,
    setAlias,
    handleSubmit,
    onSubmit,
    openPopupDelete,
    setOpenPopupDelete,
    name,
    photo,
    handleDeleteUser,
    assignedLocationString,
  } = useUserForm(props.username, props.setSelected);

  return (
    <>
      <div className={styles['title-container']}>
        <div className={styles['title']}>
          <UserCircle />
          <div>{t('common.user_detail')}</div>
        </div>
      </div>
      <form className={styles['user-form']} onSubmit={handleSubmit(onSubmit)}>
        <div className={styles['forms']}>
          <div className={styles['field-group']}>
            <div className={styles['form-group']}>
              <div>{t('common.user_group')}</div>
              <Dropdown
                options={userGroupOptions}
                wrapperClassName={styles['input']}
                value={alias}
                onChange={(e) => setAlias(e)}
                background="dark"
              />
            </div>
            <div className={styles['form-group']}>
              <div>{t('common.assigned_location')}</div>
              <Input
                readOnly={true}
                value={assignedLocationString}
                wrapperProps={{ className: styles['input'] }}
                background="dark"
              />
            </div>
          </div>
          <div className={styles['field-group']}>
            <div className={styles['form-group']}>
              <div>{t('common.name')}</div>
              <Input
                wrapperProps={{ className: styles['input'] }}
                control={control}
                registered="name"
                background="dark"
              />
            </div>
            <div className={styles['form-group']}>
              <div>{t('common.user_id')}</div>
              <Input
                wrapperProps={{ className: styles['input'] }}
                control={control}
                registered="user_id"
                background="dark"
              />
            </div>
          </div>
          <div className={styles['form-group']}>
            <div>{t('common.email')}</div>
            <Input
              wrapperProps={{ className: styles['input'] }}
              control={control}
              registered="email"
              background="dark"
            />
          </div>
          <div className={styles['checkbox-group']}>
            <Checkbox
              onChange={() => setIsUpdatingImage((prev) => !prev)}
              value={isUpdatingImage}
            />
            <div>{t('common.update_image')}</div>
          </div>
          {isUpdatingImage && (
            <div className={styles['form-group']}>
              <div>{t('common.photo')}</div>
              <FileInput
                accept="image/png, image/jpeg"
                control={control}
                registered="photo"
              />
            </div>
          )}
          <div className={styles['image-and-forms']}>
            <div className={styles['image']}>
              <UserAvatar
                fullName={'test name'}
                imgSrc={`${getURL()}/${photo}`}
                useInitialAsFallback={true}
                style={{
                  width: 170,
                  height: 170,
                  objectFit: 'cover',
                }}
                fallbackStyles={{
                  fontSize: 50,
                }}
              />
            </div>
            <div className={styles['forms']}>
              <div className={styles['form-group']}>
                <div>{t('common.username')}</div>
                <Input
                  wrapperProps={{ className: styles['input'] }}
                  control={control}
                  registered="username"
                  readOnly={true}
                  background="dark"
                />
              </div>
              <div className={styles['checkbox-group']}>
                <Checkbox
                  onChange={() => setIsUpdatingPassword((prev) => !prev)}
                  checked={isUpdatingPassword}
                />
                <div>{t('common.password_reset')}</div>
              </div>
              {isUpdatingPassword && (
                <>
                  <div className={styles['form-group']}>
                    <div>{t('common.password_new')}</div>
                    <Input
                      type="password"
                      wrapperProps={{ className: styles['input'] }}
                      readOnly={!isUpdatingPassword}
                      control={control}
                      registered="password"
                      background="dark"
                    />
                  </div>
                  <div className={styles['form-group']}>
                    <div>{t('common.password_confirm')}</div>
                    <Input
                      wrapperProps={{ className: styles['input'] }}
                      readOnly={!isUpdatingPassword}
                      type="password"
                      control={control}
                      registered="confirm_password"
                      background="dark"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className={styles['buttons']}>
          <Button
            color="error"
            icon={<TrashDeleteFill />}
            onClick={(e) => {
              e.preventDefault();
              setOpenPopupDelete(true);
            }}
          >
            {t('common.delete')}
          </Button>
          <div className={styles['right-side']}>
            <Button
              color="default-secondary"
              onClick={(e) => {
                e.preventDefault();
                props.setSelected({
                  type: '',
                  value: null,
                });
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button color="default-primary" icon={<SaveFill />} type="submit">
              {t('common.save')}
            </Button>
          </div>
        </div>
      </form>
      <PopupDelete
        entityType="User"
        entityName={name || ''}
        open={openPopupDelete}
        onClose={() => setOpenPopupDelete(false)}
        onDelete={handleDeleteUser}
      />
    </>
  );
};

export default UserForm;
