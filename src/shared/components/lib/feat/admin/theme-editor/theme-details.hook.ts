import { zodResolver } from '@hookform/resolvers/zod';
import { generateColorFamily } from '@digital-twin/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hexToHsva, HslaColor, hslaToHsva, hsvaToHex, hsvaToHsla } from '@uiw/color-convert';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { DEFAULT_COLOR } from '../../../color';
import {
  addTheme,
  Color,
  getThemeDetails,
  TAddTheme,
  TUpdateThemeDetails,
  updateThemeDetails,
  updateThemeDetailsSchema,
} from './api';

const affectedSurfacePrimaryColors = [
  { number: 800, name: 'brandSurfaceSubtlePrimary' },
  { number: 300, name: 'brandSurfaceLightPrimary' },
  { number: 500, name: 'brandSurfaceDefaultPrimary' },
  { number: 600, name: 'brandSurfaceHoverPrimary' },
  { number: 700, name: 'brandSurfaceDarkPrimary' },
  { number: 300, name: 'brandSurfaceDefaultSecondary' },
  { number: 400, name: 'brandSurfaceHoverSecondary' },
  { number: 500, name: 'brandSurfaceDarkSecondary' },
  { number: 300, name: 'brandBorderLightPrimary' },
  { number: 500, name: 'brandBorderDefaultPrimary' },
  { number: 600, name: 'brandBorderDarkPrimary' },
  { number: 500, name: 'brandTextLabel_lightPrimary' },
  { number: 800, name: 'brandTextLabelPrimary' },
] as const;

const affectedContainerBaseColors = (isDarkMode: boolean) =>
  [
    { number: isDarkMode ? 950 : 50, name: 'backgroundLowest' },
    { number: isDarkMode ? 900 : 100, name: 'backgroundLow' },
    { number: isDarkMode ? 800 : 200, name: 'backgroundDefault' },
    { number: isDarkMode ? 700 : 300, name: 'backgroundHigh' },
    { number: isDarkMode ? 600 : 400, name: 'backgroundHighest' },
    { number: 600, name: 'neutralSurfaceDisabled' },
    { number: 800, name: 'neutralSurfaceDefault' },
    { number: 700, name: 'neutralSurfaceSubtle' },
    { number: 500, name: 'neutralSurfaceLight' },
    // { number: 300, name: 'neutralTextDisabled' },
    { number: 300, name: 'borderSeparatorNeutral' },
    { number: 700, name: 'borderDisabled' },
    { number: 800, name: 'borderSubtle' },
    { number: 50, name: 'borderLight' },
    { number: 200, name: 'borderDefault' },
    { number: 400, name: 'borderDark' },
  ] as const;

const DARK_MODE_THRESHOLD = 70;

const generateTriadicColors = (primary: HslaColor) => {
  const { h, s, l, a } = primary;
  return {
    primary,
    secondary: {
      h: (h + 120) % 360,
      s,
      l: Math.min(l + 10, 100),
      a,
    },
    tertiary: {
      h: (h + 240) % 360,
      s,
      l: Math.min(l + 10, 100),
      a,
    },
  };
};

const generateAndChangeStatusConditionSvgColors = (
  baseValue: string,
  namePrefix: string,
  primaryNumber: number,
  secondaryNumber: number
) => {
  const family = generateColorFamily(baseValue);
  const primary = family.find((color) => color.number === primaryNumber)?.hexCode ?? '#000000';
  const secondary = family.find((color) => color.number === secondaryNumber)?.hexCode ?? '#000000';

  changeHtmlColor({
    name: `${namePrefix}Primary`,
    hexCode: primary,
  });
  changeHtmlColor({
    name: `${namePrefix}Secondary`,
    hexCode: secondary,
  });

  return {
    primary,
    secondary,
  };
};

