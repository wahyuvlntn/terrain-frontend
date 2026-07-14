import { FormEvent, MouseEventHandler, useEffect, useState } from 'react';
import { default as CloseIcon } from '../../../icons/CloseIcon';
import { default as EditIcon } from '../../../icons/EditIcon';
import { default as SaveIcon } from '../../../icons/SaveIcon';
import { ButtonPlatform as Button } from '../../../input/Button/Button.platform';
import { Input } from '../../../input/Input/Input';
import type { ErrorInputs } from '../PopupUserProfile';

function generateRandomPassword(length = 12): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex: number = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

interface ProfileFormProps {
  mode: 'edit' | 'view';
  setMode: (mode: 'edit' | 'view') => void;
  onCancel: () => void;
  username: string;
  defaultFullName: string;
  // FIXME: defaultBadge is not used
  defaultBadge: string;
  onChangePassword: () => void;
  onUpdateProfile: (fullName: string) => Promise<void>;
  errorInputs: ErrorInputs;
  internationalization?: {
    fullNameLabel?: string;
    usernameLabel?: string;
    passwordLabel?: string;
    changePassword?: string;
    edit?: string;
    cancel?: string;
    save?: string;
  };
}

export const ProfileForm = ({
  mode,
  setMode,
  onCancel,
  defaultFullName,
  username,
  onChangePassword,
  onUpdateProfile,
  errorInputs,
  internationalization,
}: ProfileFormProps) => {
  const [input, setInput] = useState({
    fullName: defaultFullName,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const readOnly = mode === 'view';

  useEffect(() => {
    setInput({
      fullName: defaultFullName,
    });
  }, [defaultFullName]);

  const onChange = (key: string, value: string) => {
    setInput((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('e', e);
    if (mode === 'view') {
      setMode('edit');
      return;
    }
    setIsSubmitting(true);
    try {
      await onUpdateProfile(input.fullName);
    } catch (error) {
      // handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    setMode('view');
    // Reset input
    setInput({
      fullName: defaultFullName,
    });
    onCancel();
  };

  return (
    <>
      <form id="form-user-profile" className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          label={internationalization?.fullNameLabel ?? 'Name'}
          name="fullName"
          variant="medium"
          value={input.fullName}
          onChange={(e) => {
            onChange(e.target.name, e.target.value);
          }}
          readOnly={readOnly}
          error={!readOnly ? errorInputs.fullName : ''}
          wrapperClassName="w-full [&_div_div:has(input)]:bg-[var(--afdd-background-low)]"
        />
        <Input
          label={internationalization?.usernameLabel ?? 'Username'}
          name="username"
          variant="medium"
          value={username}
          readOnly
          wrapperClassName="w-full [&_div_div:has(input)]:bg-[var(--afdd-background-low)]"
        />
        <div className="flex">
          <Input
            label={internationalization?.passwordLabel ?? 'Password'}
            type="password"
            variant="medium"
            value={generateRandomPassword(12)}
            wrapperClassName="w-full [&_div_div:has(input)]:bg-[var(--afdd-background-low)]"
            readOnly
          />
          {mode === 'edit' ? (
            <Button
              type="button"
              variant="default"
              prefixIcon={<EditIcon />}
              onClick={onChangePassword}
              style={{
                minWidth: '210px',
                backgroundColor: 'unset',
                display: 'flex',
                justifyContent: 'flex-end',
                alignSelf: 'flex-end',
                height: '36px',
              }}
            >
              <span>{internationalization?.changePassword ?? 'Change Password'}</span>
            </Button>
          ) : null}
        </div>
      </form>
      <div className="flex justify-end gap-2">
        {mode === 'view' ? (
          <Button
            type="submit"
            colorType="default-primary"
            variant="default"
            prefixIcon={<EditIcon />}
            disabled={isSubmitting}
            form="form-user-profile"
          >
            <span>{internationalization?.edit ?? 'Edit'}</span>
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="default"
              id="cancel"
              prefixIcon={<CloseIcon />}
              disabled={isSubmitting}
              onClick={handleCancel}
              style={{
                backgroundColor: 'unset',
              }}
            >
              <span>{internationalization?.cancel ?? 'Cancel'}</span>
            </Button>
            <Button
              type="submit"
              variant="default"
              prefixIcon={<SaveIcon />}
              disabled={isSubmitting}
              form="form-user-profile"
            >
              <span>{internationalization?.save ?? 'Save'}</span>
            </Button>
          </>
        )}
      </div>
    </>
  );
};
