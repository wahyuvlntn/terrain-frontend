import { jsRequest } from '@digital-twin/utils';
import { AxiosError } from 'axios';
import { z } from 'zod';

import { DEFAULT_COLOR } from '../../../color';

const themeSchema = z.object({
  id: z.number(),
  name: z.string(),
  colors: z.array(z.string()).length(4),
  isEditable: z.boolean(),
});

const getThemesSchema = z.object({
  isExtend: z.boolean(),
  data: z.array(themeSchema),
});

export type TGetThemes = z.infer<typeof getThemesSchema>;

export const getThemes = async (search: string, page: number) => {
  const data = await jsRequest({
    url: `/theme/getthemes`,
    body: {
      page,
      search,
      limit: 12,
    },
  });
  return getThemesSchema.parse({
    isExtend: data.is_extend,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data.data.map((item: any) => ({
      ...item,
      isEditable: item.is_editable,
    })),
  });
};

export const colorsSchema = z
  .object({
    base: z.string().catch(DEFAULT_COLOR.base),
    surfacePrimary: z.string().catch(DEFAULT_COLOR.surfacePrimary),
    surfaceSecondary: z.string().catch(DEFAULT_COLOR.surfaceSecondary),
    surfaceTertiary: z.string().catch(DEFAULT_COLOR.surfaceTertiary),
    containerBase: z.string().catch(DEFAULT_COLOR.containerBase),
    defaultSurfaceSecondary: z.string().catch(DEFAULT_COLOR.defaultSurfaceSecondary),
    defaultSurfaceTertiary: z.string().catch(DEFAULT_COLOR.defaultSurfaceTertiary),

    pelorousBase: z.string().catch(DEFAULT_COLOR.pelorousBase),
    pelorous50: z.string().catch(DEFAULT_COLOR.pelorous50),
    pelorous100: z.string().catch(DEFAULT_COLOR.pelorous100),
    pelorous200: z.string().catch(DEFAULT_COLOR.pelorous200),
    pelorous300: z.string().catch(DEFAULT_COLOR.pelorous300),
    pelorous400: z.string().catch(DEFAULT_COLOR.pelorous400),
    pelorous500: z.string().catch(DEFAULT_COLOR.pelorous500),
    pelorous600: z.string().catch(DEFAULT_COLOR.pelorous600),
    pelorous700: z.string().catch(DEFAULT_COLOR.pelorous700),
    pelorous800: z.string().catch(DEFAULT_COLOR.pelorous800),
    pelorous900: z.string().catch(DEFAULT_COLOR.pelorous900),
    pelorous950: z.string().catch(DEFAULT_COLOR.pelorous950),

    turquoiseblueBase: z.string().catch(DEFAULT_COLOR.turquoiseblueBase),
    turquoiseblue50: z.string().catch(DEFAULT_COLOR.turquoiseblue50),
    turquoiseblue100: z.string().catch(DEFAULT_COLOR.turquoiseblue100),
    turquoiseblue200: z.string().catch(DEFAULT_COLOR.turquoiseblue200),
    turquoiseblue300: z.string().catch(DEFAULT_COLOR.turquoiseblue300),
    turquoiseblue400: z.string().catch(DEFAULT_COLOR.turquoiseblue400),
    turquoiseblue500: z.string().catch(DEFAULT_COLOR.turquoiseblue500),
    turquoiseblue600: z.string().catch(DEFAULT_COLOR.turquoiseblue600),
    turquoiseblue700: z.string().catch(DEFAULT_COLOR.turquoiseblue700),
    turquoiseblue800: z.string().catch(DEFAULT_COLOR.turquoiseblue800),
    turquoiseblue900: z.string().catch(DEFAULT_COLOR.turquoiseblue900),
    turquoiseblue950: z.string().catch(DEFAULT_COLOR.turquoiseblue950),

    lochmaraBase: z.string().catch(DEFAULT_COLOR.lochmaraBase),
    lochmara50: z.string().catch(DEFAULT_COLOR.lochmara50),
    lochmara100: z.string().catch(DEFAULT_COLOR.lochmara100),
    lochmara200: z.string().catch(DEFAULT_COLOR.lochmara200),
    lochmara300: z.string().catch(DEFAULT_COLOR.lochmara300),
    lochmara400: z.string().catch(DEFAULT_COLOR.lochmara400),
    lochmara500: z.string().catch(DEFAULT_COLOR.lochmara500),
    lochmara600: z.string().catch(DEFAULT_COLOR.lochmara600),
    lochmara700: z.string().catch(DEFAULT_COLOR.lochmara700),
    lochmara800: z.string().catch(DEFAULT_COLOR.lochmara800),
    lochmara900: z.string().catch(DEFAULT_COLOR.lochmara900),
    lochmara950: z.string().catch(DEFAULT_COLOR.lochmara950),

    persimmonBase: z.string().catch(DEFAULT_COLOR.persimmonBase),
    persimmon50: z.string().catch(DEFAULT_COLOR.persimmon50),
    persimmon100: z.string().catch(DEFAULT_COLOR.persimmon100),
    persimmon200: z.string().catch(DEFAULT_COLOR.persimmon200),
    persimmon300: z.string().catch(DEFAULT_COLOR.persimmon300),
    persimmon400: z.string().catch(DEFAULT_COLOR.persimmon400),
    persimmon500: z.string().catch(DEFAULT_COLOR.persimmon500),
    persimmon600: z.string().catch(DEFAULT_COLOR.persimmon600),
    persimmon700: z.string().catch(DEFAULT_COLOR.persimmon700),
    persimmon800: z.string().catch(DEFAULT_COLOR.persimmon800),
    persimmon900: z.string().catch(DEFAULT_COLOR.persimmon900),
    persimmon950: z.string().catch(DEFAULT_COLOR.persimmon950),

    backgroundLowest: z.string().catch(DEFAULT_COLOR.backgroundLowest),
    backgroundLow: z.string().catch(DEFAULT_COLOR.backgroundLow),
    backgroundDefault: z.string().catch(DEFAULT_COLOR.backgroundDefault),
    backgroundHigh: z.string().catch(DEFAULT_COLOR.backgroundHigh),
    backgroundHighest: z.string().catch(DEFAULT_COLOR.backgroundHighest),

    brandSurfaceSubtlePrimary: z.string().catch(DEFAULT_COLOR.brandSurfaceSubtlePrimary),
    brandSurfaceLightPrimary: z.string().catch(DEFAULT_COLOR.brandSurfaceLightPrimary),
    brandSurfaceDefaultPrimary: z.string().catch(DEFAULT_COLOR.brandSurfaceDefaultPrimary),
    brandSurfaceHoverPrimary: z.string().catch(DEFAULT_COLOR.brandSurfaceHoverPrimary),
    brandSurfaceDarkPrimary: z.string().catch(DEFAULT_COLOR.brandSurfaceDarkPrimary),
    brandSurfaceDefaultSecondary: z.string().catch(DEFAULT_COLOR.brandSurfaceDefaultSecondary),
    brandSurfaceHoverSecondary: z.string().catch(DEFAULT_COLOR.brandSurfaceHoverSecondary),
    brandSurfaceDarkSecondary: z.string().catch(DEFAULT_COLOR.brandSurfaceDarkSecondary),
    brandBorderLightPrimary: z.string().catch(DEFAULT_COLOR.brandBorderLightPrimary),
    brandBorderDefaultPrimary: z.string().catch(DEFAULT_COLOR.brandBorderDefaultPrimary),
    brandBorderDarkPrimary: z.string().catch(DEFAULT_COLOR.brandBorderDarkPrimary),
    brandTextLabel_lightPrimary: z.string().catch(DEFAULT_COLOR.brandTextLabel_lightPrimary),
    brandTextLabelPrimary: z.string().catch(DEFAULT_COLOR.brandTextLabelPrimary),

    neutralSurfaceDisabled: z.string().catch(DEFAULT_COLOR.neutralSurfaceDisabled),
    neutralSurfaceDefault: z.string().catch(DEFAULT_COLOR.neutralSurfaceDefault),
    neutralSurfaceSubtle: z.string().catch(DEFAULT_COLOR.neutralSurfaceSubtle),
    neutralSurfaceLight: z.string().catch(DEFAULT_COLOR.neutralSurfaceLight),
    neutralTextDisabled: z.string().catch(DEFAULT_COLOR.neutralTextDisabled),
    neutralTextTitleHeading: z.string().catch(DEFAULT_COLOR.neutralTextTitleHeading),
    neutralTextLabel: z.string().catch(DEFAULT_COLOR.neutralTextLabel),
    neutralTextBodyNeutral: z.string().catch(DEFAULT_COLOR.neutralTextBodyNeutral),
    neutralTextCaption: z.string().catch(DEFAULT_COLOR.neutralTextCaption),
    neutralTextBodyLight: z.string().catch(DEFAULT_COLOR.neutralTextBodyLight),

    borderGraphAxisNeutral: z.string().catch(DEFAULT_COLOR.borderGraphAxisNeutral),
    borderSeparatorNeutral: z.string().catch(DEFAULT_COLOR.borderSeparatorNeutral),
    borderDisabled: z.string().catch(DEFAULT_COLOR.borderDisabled),
    borderSubtle: z.string().catch(DEFAULT_COLOR.borderSubtle),
    borderLight: z.string().catch(DEFAULT_COLOR.borderLight),
    borderDefault: z.string().catch(DEFAULT_COLOR.borderDefault),
    borderDark: z.string().catch(DEFAULT_COLOR.borderDark),

    conditionNormalBase: z.string().catch(DEFAULT_COLOR.conditionNormalBase),
    conditionNormalPrimary: z.string().catch(DEFAULT_COLOR.conditionNormalPrimary),
    conditionNormalSecondary: z.string().catch(DEFAULT_COLOR.conditionNormalSecondary),
    conditionWarningBase: z.string().catch(DEFAULT_COLOR.conditionWarningBase),
    conditionWarningPrimary: z.string().catch(DEFAULT_COLOR.conditionWarningPrimary),
    conditionWarningSecondary: z.string().catch(DEFAULT_COLOR.conditionWarningSecondary),
    conditionCriticalBase: z.string().catch(DEFAULT_COLOR.conditionCriticalBase),
    conditionCriticalPrimary: z.string().catch(DEFAULT_COLOR.conditionCriticalPrimary),
    conditionCriticalSecondary: z.string().catch(DEFAULT_COLOR.conditionCriticalSecondary),
    conditionAbnormalBase: z.string().catch(DEFAULT_COLOR.conditionAbnormalBase),
    conditionAbnormalPrimary: z.string().catch(DEFAULT_COLOR.conditionAbnormalPrimary),
    conditionAbnormalSecondary: z.string().catch(DEFAULT_COLOR.conditionAbnormalSecondary),

    statusRunningBase: z.string().catch(DEFAULT_COLOR.statusRunningBase),
    statusRunningPrimary: z.string().catch(DEFAULT_COLOR.statusRunningPrimary),
    statusRunningSecondary: z.string().catch(DEFAULT_COLOR.statusRunningSecondary),
    statusIdleBase: z.string().catch(DEFAULT_COLOR.statusIdleBase),
    statusIdlePrimary: z.string().catch(DEFAULT_COLOR.statusIdlePrimary),
    statusIdleSecondary: z.string().catch(DEFAULT_COLOR.statusIdleSecondary),
    statusUnplanned_downBase: z.string().catch(DEFAULT_COLOR.statusUnplanned_downBase),
    statusUnplanned_downPrimary: z.string().catch(DEFAULT_COLOR.statusUnplanned_downPrimary),
    statusUnplanned_downSecondary: z.string().catch(DEFAULT_COLOR.statusUnplanned_downSecondary),
    statusPlanned_downBase: z.string().catch(DEFAULT_COLOR.statusPlanned_downBase),
    statusPlanned_downPrimary: z.string().catch(DEFAULT_COLOR.statusPlanned_downPrimary),
    statusPlanned_downSecondary: z.string().catch(DEFAULT_COLOR.statusPlanned_downSecondary),
    statusOfflineBase: z.string().catch(DEFAULT_COLOR.statusOfflineBase),
    statusOfflinePrimary: z.string().catch(DEFAULT_COLOR.statusOfflinePrimary),
    statusOfflineSecondary: z.string().catch(DEFAULT_COLOR.statusOfflineSecondary),

    accentInfoPrimary: z.string().catch(DEFAULT_COLOR.accentInfoPrimary),
    accentInfoSecondary: z.string().catch(DEFAULT_COLOR.accentInfoSecondary),

    severityTagsStatusRequested: z.string().catch(DEFAULT_COLOR.severityTagsStatusRequested),
    severityTagsStatusRejected: z.string().catch(DEFAULT_COLOR.severityTagsStatusRejected),
    severityTagsStatusOpen: z.string().catch(DEFAULT_COLOR.severityTagsStatusOpen),
    severityTagsStatusInProgress: z.string().catch(DEFAULT_COLOR.severityTagsStatusInProgress),
    severityTagsStatusDone: z.string().catch(DEFAULT_COLOR.severityTagsStatusDone),
    severityTagsStatusClosed: z.string().catch(DEFAULT_COLOR.severityTagsStatusClosed),
    severityTagsStatusPaused: z.string().catch(DEFAULT_COLOR.severityTagsStatusPaused),

    severityCritical: z.string().catch(DEFAULT_COLOR.severityCritical),
    severityHigh: z.string().catch(DEFAULT_COLOR.severityHigh),
    severityMedium: z.string().catch(DEFAULT_COLOR.severityMedium),
    severityLow: z.string().catch(DEFAULT_COLOR.severityLow),

    foundationNeutralWhite: z.string().catch(DEFAULT_COLOR.foundationNeutralWhite),
  })
  .catch(DEFAULT_COLOR);
