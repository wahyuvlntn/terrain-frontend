import { Close, ReloadCircleFill, SaveFill } from '@digital-twin/icons';
import { generateRandomHexColor , t } from '@digital-twin/utils';
import clsx from 'clsx';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import { Button, Checkbox, Input, Loading } from '../../../..';
import { useThemeDetails } from './theme-details.hook';
import styles from './theme-details.module.scss';

type GraphColorProps = {
  name: string;
  colors: string[];
  onClick: (
    firstColor: string,
    secondColor: string,
    thirdColor: string,
    fourthColor: string
  ) => void;
  selected: boolean;
  isRandom?: boolean;
};

const GraphColor = ({
  colors,
  name,
  onClick,
  selected,
  isRandom,
}: GraphColorProps) => {
  return (
    <div
      className={clsx(styles['graph-color'], selected && styles.selected)}
      onClick={
        selected
          ? undefined
          : () => onClick(colors[0], colors[1], colors[2], colors[3])
      }
    >
      <div className={styles.title}>
        <span>{name}</span>
        {isRandom ? (
          <ReloadCircleFill
            onClick={(e) => {
              onClick(
                generateRandomHexColor(),
                generateRandomHexColor(),
                generateRandomHexColor(),
                generateRandomHexColor()
              );
              e.stopPropagation();
            }}
          />
        ) : null}
      </div>

      <div className={styles['graph-color-list']}>
        <div className={styles.color} style={{ background: colors[0] }} />
        <div className={styles['sub-color-list']}>
          {colors
            .filter((_, idx) => idx > 0)
            .map((color, idx) => (
              <div
                key={idx}
                className={styles.color}
                style={{ background: color }}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

const RandomGraphColor = (
  props: Omit<GraphColorProps, 'isRandom' | 'name'>
) => {
  const [colors, setColors] = useState([
    generateRandomHexColor(),
    generateRandomHexColor(),
    generateRandomHexColor(),
    generateRandomHexColor(),
  ]);

  useEffect(() => {
    if (props.selected) setColors([...props.colors]);
  }, [props.selected, ...props.colors]);

  return (
    <GraphColor {...props} name={'Random'} colors={colors} isRandom={true} />
  );
};

type ColorPickerProps<T extends FieldValues> = {
  control: Control<T>;
  registered: Path<T>;
  registeredCheckbox?: Path<T>;
  name: string;
  variant?: 'small' | 'large';
  onSurfacePrimaryChange?: (value: string) => void;
};

const ColorPicker = <T extends FieldValues>({
  control,
  registered,
  name,
  variant = 'large',
  registeredCheckbox,
  onSurfacePrimaryChange,
}: ColorPickerProps<T>) => {
  return (
    <div className={styles['color-picker']}>
      <Controller
        render={({ field }) => (
          <div
            className={clsx(
              styles['color-picker-container'],
              variant === 'small' && styles.small
            )}
            style={{
              background: field.value,
            }}
          >
            <input
              {...field}
              onChange={
                onSurfacePrimaryChange
                  ? (e) => {
                      field.onChange(e);
                      onSurfacePrimaryChange(e.target.value);
                    }
                  : field.onChange
              }
              type={'color'}
            />
          </div>
        )}
        name={registered}
        control={control}
      />
      <span>{name}</span>
      {registeredCheckbox ? (
        <Checkbox control={control} registered={registeredCheckbox} />
      ) : null}
    </div>
  );
};

type ColorPaletteGroupProps<T extends FieldValues> = {
  name: string;
  control: Control<T>;
  registeredList: {
    registered: Path<T>;
    name: string;
    registeredCheckbox?: Path<T>;
  }[];
  onSurfacePrimaryChange?: (value: string) => void;
};

const ColorPaletteGroup = <T extends FieldValues>({
  name,
  registeredList,
  control,
  onSurfacePrimaryChange,
}: ColorPaletteGroupProps<T>) => {
  return (
    <div className={styles['color-palette-group']}>
      <span>{name}</span>
      <div className={styles['color-picker-list']}>
        {registeredList.map((registered) => (
          <ColorPicker
            key={registered.name}
            control={control}
            registered={registered.registered}
            registeredCheckbox={registered.registeredCheckbox}
            name={registered.name}
            variant={'small'}
            onSurfacePrimaryChange={
              registered.name === 'Primary' ? onSurfacePrimaryChange : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

type BaseColorPickerProps<T extends FieldValues> = {
  control: Control<T>;
  registered: Path<T>;
};

const BaseColorPicker = <T extends FieldValues>({
  control,
  registered,
}: BaseColorPickerProps<T>) => {
  return (
    <Controller
      render={({ field }) => (
        <div className={styles['color-picker-code']}>
          <div
            className={styles['color-picker-container']}
            style={{
              background: field.value,
            }}
          >
            <input {...field} type={'color'} />
          </div>
          <div className={styles['code-container']}>
            <span>Hex Code</span>
            <Input
              value={field.value}
              onChange={field.onChange}
              wrapperProps={{
                className: styles.input,
              }}
            />
          </div>
        </div>
      )}
      name={registered}
      control={control}
    />
  );
};

export type THideStatusColors = {
  key: 'Running' | 'Idle' | 'Offline' | 'Unplanned_down' | 'Planned_down';
  hide?: boolean;
  rename?: string;
}[];

type ThemeDetailsProps = {
  id?: number;
  onBackNavClick: () => void;
  hideStatusColors?: THideStatusColors;
};

export type ChangeColorsHandle = {
  changeColors: () => void;
};

export const ThemeDetails = forwardRef<ChangeColorsHandle, ThemeDetailsProps>(
  ({ id, onBackNavClick, hideStatusColors }, ref) => {
    const GRAPH_COLORS = [
      {
        name: t('common.neon_aquarius'),
        colors: ['#1bb3c8', '#00c2e0', '#1c97db', '#ff6043'],
      },
      {
        name: t('common.bubble_gums'),
        colors: ['#440381', '#FFA5A5', '#51E5FF', '#EC368D'],
      },
      {
        name: t('common.neon_lavender'),
        colors: ['#826AED', '#FFB7FF', '#3BF4FB', '#CAFF8A'],
      },
      {
        name: t('common.autumn_blaze'),
        colors: ['#F9E784', '#D05353', '#E58F65', '#F1E8B8'],
      },
      {
        name: t('common.fresh_pastel'),
        colors: ['#B7FFD8', '#E8FFB7', '#FFC1CF', '#E2A0FF'],
      },
      {
        name: t('common.random'),
        colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
      },
    ];

    const {
      onGenerate,
      control,
      onSubmit,
      onSurfacePrimaryChange,
      isLoading,
      onGraphColorSelect,
      graphColors,
      handleChangeColors,
    } = useThemeDetails(id ?? 0, onBackNavClick);

    useImperativeHandle(
      ref,
      () => {
        return {
          changeColors: handleChangeColors,
        };
      },
      [handleChangeColors]
    );

    let selectedGraphColorIdx = GRAPH_COLORS.length - 1;
    for (let i = 0; i < GRAPH_COLORS.length; i++) {
      const color = GRAPH_COLORS[i];

      if (
        graphColors.firstColor === color.colors[0] &&
        graphColors.secondColor === color.colors[1] &&
        graphColors.thirdColor === color.colors[2] &&
        graphColors.fourthColor === color.colors[3]
      ) {
        selectedGraphColorIdx = i;
        break;
      }
    }

    const statusColors = (
      [
        {
          registered: 'colors.statusRunningBase',
          name: t('common.running'),
        },
        {
          registered: 'colors.statusIdleBase',
          name: t('common.idle'),
        },
        {
          registered: 'colors.statusUnplanned_downBase',
          name: t('common.unplanned_down'),
        },
        {
          registered: 'colors.statusPlanned_downBase',
          name: t('common.planned_down'),
        },
        {
          registered: 'colors.statusOfflineBase',
          name: t('common.offline'),
        },
      ] as const
    )
      .filter(
        (item) =>
          !hideStatusColors?.some(
            (color) =>
              `colors.status${color.key}Base` === item.registered && color.hide
          )
      )
      .map((item) => {
        const color = hideStatusColors?.find(
          (color) => `colors.status${color.key}Base` === item.registered
        );
        return {
          ...item,
          name: color?.rename ? color.rename : item.name,
        };
      });

    return (
      <form className={styles['theme-details']} onSubmit={onSubmit}>
        <div className={styles.header}>
          {/* <div className={styles.navigation}>
            <ArrowLeft onClick={onBackNavClick} />
            <span>
              {id ? t('common.palette_setup') : t('common.color_palette_new')}
            </span>
          </div> */}
          {id ? null : (
            <div className={styles['main-color-container']}>
              <BaseColorPicker control={control} registered={'colors.base'} />
              <Button type={'button'} onClick={onGenerate}>
                {t('common.generate')}
              </Button>
            </div>
          )}
        </div>
        {id ? null : (
          <>
            <div className={styles.hr} />
            <span className={styles['result-title-container']}>
              {t('common.result')}
            </span>
          </>
        )}
        <div className={styles['color-palette-list-container']}>
          <Loading isLoading={isLoading} />
          <Input
            label={t('common.palette_name') + ':'}
            labelPosition={'left'}
            control={control}
            registered={'name'}
            wrapperProps={{
              className: styles.input,
            }}
          />
          <ColorPaletteGroup
            control={control}
            registeredList={[
              {
                registered: 'colors.surfacePrimary',
                name: t('common.primary'),
              },
              {
                registered: 'colors.surfaceSecondary',
                name: t('common.secondary'),
                registeredCheckbox: 'isSurfaceSecondaryUsed',
              },
              {
                registered: 'colors.surfaceTertiary',
                name: t('common.tertiary'),
                registeredCheckbox: 'isSurfaceTertiaryUsed',
              },
            ]}
            name={t('common.surface') + ':'}
            onSurfacePrimaryChange={onSurfacePrimaryChange}
          />
          <ColorPaletteGroup
            control={control}
            registeredList={[
              {
                registered: 'colors.containerBase',
                name: t('common.background'),
              },
            ]}
            name={t('common.container') + ':'}
          />
          <ColorPaletteGroup
            control={control}
            registeredList={[
              {
                registered: 'colors.conditionNormalBase',
                name: t('common.normal'),
              },
              {
                registered: 'colors.conditionWarningBase',
                name: t('common.warning'),
              },
              {
                registered: 'colors.conditionCriticalBase',
                name: t('common.critical'),
              },
              {
                registered: 'colors.conditionAbnormalBase',
                name: t('common.abnormal'),
              },
            ]}
            name={t('common.condition_color') + ':'}
          />
          <ColorPaletteGroup
            control={control}
            registeredList={statusColors}
            name={t('common.status_color') + ':'}
          />
          <div className={styles['graph-colors']}>
            <span>{t('common.graph_color') + ':'}</span>
            <span>{t('common.graph_color_text')}</span>
            <div className={styles['graph-colors-list']}>
              {GRAPH_COLORS.map((color, idx) =>
                color.name === 'Random' ? (
                  <RandomGraphColor
                    key={color.name}
                    colors={[
                      graphColors.firstColor,
                      graphColors.secondColor,
                      graphColors.thirdColor,
                      graphColors.fourthColor,
                    ]}
                    onClick={onGraphColorSelect}
                    selected={selectedGraphColorIdx === idx}
                  />
                ) : (
                  <GraphColor
                    key={color.name}
                    name={color.name}
                    colors={color.colors}
                    onClick={onGraphColorSelect}
                    selected={selectedGraphColorIdx === idx}
                  />
                )
              )}
            </div>
          </div>
        </div>
        <div className={styles['buttons']}>
          <Button
            type={'button'}
            onClick={onBackNavClick}
            color={'default-secondary'}
            icon={<Close />}
          >
            {t('common.cancel')}
          </Button>
          <Button type={'submit'} icon={<SaveFill />}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    );
  }
);
