import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

/* SCHEMA */
const emailServerDetailsSchema = z.object({
  alias: z.string(),
  notification_id: z.number(),
  is_secure: z.boolean(),
  notification_name: z.string(),
  sender_email: z.string(),
  sender_name: z.string(),
  sender_password: z.string(),
  smtp_host: z.string(),
  smtp_port: z.number(),
  timer_id: z.number(),
  is_timer_active: z.boolean(),
  recurring_type: z.enum(['minute', 'hour', 'second']),
  recurring_value: z.number(),
});

/* TYPE */
type EmailServerDetailsType = z.infer<typeof emailServerDetailsSchema>;

export const getEmailServerDetails = async (data: {
  alias: string;
}): Promise<EmailServerDetailsType> => {
  const response = await jsRequest({
    url: `/notification/getemailserverdetails`,
    data,
  });

  return emailServerDetailsSchema.parse(response);
};
