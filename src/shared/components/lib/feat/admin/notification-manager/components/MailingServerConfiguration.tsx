/* eslint-disable simple-import-sort/imports */
import { t } from '@digital-twin/utils';
import {
  Button,
  Checkbox,
  COLOR,
  Container,
  Dropdown,
  Input,
  Loading,
  ToggleButton,
} from '@digital-twin/components';
import styles from '../styles.module.scss';
import { useMailingServerConfiguration } from './MailingServerConfiguration.hooks';
import { HideEyeFill, SaveFill, ShowEyeFill, Database } from '@digital-twin/icons';

interface MailingServerConfigurationProps {
  notificationAlias: string /* Notification alias */;
}

const MailingServerConfiguration = ({
  notificationAlias,
}: MailingServerConfigurationProps) => {
  const {
    periodOptions /* Timer period options */,
    mailingServerForm /* useForm for mailing server form */,
    showingPassword /* Show password state */,
    toggleShowPassword /* Function for toggling show password */,
    isFetchingEmailServerDetails /* Fetching state of email details */,
    onSubmit /* Submit handler */,
    hasUpdatePermission /* User update permission */,
  } = useMailingServerConfiguration(notificationAlias);
  return (
    <Container
      title={
        t('common.mailing_server_configuration')
        // 'Mailing Server Configuration'
      }
      icon={<Database style={{ width: 24, height: 24 }} />}
      className={styles['mailing-server-configuration']}
      contentWrapperProps={{
        style: {
          backgroundColor: COLOR.backgroundLowest,
          padding: '0 16px 16px',
        },
      }}
    >
      <div className={styles['mailing-server-configuration-content']}>
        <div className={styles['form']}>
          <Loading isLoading={isFetchingEmailServerDetails} />
          {/* Host field */}
          <Input
            label={t('common.host') + ':'}
            background="dark"
            labelSuffix={<p style={{ color: 'red' }}>*</p>}
            control={mailingServerForm.control}
            registered="smtp_host"
            wrapperProps={{
              className: styles['mailing-server-input'],
            }}
          />
          {/* Email sender field */}
          <Input
            label={t('common.email_sender') + ':'}
            background="dark"
            labelSuffix={<p style={{ color: 'red' }}>*</p>}
            control={mailingServerForm.control}
            registered="sender_email"
            wrapperProps={{
              className: styles['mailing-server-input'],
            }}
          />
          {/* Port field */}
          <Input
            label={t('common.port') + ':'}
            background="dark"
            labelSuffix={<p style={{ color: 'red' }}>*</p>}
            control={mailingServerForm.control}
            registered="smtp_port"
            wrapperProps={{
              className: styles['mailing-server-input'],
            }}
          />
          {/* Checkbox */}
          <Checkbox
            label={t('common.secure')}
            control={mailingServerForm.control}
            registered="is_secure"
          />
          {/* Password field */}
          <Input
            label={t('common.password') + ':'}
            background="dark"
            labelSuffix={<p style={{ color: 'red' }}>*</p>}
            control={mailingServerForm.control}
            registered="sender_password"
            type={showingPassword ? 'text' : 'password'}
            suffix={
              <div style={{ cursor: 'pointer' }} onClick={toggleShowPassword}>
                {showingPassword ? <ShowEyeFill /> : <HideEyeFill />}
              </div>
            }
            wrapperProps={{
              className: styles['mailing-server-input'],
            }}
          />
          {/* Interval field */}
          <div className={styles['interval-field']}>
            <div className={styles['label']}>{t('common.interval')}:</div>
            <div className={styles['input-fields']}>
              <Input
                wrapperProps={{
                  style: {
                    flex: 1,
                  },
                }}
                background="dark"
                labelSuffix={<p style={{ color: 'red' }}>*</p>}
                control={mailingServerForm.control}
                registered="interval"
              />
              {/* Interval option */}
              <Dropdown
                background="dark"
                wrapperStyles={{
                  width: 105,
                  borderRadius: '8px',
                  flex: 1,
                }}
                options={periodOptions}
                control={mailingServerForm.control}
                registered="interval_type"
              />
            </div>
          </div>
          {/* Active field */}
          <div className={styles['active-field']}>
            <div>{t('common.active')}</div>
            <ToggleButton
              control={mailingServerForm.control}
              registered="is_active"
            />
          </div>
        </div>
      </div>
      <div className={styles['save-button']}>
        {hasUpdatePermission && (
          <Button
            color="default-primary"
            icon={<SaveFill />}
            type="submit"
            onClick={mailingServerForm.handleSubmit(onSubmit)}
          >
            {t('common.save')}
          </Button>
        )}
      </div>
    </Container>
  );
};

export default MailingServerConfiguration;