export const changeHtmlColor = (color: Color) => {
  const elements = document.querySelectorAll(`.${color.name}`);
  elements.forEach((element) => {
    element.setAttribute('fill', color.hexCode);
  });
  const strokeElements = document.querySelectorAll(`.stroke-${color.name}`);
  strokeElements.forEach((element) => {
    element.setAttribute('stroke', color.hexCode);
  });
};

const reducer = (acc: { [key: string]: string }, curr: Color) => ({
  ...acc,
  [curr.name]: curr.hexCode,
});

export const useThemeDetails = (id: number, onSuccess: () => void) => {
  const { data, isLoading } = useQuery({
    queryKey: [
      'THEME_DETAILS',
      {
        id,
      },
    ],
    queryFn: () => getThemeDetails(id),
    placeholderData: {
      colors: { ...DEFAULT_COLOR },
      name: '',
      isSurfaceSecondaryUsed: false,
      isSurfaceTertiaryUsed: false,
    },
    meta: { toastId: 'THEME_DETAILS' },
    enabled: !!id,
  });

  const { reset, handleSubmit, watch, control, getValues } = useForm<TUpdateThemeDetails>({
    resolver: zodResolver(updateThemeDetailsSchema),
    values: data ? { ...data, id } : undefined,
  });
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn:
      id === 0
        ? (data: TAddTheme) => addTheme(data)
        : (data: TUpdateThemeDetails) => updateThemeDetails(data),
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: ['THEME_LIST'],
      });
      queryClient.refetchQueries({
        queryKey: ['GET_ACTIVE_THEME'],
      });
      queryClient.refetchQueries({
        queryKey: [
          'THEME_DETAILS',
          {
            id,
          },
        ],
      });
      onSuccess();
    },
    meta: { toastId: 'UPDATE_THEME_DETAILS' },
  });

  const onSubmit = handleSubmit(
    (data) => mutate(data),
    (_errors, _event) => {
      // console.log({
      //   errors,
      //   event,
      // })
    }
  );

  const onGenerate = () => {
    const base = getValues('colors.base');

    const hsla = hsvaToHsla(hexToHsva(base));
    const { secondary, tertiary } = generateTriadicColors(hsla);

    onSurfacePrimaryChange(base);

    reset((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        surfacePrimary: base,
        surfaceSecondary: hsvaToHex(hslaToHsva(secondary)),
        surfaceTertiary: hsvaToHex(hslaToHsva(tertiary)),
      },
    }));
  };

  const onSurfacePrimaryChange = (value: string) => {
    const colorFamily = generateColorFamily(value);
    const containerBase = colorFamily.find((color) => color.number === 200)?.hexCode ?? '#000000';

    reset((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        containerBase,
      },
    }));
  };

  const onGraphColorSelect = (
    firstColor: string,
    secondColor: string,
    thirdColor: string,
    fourthColor: string
  ) => {
    const pelorous = generateColorFamily(firstColor).map((item) => ({
      ...item,
      name: `pelorous${item.number}`,
    }));
    const turquoiseblue = generateColorFamily(secondColor).map((item) => ({
      ...item,
      name: `turquoiseblue${item.number}`,
    }));
    const lochmara = generateColorFamily(thirdColor).map((item) => ({
      ...item,
      name: `lochmara${item.number}`,
    }));
    const persimmon = generateColorFamily(fourthColor).map((item) => ({
      ...item,
      name: `persimmon${item.number}`,
    }));

    pelorous.forEach(changeHtmlColor);
    turquoiseblue.forEach(changeHtmlColor);
    lochmara.forEach(changeHtmlColor);
    persimmon.forEach(changeHtmlColor);

    reset((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        pelorousBase: firstColor,
        ...pelorous.reduce(reducer, {}),
        turquoiseblueBase: secondColor,
        ...turquoiseblue.reduce(reducer, {}),
        lochmaraBase: thirdColor,
        ...lochmara.reduce(reducer, {}),
        persimmonBase: fourthColor,
        ...persimmon.reduce(reducer, {}),
      },
    }));
  };

  const surfacePrimary = watch('colors.surfacePrimary');
  useEffect(() => {
    const family = generateColorFamily(surfacePrimary);
    const affectedColors = affectedSurfacePrimaryColors.map((color) => ({
      name: color.name,
      hexCode: family.find((fam) => fam.number === color.number)?.hexCode ?? '#000000',
    }));

    affectedColors.forEach(changeHtmlColor);
    reset((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        ...affectedColors.reduce(reducer, {}),
      },
    }));
  }, [surfacePrimary, reset]);

  const containerBase = watch('colors.containerBase');
  useEffect(() => {
    const family = generateColorFamily(containerBase);
    const containerBaseHsla = hsvaToHsla(hexToHsva(containerBase));
    const isDarkMode = containerBaseHsla.l < DARK_MODE_THRESHOLD;
    const affectedColors = affectedContainerBaseColors(isDarkMode).map((color) => ({
      name: color.name as string,
      hexCode: family.find((fam) => fam.number === color.number)?.hexCode ?? '#000000',
    }));

    affectedColors.push(
      {
        name: 'neutralTextDisabled',
        hexCode: isDarkMode
          ? (family.find((fam) => fam.number === 300)?.hexCode ?? '#000000')
          : '#7C8791',
      },
      {
        name: 'neutralTextTitleHeading',
        hexCode: isDarkMode
          ? '#FFFFFF'
          : (family.find((fam) => fam.number === 950)?.hexCode ?? '#000000'),
      },
      {
        name: 'neutralTextLabel',
        hexCode: isDarkMode
          ? '#E7E7E7'
          : (family.find((fam) => fam.number === 400)?.hexCode ?? '#000000'),
      },
      {
        name: 'neutralTextBodyNeutral',
        hexCode: isDarkMode
          ? '#E7E7E7'
          : (family.find((fam) => fam.number === 900)?.hexCode ?? '#000000'),
      },
      {
        name: 'neutralTextCaptionPlaceholder',
        hexCode: isDarkMode
          ? '#FFFFFF'
          : (family.find((fam) => fam.number === 400)?.hexCode ?? '#000000'),
      }
    );

    affectedColors.forEach(changeHtmlColor);
    reset((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        ...affectedColors.reduce(reducer, {}),
      },
    }));
  }, [containerBase, reset]);

  const changeHtmlColorAndResetFormStatusCondition = useCallback(
    (params: {
      baseValue: string;
      namePrefix:
        | 'conditionNormal'
        | 'conditionWarning'
        | 'conditionCritical'
        | 'conditionAbnormal'
        | 'statusRunning'
        | 'statusIdle'
        | 'statusUnplanned_down'
        | 'statusPlanned_down'
        | 'statusOffline';
      primaryNumber: number;
      secondaryNumber: number;
    }) => {
      const { secondary, primary } = generateAndChangeStatusConditionSvgColors(
        params.baseValue,
        params.namePrefix,
        params.primaryNumber,
        params.secondaryNumber
      );

      reset((prev) => ({
        ...prev,
        colors: {
          ...prev.colors,
          [`${params.namePrefix}Primary`]: primary,
          [`${params.namePrefix}Secondary`]: secondary,
        },
      }));
    },
    [reset]
  );

  const conditionNormalBase = watch('colors.conditionNormalBase');
  useEffect(() => {
    changeHtmlColorAndResetFormStatusCondition({
      baseValue: conditionNormalBase,
      namePrefix: 'conditionNormal',
      primaryNumber: 500,
      secondaryNumber: 300,
    });
  }, [conditionNormalBase, changeHtmlColorAndResetFormStatusCondition]);

  const conditionWarningBase = watch('colors.conditionWarningBase');
  useEffect(() => {
    changeHtmlColorAndResetFormStatusCondition({
      baseValue: conditionWarningBase,
      namePrefix: 'conditionWarning',
      primaryNumber: 600,
      secondaryNumber: 400,
    });
  }, [conditionWarningBase, changeHtmlColorAndResetFormStatusCondition]);

  const conditionCriticalBase = watch('colors.conditionCriticalBase');
  useEffect(() => {
    changeHtmlColorAndResetFormStatusCondition({
      baseValue: conditionCriticalBase,
      namePrefix: 'conditionCritical',
      primaryNumber: 700,
      secondaryNumber: 500,
    });
  }, [conditionCriticalBase, changeHtmlColorAndResetFormStatusCondition]);

  const conditionAbnormalBase = watch('colors.conditionAbnormalBase');
  useEffect(() => {
    changeHtmlColorAndResetFormStatusCondition({
      baseValue: conditionAbnormalBase,
      namePrefix: 'conditionAbnormal',
      primaryNumber: 500,
      secondaryNumber: 500,
    });
  }, [conditionAbnormalBase, changeHtmlColorAndResetFormStatusCondition]);

  const statusRunningBase = watch('colors.statusRunningBase');
  useEffect(() => {
    changeHtmlColorAndResetFormStatusCondition({
      baseValue: statusRunningBase,
      namePrefix: 'statusRunning',
      primaryNumber: 500,
      secondaryNumber: 300,
    });
  }, [statusRunningBase, changeHtmlColorAndResetFormStatusCondition]);

  const statusIdleBase = watch('colors.statusIdleBase');
  useEffect(() => {
    changeHtmlColorAndResetFormStatusCondition({
      baseValue: statusIdleBase,
      namePrefix: 'statusIdle',
      primaryNumber: 400,
      secondaryNumber: 200,
    });
  }, [statusIdleBase, changeHtmlColorAndResetFormStatusCondition]);

  const statusUnplanned_downBase = watch('colors.statusUnplanned_downBase');
  useEffect(() => {
    changeHtmlColorAndResetFormStatusCondition({
      baseValue: statusUnplanned_downBase,
      namePrefix: 'statusUnplanned_down',
      primaryNumber: 500,
      secondaryNumber: 300,
    });
  }, [statusUnplanned_downBase, changeHtmlColorAndResetFormStatusCondition]);

  const statusPlanned_downBase = watch('colors.statusPlanned_downBase');
  useEffect(() => {
    changeHtmlColorAndResetFormStatusCondition({
      baseValue: statusPlanned_downBase,
      namePrefix: 'statusPlanned_down',
      primaryNumber: 500,
      secondaryNumber: 300,
    });
  }, [statusPlanned_downBase, changeHtmlColorAndResetFormStatusCondition]);

  const statusOfflineBase = watch('colors.statusOfflineBase');
  useEffect(() => {
    changeHtmlColorAndResetFormStatusCondition({
      baseValue: statusOfflineBase,
      namePrefix: 'statusOffline',
      primaryNumber: 600,
      secondaryNumber: 400,
    });
  }, [statusOfflineBase, changeHtmlColorAndResetFormStatusCondition]);

  const pelorousBase = watch('colors.pelorousBase');
  const turquoiseblueBase = watch('colors.turquoiseblueBase');
  const lochmaraBase = watch('colors.lochmaraBase');
  const persimmonBase = watch('colors.persimmonBase');

  const handleChangeColors = useCallback(() => {
    const colors = getValues('colors');
    Object.keys(colors).forEach((name) =>
      changeHtmlColor({
        name,
        hexCode: colors[name as keyof typeof colors],
      })
    );
  }, [getValues]);

  return {
    isLoading,
    onSubmit,
    control,
    onGenerate,
    onSurfacePrimaryChange,
    onGraphColorSelect,
    graphColors: {
      firstColor: pelorousBase,
      secondColor: turquoiseblueBase,
      thirdColor: lochmaraBase,
      fourthColor: persimmonBase,
    },
    handleChangeColors,
  };
};
