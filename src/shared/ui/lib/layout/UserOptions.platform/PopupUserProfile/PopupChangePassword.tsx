import { FormEvent, useEffect, useState } from 'react';
import { default as ArrowForwardIcon } from '../../../icons/ArrowForwardIcon';
import { default as CloseIcon } from '../../../icons/CloseIcon';
import { default as SaveIcon } from '../../../icons/SaveIcon';
import { ButtonPlatform as Button } from '../../../input/Button/Button.platform';
import { InputPassword } from '../../../input/InputPassword/InputPassword';
import { Popup } from '../../Popup/Popup';

// Example functions to verify and validate passwords
// const validatePassword = (password: string): string | null => {
//   const regex =
//     /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
//   if (!regex.test(password)) {
//     return `Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.`;
//   }
//   return null;
// };

interface PopupChangePasswordProps {
  open: boolean;
  onClose: () => void;
  onChangePassword: (newPassword: string) => Promise<void>;

  /**
   * Function to verify the old password. If the password is incorrect, an error message
   * will be displayed and the user cannot proceed to change the password.
   * @param oldPassword The old password to be verified.
   * @returns A promise that resolves if the old password is correct, or rejects with an error message if the password is incorrect.
   **/
  onVerifyOldPassword: (oldPassword: string) => Promise<void>;
  /**
   * Function to validate the new password. If the password is invalid, an error message
   * will be displayed and the user cannot proceed to change the password. Can be used to enforce password complexity rules.
   * @param newPassword The new password to be validated.
   * @returns An error message if the password is invalid, or null if the password is valid.
   **/
  onValidateNewPassword: (newPassword: string) => string | null;

  skipValidate: boolean;

  internationalization?: {
    changePassword?: string;
    enterOldPasswordLabel?: string;
    newPasswordLabel?: string;
    confirmPasswordLabel?: string;
    cancel?: string;
    next?: string;
    save?: string;
    errUnknown?: string;
    errPasswordDoesNotMatch?: string;
  };
}

export const PopupChangePassword = ({
  open,
  skipValidate,
  onClose,
  onVerifyOldPassword,
  onValidateNewPassword,
  onChangePassword,
  internationalization,
}: PopupChangePasswordProps) => {
  // Mode between "verify" old password and "change" to new password
  const [mode, setMode] = useState<'verify' | 'change'>(skipValidate ? 'change' : 'verify');

  // Input states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Error state
  const [error, setError] = useState({
    password: '',
    confirmPassword: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerifyOldPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onVerifyOldPassword(oldPassword);
      setMode('change');
      setError((prev) => ({
        ...prev,
        password: '',
      }));
    } catch (error) {
      if (error instanceof Error && error.message) {
        const message = error.message;
        setError((prev) => ({
          ...prev,
          password: (message || internationalization?.errUnknown) ?? 'Unknown error',
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate the new password based on the rules provided by the user
    const passwordError = onValidateNewPassword(newPassword);
    if (passwordError) {
      setError((prev) => ({
        ...prev,
        password: passwordError,
        confirmPassword: '',
      }));
      return;
    }

    // Check if new password and confirm password are the same
    if (newPassword !== confirmPassword) {
      setError((prev) => ({
        ...prev,
        password: '',
        confirmPassword: internationalization?.errPasswordDoesNotMatch ?? 'Passwords do not match',
      }));
      return;
    }

    try {
      setIsSubmitting(true);
      await onChangePassword(newPassword);
      handleCancel();
    } finally {
      setIsSubmitting(false);
      setError({
        password: '',
        confirmPassword: '',
      });
    }
  };

  const handleCancel = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMode('verify');
    setError({
      password: '',
      confirmPassword: '',
    });
    onClose();
  };

  useEffect(() => {
    if (skipValidate) {
      setMode('change');
    } else {
      setMode('verify');
    }
  }, [open, skipValidate]);

  return (
    <Popup
      open={open}
      onClose={handleCancel}
      title={internationalization?.changePassword ?? 'Change Password'}
    >
      {mode === 'verify' ? (
        <form
          id={'verify-old-password'}
          className="flex flex-col gap-12.5"
          onSubmit={handleVerifyOldPassword}
        >
          <InputPassword
            label={internationalization?.enterOldPasswordLabel ?? 'Enter Old Password'}
            name="oldPassword"
            value={oldPassword}
            onChange={(e) => {
              setOldPassword(e.target.value);
            }}
            error={error.password}
            wrapperClassName="w-full [&_div_div:has(input)]:bg-[var(--afdd-background-low)]"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="default"
              prefixIcon={<CloseIcon />}
              style={{
                backgroundColor: 'unset',
              }}
              disabled={isSubmitting}
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
            >
              <span>{internationalization?.cancel ?? 'Cancel'}</span>
            </Button>
            <Button
              type="submit"
              variant="default"
              suffixIcon={<ArrowForwardIcon />}
              disabled={isSubmitting}
            >
              <span>{internationalization?.next ?? 'Next'}</span>
            </Button>
          </div>
        </form>
      ) : (
        <form
          id={'change-new-password'}
          className="flex flex-col gap-12.5"
          onSubmit={handleChangePassword}
        >
          <div className="flex flex-col gap-4">
            <InputPassword
              label={internationalization?.newPasswordLabel ?? 'New Password'}
              name="newPassword"
              value={newPassword}
              error={error.password}
              onChange={(e) => {
                setNewPassword(e.target.value);
              }}
              wrapperClassName="w-full [&_div_div:has(input)]:bg-[var(--afdd-background-low)]"
            />
            <InputPassword
              label={internationalization?.confirmPasswordLabel ?? 'Confirm Password'}
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
              }}
              error={error.confirmPassword}
              wrapperClassName="w-full [&_div_div:has(input)]:bg-[var(--afdd-background-low)]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="default"
              prefixIcon={<CloseIcon />}
              style={{
                backgroundColor: 'unset',
              }}
              disabled={isSubmitting}
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
            >
              <span>{internationalization?.cancel ?? 'Cancel'}</span>
            </Button>
            <Button
              type="submit"
              variant="default"
              prefixIcon={<SaveIcon />}
              disabled={isSubmitting}
            >
              <span>{internationalization?.save ?? 'Save'}</span>
            </Button>
          </div>
        </form>
      )}
    </Popup>
  );
};