export type Colors = z.infer<typeof colorsSchema>;

export const colorSchema = z.object({ name: z.string(), hexCode: z.string() });

export type Color = z.infer<typeof colorSchema>;

const getActiveThemeSchema = z.object({
  themeId: z.number(),
  logo: z.string().optional().nullable(),
  colors: colorsSchema,
});

export const getActiveTheme = async () => {
  try {
    const data = await jsRequest({
      url: `/theme/getactivetheme`,
    });
    return getActiveThemeSchema.parse({
      themeId: data.theme_id,
      logo: data.logo,
      colors: data.colors.reduce(
        (acc: object, curr: { name: string; hex_code: string }) => ({
          ...acc,
          [curr.name]: curr.hex_code,
        }),
        {}
      ),
    });
  } catch (e) {
    if (e instanceof AxiosError) {
      if (e.code !== 'ERR_NETWORK') {
        throw e;
      }
    } else {
      throw e;
    }
  }
};

export const updateActiveThemeSchema = z.object({
  themeId: z.number(),
  logo: z
    .instanceof(FileList)
    .optional()
    .refine((files) => (files?.[0]?.size ?? 0) < 1024 * 1024, 'common.err_max_size_file')
    .refine(
      (files) =>
        ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'].includes(
          files?.[0]?.type ?? 'image/jpg'
        ),
      'common.err_supported_upload_image'
    ),
  deleteLogo: z.boolean().optional(),
});

