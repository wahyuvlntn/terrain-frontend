import { useMemo, useRef, useState } from 'react';
import { default as PhotoCamera } from '../../icons/PhotoCamera';
import { UserAvatar } from '../Header.platform/UserAvatar';
import { Popup } from '../Popup/Popup';
import { HeaderInfo } from './PopupUserProfile/HeaderInfo';
import { PopupChangePassword } from './PopupUserProfile/PopupChangePassword';
import { ProfileForm } from './PopupUserProfile/ProfileForm';

export interface ErrorInputs {
  fullName: string;
}

export interface PopupUserProfileProps {
  /**
   * Indicates whether the popup is open.
   */
  open: boolean;

  /**
   * The full name of the user to be displayed in the popup.
   */
  fullName: string;

  /**
   * The URL of the user's profile image.
   */
  imgSrc: string;

  /**
   * The username of the user.
   */
  username: string;

  /**
   * The badge or title of the user, such as "Admin" or "Member".
   */
  badge: string;

  /**
   * Indicates whether verify step should be skipped.
   */
  skipValidate?: boolean;

  /**
   * Function to handle the closing of the popup.
   */
  onClose: () => void;

  /**
   * Callback function to verify the old password. If the password is incorrect,
   * an error message will be displayed and the user cannot proceed to change the password.
   *
   * @param currPassword - The current password to verify.
   * @returns A promise that resolves when the verification is complete.
   */
  onVerifyOldPassword: (currPassword: string) => Promise<void>;

  /**
   * Callback function to validate the new password. If the password is invalid,
   * an error message will be displayed under `newPassword` field and the user cannot proceed to change the password.
   * Return `null` if the password is valid.
   *
   * @param newPassword - The new password to validate.
   * @returns An error message if the password is invalid, or `null` if the password is valid.
   *
   */
  onValidateNewPassword: (newPassword: string) => string | null;

  /**
   * Callback function to change the password. If the operation fails,
   * the user cannot proceed to change the password and will remain on the that popup.
   *
   * @param newPassword - The new password to set.
   * @returns A promise that resolves when the password is successfully changed.
   */
  onChangePassword: (newPassword: string) => Promise<void>;

  /**
   * Callback function to update the user's profile information.
   *
   * @param fullName - The new full name of the user.
   * @param email - The new email address of the user.
   * @param newProfilePic - The new profile picture of the user. Can be null if no new picture is provided.
   * @returns A promise that resolves when the profile is successfully updated.
   */
  onUpdateProfile: (fullName: string, newProfilePic: File | null) => Promise<void>;

  /**
   * Error messages to be displayed for the input fields.
   * Currently, supports error messages for `fullName` and `email` fields.
   *
   * Example:
   * ```tsx
   * errorInputs: {
   *   fullName: 'Full name is required',
   * }
   * ```
   */
  errorInputs: ErrorInputs;

  internationalization?: {
    title?: string;
    fullNameLabel?: string;
    usernameLabel?: string;
    passwordLabel?: string;
    changePassword?: string;
    edit?: string;
    cancel?: string;
    save?: string;
    next?: string;
    enterOldPasswordLabel?: string;
    newPasswordLabel?: string;
    confirmPasswordLabel?: string;
    errUnknown?: string;
    errPasswordDoesNotMatch?: string;
  };
}

export const PopupUserProfile = ({
  open,
  fullName,
  username,
  imgSrc,
  badge,
  skipValidate = false,
  onClose,
  onValidateNewPassword,
  onVerifyOldPassword,
  onChangePassword,
  onUpdateProfile,
  errorInputs,
  internationalization,
}: PopupUserProfileProps) => {
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const fr = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);

  const userPhoto = useMemo(() => {
    if (!newProfilePic) return '';
    return URL.createObjectURL(newProfilePic);
  }, [newProfilePic]);

  const handleCancel = () => {
    setNewProfilePic(null);
  };

  const handleClose = () => {
    setMode('view');
    onClose();
  };

  return (
    <Popup open={open} onClose={handleClose} title={internationalization?.title ?? 'User Profile'}>
      <div className="flex flex-col gap-12.5 text-(--afdd-neutral-text-title-heading) max-w-lg">
        <section className="flex items-center gap-6 w-full">
          <div
            className="relative cursor-pointer group/avatar"
            onClick={() => {
              fr.current?.click();
            }}
          >
            <UserAvatar
              fullName={fullName}
              imgSrc={userPhoto || imgSrc || ''}
              wrapperClassname="[&_span]:min-w-[85px] [&_span]:min-h-[85px] [&_span]:text-[48px] [&_span]:font-semibold"
              style={{
                minWidth: '85px',
                minHeight: '85px',
                fontSize: '48px',
                fontWeight: 600,
              }}
            />
            {mode === 'edit' && (
              <>
                <div className="hidden group-hover/avatar:block absolute cursor-pointer top-0 w-21.25 h-21.25 rounded-full bg-[rgba(0,0,0,0.6)]"></div>
                <div className="hidden group-hover/avatar:flex absolute top-0 w-21.25 h-21.25 items-center justify-center [&_path:first-child]:fill-transparent [&_path:last-child]:fill-current [&_circle]:fill-current">
                  <PhotoCamera
                    style={{
                      width: '50px',
                      height: '50px',
                      color: 'white',
                    }}
                  />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  ref={fr}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setNewProfilePic(e.target.files[0]);
                    }
                  }}
                />
              </>
            )}
          </div>

          <HeaderInfo fullName={fullName} badge={badge} username={username} />
        </section>
        <ProfileForm
          mode={mode}
          setMode={setMode}
          onCancel={handleCancel}
          username={username}
          defaultFullName={fullName}
          defaultBadge={badge}
          onChangePassword={() => {
            setOpenChangePassword(true);
          }}
          onUpdateProfile={async (fullName) => {
            await onUpdateProfile(fullName, newProfilePic);
            setMode('view');
            setNewProfilePic(null);
          }}
          errorInputs={errorInputs}
          internationalization={internationalization}
        />

        <PopupChangePassword
          open={openChangePassword}
          onClose={() => {
            setOpenChangePassword(false);
          }}
          onValidateNewPassword={onValidateNewPassword}
          onVerifyOldPassword={onVerifyOldPassword}
          onChangePassword={onChangePassword}
          skipValidate={skipValidate}
          internationalization={internationalization}
        />
      </div>
    </Popup>
  );
};
