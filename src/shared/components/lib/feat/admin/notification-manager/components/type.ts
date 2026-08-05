import { t } from '@digital-twin/utils';
import { z } from 'zod';

/* Mailing server configuration validation schema */
export const mailingServerSchema = z
  .object({
    alias: z.string(),
    smtp_host: z.string().min(1, t('common.err_smtp_host_is_required')),
    sender_email: z.string().min(1, t('common.err_email_sender_is_required')),
    smtp_port: z.union([z.number(), z.string()]).refine(
      (value) =>
        /* Check if port is valid number greater or equal 0 */
        !isNaN(parseInt(value.toString())) && parseInt(value.toString()) >= 0,
      {
        message: t('common.err_please_input_valid_port'),
      }
    ),
    is_secure: z.boolean(),
    name: z.string(),
    notification_name: z.string(),
    sender_password: z.string().min(1, t('common.err_password_required')),
    interval: z.union([z.number(), z.string()]),
    interval_type: z.enum(['minute', 'hour', 'second']),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // Convert interval to a number if it's a string
    const interval = Number(data.interval);

    // Determine the interval in seconds based on interval_type
    let intervalInSeconds = 0;
    if (data.interval_type === 'minute') {
      intervalInSeconds = interval * 60;
    } else if (data.interval_type === 'hour') {
      intervalInSeconds = interval * 60 * 60;
    } else if (data.interval_type === 'second') {
      intervalInSeconds = interval;
    }

    // Check if interval exceeds 24 hours (86400 seconds)
    if (intervalInSeconds > 86400) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('common.err_interval_cannot_exceed_24_hours'),
        path: ['interval'], // Point to the interval field
      });
    }
  });

export type MailingServerType = z.infer<typeof mailingServerSchema>;