export type TUpdateActiveTheme = z.infer<typeof updateActiveThemeSchema>;

export const updateActiveTheme = async (data: TUpdateActiveTheme) => {
  const res = await jsRequest({
    url: `/theme/setactivetheme`,
    data: {
      theme_id: data.themeId,
      logo: data.logo?.[0],
      delete_logo: data.logo?.length === 0 || !!data.deleteLogo,
    },
  });

  return z.string().parse(res);
};

const themeDetailsSchema = z.object({
  colors: colorsSchema,
  name: z.string().min(1),
  isSurfaceSecondaryUsed: z.boolean(),
  isSurfaceTertiaryUsed: z.boolean(),
});

export type ThemeDetails = z.infer<typeof themeDetailsSchema>;

export const getThemeDetails = async (id: number) => {
  const data = await jsRequest({
    url: `/theme/getthemedetails`,
    data: {
      theme_id: id,
    },
  });
  return themeDetailsSchema.parse({
    name: data.name,
    isSurfaceSecondaryUsed: data.is_surface_secondary_used,
    isSurfaceTertiaryUsed: data.is_surface_tertiary_used,
    colors: data.colors,
  });
};

export type TAddTheme = z.infer<typeof themeDetailsSchema>;

export const addTheme = async (data: TAddTheme) => {
  const { name, isSurfaceTertiaryUsed, isSurfaceSecondaryUsed, colors } = data;
  const {
    defaultSurfaceSecondary: _defaultSurfaceSecondary,
    defaultSurfaceTertiary: _defaultSurfaceTertiary,
    ...usedColors
  } = colors;
  const res = await jsRequest({
    url: `/theme/addtheme`,
    data: {
      name,
      is_surface_secondary_used: isSurfaceSecondaryUsed,
      is_surface_tertiary_used: isSurfaceTertiaryUsed,
      colors: JSON.stringify(
        Object.keys(usedColors).map((key) => ({
          name: key,
          hex_code: usedColors[key as keyof typeof usedColors],
        }))
      ),
    },
  });
  return z.string().parse(res);
};

