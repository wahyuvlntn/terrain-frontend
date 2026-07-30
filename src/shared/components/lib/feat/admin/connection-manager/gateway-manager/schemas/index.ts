import { t } from '@digital-twin/utils';
import { z } from 'zod';

export const gatewayProtocolSchema = z.union([
  z.literal('OPCUA'),
  z.literal('MQTT_SERVER'),
  z.literal('MQTT_CLIENT'),
  z.literal('REST_SERVER'),
  z.literal('REST_CLIENT'),
  z.literal('MODBUS_TCP'),
  z.literal('MODBUS_RTU'),
  z.literal('S7'),
  z.literal('MTCONNECT'),
]);

export type GatewayProtocolType = z.infer<typeof gatewayProtocolSchema>;

export const gatewayProtocolName = (protocol: GatewayProtocolType): string => {
  switch (protocol) {
    case 'OPCUA':
      return 'OPC UA Client';
    case 'MQTT_SERVER':
      return 'MQTT Server';
    case 'MQTT_CLIENT':
      return 'MQTT Client';
    case 'REST_SERVER':
      return 'REST Server';
    case 'REST_CLIENT':
      return 'REST Client';
    case 'MODBUS_TCP':
      return 'Modbus TCP';
    case 'MODBUS_RTU':
      return 'Modbus RTU';
    case 'S7':
      return 'S7';
    case 'MTCONNECT':
      return 'MTConnect';
    default:
      throw new Error(t('common.err_invalid_data_source_type'));
  }
};

export const gatewayEntrySchema = z.object({
  alias: z.string(),
  name: z.string(),
  type: gatewayProtocolSchema,
  description: z.string().nullable(),
  is_active: z.boolean(),
  is_connected: z.boolean(),
});

export type GatewayEntryType = z.infer<typeof gatewayEntrySchema>;

export const gatewayDetailsSchema = z.object({
  alias: z.string().refine(
    (alias) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(alias),

    'common.id_must_begin_with_a_letter_and_may_only_contains_alphanumerics_underscores'
  ),
  name: z.string(),
  type: gatewayProtocolSchema,
  description: z.string().nullable(),
  params: z.record(z.string().optional()),
  additionals: z.record(z.string().optional()),
});

export type GatewayDetailsType = z.infer<typeof gatewayDetailsSchema>;

export const gatewayStatusSchema = z.object({
  is_active: z.boolean(),
  is_connected: z.boolean(),
  error: z.string().nullable(),
  timestamp: z.number(),
});

export const gatewayTagSchema = z.object({
  name: z.string().refine((name) => name, 'common.required'),
  address: z.string().refine((address) => address, 'common.required'),
  description: z.string().nullable(),
});

export type GatewayTagType = z.infer<typeof gatewayTagSchema>;

export const gatewayPlcTagSchema = gatewayTagSchema.extend({
  address: z.string().refine((value) => {
    const splitted = value.split(':');
    const address = splitted.slice(0, -1).join(':');
    const dataType = splitted.at(-1) || '';
    return address && dataType;
  }, 'common.required'),
});

//TODO: remove this since it's not used anywhere
// export type GatewayPlcTagType = z.infer<typeof gatewayPlcTagSchema>;

export const addGatewayTagsFormSchema = z.object({
  gateway_alias: z.string().refine((name) => name, 'common.required'),
  gateway_tags: gatewayTagSchema
    .array()
    .refine((tags) => tags.length > 0, 'common.empty_tags'),
});

export type AddGatewayTagsFormType = z.infer<typeof addGatewayTagsFormSchema>;

export const addGatewayPlcTagsFormSchema = addGatewayTagsFormSchema.extend({
  gateway_tags: gatewayPlcTagSchema
    .array()
    .refine((tags) => tags.length > 0, 'common.empty_tags'),
});

//TODO: remove this since it's not used anywhere
// export type AddGatewayPlcTagsFormType = z.infer<
//   typeof addGatewayPlcTagsFormSchema
// >;

export const updateGatewayTagFormSchema = z.object({
  gateway_alias: z.string(),
  current_tag_name: z.string(),
  tag_name: z.string(),
  tag_address: z.string(),
  tag_description: z.string().nullable(),
});

export type UpdateGatewayTagFormType = z.infer<
  typeof updateGatewayTagFormSchema
>;

export const deleteGatewayTagFormSchema = z.object({
  gateway_alias: z.string(),
  tag_name: z.string(),
});

export type DeleteGatewayTagFormType = z.infer<
  typeof deleteGatewayTagFormSchema
>;

export const deleteGatewayTagsFormSchema = z.object({
  gateway_alias: z.string(),
  tags: z.string().array().min(1),
});

export type DeleteGatewayTagsFormType = z.infer<
  typeof deleteGatewayTagsFormSchema
>;

export const keyValuesSchema = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
  })
);
export const readFormSchema = z.object({
  gateway_alias: z.string(),
  gateway_tag_addresses: z.string().array(),
});

export type ReadFormType = z.infer<typeof readFormSchema>;

export const readResultSchema = z.record(z.string());

export type ReadResultType = z.infer<typeof readResultSchema>;

export const connectedEquipmentEntrySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  model_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  active_tags: z.number().int().nonnegative(),
});

export type ConnectedEquipmentEntryType = z.infer<
  typeof connectedEquipmentEntrySchema
>;

export const connectedEquipmentsSchema = z.object({
  equipments: connectedEquipmentEntrySchema.array(),
  models: z.record(z.string()),
  locations: z.record(z.string().array()),
});
const baseTagNodeSchema = z.object({
  address: z.string(),
  name: z.string(),
});

export type TagNodeType = z.infer<typeof baseTagNodeSchema> & {
  children?: TagNodeType[] | null;
};

export const tagNodeSchema: z.ZodType<TagNodeType> = baseTagNodeSchema.extend({
  children: z
    .lazy(() => z.array(tagNodeSchema))
    .nullable()
    .optional(),
});
