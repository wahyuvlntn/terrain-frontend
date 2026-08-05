/* eslint-disable simple-import-sort/imports */
import { useMutation, useQuery } from '@tanstack/react-query';
import { getEmailServerDetails } from '../api/GetEmailServerDetails';
import { useForm } from 'react-hook-form';
import { mailingServerSchema, MailingServerType } from './type';
import { zodResolver } from '@hookform/resolvers/zod';
import { useContext, useEffect, useState } from 'react';
import { AuthCtx } from '@digital-twin/components';
import { registerEmailNotification } from '../api/RegisterEmailNotification';

export const useMailingServerConfiguration = (
  notificationAlias: string /* Notification alias */
) => {
  /* Show password state */
  const [showingPassword, setShowingPassword] = useState(false);

  /* Function for toggling show password */
  const toggleShowPassword = () => {
    setShowingPassword((prev) => !prev);
  };

  /* Set sender name and notification alias based on project variant */
  const sender_name = 'EPM Notification';
  const notification_name = 'EPM Email Notification';

  /* Timer period options */
  const periodOptions = [
    {
      value: 'second',
      label: 'Second',
    },
    {
      value: 'minute',
      label: 'Minute',
    },
    {
      value: 'hour',
      label: 'Hour',
    },
  ];

  /* Mailing server configuration form */
  const mailingServerForm = useForm<MailingServerType>({
    resolver: zodResolver(mailingServerSchema),
    defaultValues: {
      interval_type: 'minute',
      name: sender_name,
      notification_name,
    },
  });

  /* useQuery for email server details */
  const {
    data: emailServerDetailsQuery,
    isFetching: isFetchingEmailServerDetails,
    refetch: refetchEmailServerDetailsQuery,
  } = useQuery({
    queryKey: ['getEmailServerDetails', notificationAlias],
    queryFn: () =>
      getEmailServerDetails({
        alias: notificationAlias,
      }),
  });

  /* Fill the field based on the data */
  useEffect(() => {
    if (emailServerDetailsQuery) {
      mailingServerForm.setValue('alias', emailServerDetailsQuery.alias);
      mailingServerForm.setValue(
        'interval',
        emailServerDetailsQuery.recurring_value
      );
      mailingServerForm.setValue(
        'interval_type',
        emailServerDetailsQuery.recurring_type
      );
      mailingServerForm.setValue(
        'is_active',
        emailServerDetailsQuery.is_timer_active
      );
      mailingServerForm.setValue(
        'is_secure',
        emailServerDetailsQuery.is_secure
      );
      mailingServerForm.setValue('name', emailServerDetailsQuery.sender_name);
      mailingServerForm.setValue(
        'notification_name',
        emailServerDetailsQuery.notification_name
      );
      mailingServerForm.setValue(
        'sender_email',
        emailServerDetailsQuery.sender_email
      );
      mailingServerForm.setValue(
        'sender_password',
        emailServerDetailsQuery.sender_password
      );
      mailingServerForm.setValue(
        'smtp_host',
        emailServerDetailsQuery.smtp_host
      );
      mailingServerForm.setValue(
        'smtp_port',
        emailServerDetailsQuery.smtp_port
      );
    }
  }, [emailServerDetailsQuery, mailingServerForm]);

  /* useMutation for registering email notification */
  const registerEmailNotificationMutation = useMutation({
    mutationFn: registerEmailNotification,
    onSuccess: () => {
      refetchEmailServerDetailsQuery();
    },
    meta: {
      toastId: 'registerEmailNotification',
    },
  });

  /* Mailing serve config submit handler */
  const onSubmit = (data: MailingServerType) => {
    registerEmailNotificationMutation.mutate({
      alias: data.alias,
      interval: parseInt(data.interval.toString()),
      is_active: data.is_active,
      is_secure: data.is_secure,
      name: data.notification_name,
      sender_email: data.sender_email,
      sender_name: data.name,
      sender_password: data.sender_password,
      smtp_host: data.smtp_host,
      smtp_port: parseInt(data.smtp_port.toString()),
    });
  };

  /* Check if user has update permission */
  const authContext = useContext(AuthCtx);
  const hasUpdatePermission = authContext.hasPermission(
    'notificationmanager',
    'update'
  );

  return {
    periodOptions,
    mailingServerForm,
    showingPassword,
    toggleShowPassword,
    isFetchingEmailServerDetails,
    onSubmit,
    hasUpdatePermission,
  };
};