export const updateThemeDetailsSchema = themeDetailsSchema.extend({
  id: z.number(),
});

export type TUpdateThemeDetails = z.infer<typeof updateThemeDetailsSchema>;

export const updateThemeDetails = async (data: TUpdateThemeDetails) => {
  const { name, id, isSurfaceTertiaryUsed, isSurfaceSecondaryUsed, colors } = data;
  const {
    defaultSurfaceSecondary: _defaultSurfaceSecondary,
    defaultSurfaceTertiary: _defaultSurfaceTertiary,
    ...usedColors
  } = colors;
  const res = await jsRequest({
    url: `/theme/updatetheme`,
    data: {
      theme_id: id,
      name,
      is_surface_secondary_used: isSurfaceSecondaryUsed,
      is_surface_tertiary_used: isSurfaceTertiaryUsed,
      colors: JSON.stringify(
        Object.keys(usedColors).map((key) => ({
          name: key,
          hex_code: usedColors[key as keyof typeof usedColors],
        }))
      ),
    },
  });
  return z.string().parse(res);
};

export const deleteTheme = async (id: number) => {
  const res = await jsRequest({
    url: `/theme/deletetheme`,
    data: {
      theme_id: id,
    },
  });

  return z.string().parse(res);
};

export const hasPermission = async (permission: 'create' | 'update' | 'delete') => {
  const data = await jsRequest({
    url: `/auth/checkpermission`,
    data: {
      permission_group: 'themeeditor',
      permission,
    },
  });

  return z.boolean().parse(data);
};
