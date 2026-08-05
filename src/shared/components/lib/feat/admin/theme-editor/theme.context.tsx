import { useQuery } from '@tanstack/react-query';
import { createContext, ReactNode, useEffect } from 'react';

import { COLOR, DEFAULT_COLOR, STATIC_COLOR } from '../../../color';
import { Color, colorsSchema, getActiveTheme } from './api';

export const changeColors = (colors: Color[], querySelector: string) => {
  const themePreview = document.querySelector(querySelector);
  if (!themePreview) return;
  if (themePreview instanceof HTMLElement) {
    colors.forEach((color) =>
      themePreview.style.setProperty(
        `--afdd-${color.name.replace(
          /[A-Z]/g,
          (letter) => `-${letter.toLowerCase()}`
        )}`,
        color.hexCode
      )
    );
  }
};

export const ThemeContext = createContext<{
  logo?: string | null;
  colors: Omit<typeof COLOR, keyof typeof STATIC_COLOR>;
}>({
  colors: DEFAULT_COLOR,
});

type ThemeProviderProps = {
  children: ReactNode;
};

const LOCAL_STORAGE_KEY_LOGO = 'logo';
const LOCAL_STORAGE_KEY_THEME_COLORS = 'theme_colors';

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { data, isPlaceholderData } = useQuery({
    queryFn: getActiveTheme,
    staleTime: Infinity,
    queryKey: ['GET_ACTIVE_THEME'],
    placeholderData: () => {
      const logo = window.localStorage.getItem(LOCAL_STORAGE_KEY_LOGO);
      const colorsString = window.localStorage.getItem(
        LOCAL_STORAGE_KEY_THEME_COLORS
      );
      const data = {
        themeId: 1,
        logo: logo ?? undefined,
      };

      try {
        const colors = colorsSchema.parse(
          colorsString ? JSON.parse(colorsString) : null
        );
        return {
          ...data,
          colors,
        };
      } catch {
        return {
          ...data,
          colors: DEFAULT_COLOR,
        };
      }
    },
  });

  useEffect(() => {
    if (isPlaceholderData) return;

    if (data?.logo)
      window.localStorage.setItem(LOCAL_STORAGE_KEY_LOGO, data?.logo);

    if (data?.colors)
      window.localStorage.setItem(
        LOCAL_STORAGE_KEY_THEME_COLORS,
        JSON.stringify(data.colors)
      );
  }, [data?.logo, data?.colors, isPlaceholderData]);

  useEffect(() => {
    if (!data?.colors) return;

    changeColors(
      Object.keys(data.colors).map((color) => ({
        name: color,
        hexCode: data.colors[color as keyof typeof data.colors],
      })),
      ':root'
    );
  }, [data?.colors]);

  return (
    <ThemeContext.Provider
      value={{
        logo: data?.logo,
        colors: data?.colors ?? DEFAULT_COLOR,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
