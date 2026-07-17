import { getURL, t } from '@digital-twin/utils';
import { PopupUserProfile } from '@digital-twin/reusables';

import { useProfileConfig } from './profile-config.hook';

interface ProfileConfigProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileConfig = ({ open, onClose }: ProfileConfigProps) => {
  const {
    handleChangePassword,
    handleUpdateProfile,
    handleValidateNewPassword,
    handleVerifyOldPassword,
    userDetailsData,
  } = useProfileConfig(open);

  return (
    <PopupUserProfile
      onClose={onClose}
      badge={userDetailsData?.employeeID ?? ''}
      errorInputs={{
        fullName: '',
      }}
      fullName={userDetailsData?.name ?? ''}
      imgSrc={`${getURL()}/${userDetailsData?.photoURL}`}
      onChangePassword={handleChangePassword}
      onUpdateProfile={handleUpdateProfile}
      onValidateNewPassword={handleValidateNewPassword}
      onVerifyOldPassword={handleVerifyOldPassword}
      open={open}
      username={userDetailsData?.username ?? ''}
      skipValidate={userDetailsData?.role !== 'basic' ? true : false}
      internationalization={{
        title: t('common.user_profile'),
        fullNameLabel: t('common.name'),
        usernameLabel: t('common.username'),
        passwordLabel: t('common.password'),
        edit: t('common.edit'),
        cancel: t('common.cancel'),
        save: t('common.save'),
        next: t('common.next'),
        changePassword: t('common.change_password'),
        newPasswordLabel: t('common.new_password'),
        confirmPasswordLabel: t('common.confirm_password'),
        errUnknown: t('common.err_unknown'),
        errPasswordDoesNotMatch: t('common.err_password_not_match'),
      }}
    />
  );
};
