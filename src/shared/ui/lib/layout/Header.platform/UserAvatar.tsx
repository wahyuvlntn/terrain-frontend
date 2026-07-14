import * as Avatar from '@radix-ui/react-avatar';

import { CSSProperties, ForwardedRef, forwardRef, useMemo } from 'react';
import { cn } from '../../utils';

export interface UserAvatarProps {
  /**
   * The full name of the user. This is used to generate the initials for the avatar if no image is provided.
   */
  fullName: string;
  /**
   * The source URL for the user's avatar image. If undefined, a default or placeholder image might be used.
   */
  imgSrc: string | undefined;
  /**
   * A click handler for the avatar. It specifies the action to be performed when the avatar is clicked.
   */
  onClick?: () => void;
  /**
   * Additional class name for styling the container.
   */
  wrapperClassname?: string;

  style?: CSSProperties;

  /**
   * If true, the initials of the user's full name will be used as a fallback if image src is invalid
   */
  useInitialAsFallback?: boolean;
  /**
   * Optional styles to be applied to the fallback element.
   */
  fallbackStyles?: CSSProperties;

  /**
   * If true, generated background color will be unique based on the name
   */
  useUniqueBackgroundColor?: boolean;
}

/**
 * Get the initials of the user's full name.
 */
const getInitials = (fullName: string): string => {
  const allNames = fullName.trim().split(' ');
  const initials = allNames.reduce((acc: string, curr: string, index: number): string => {
    if (index === 0 || index === allNames.length - 1) {
      acc = `${acc}${curr.charAt(0).toUpperCase()}`;
    }
    return acc;
  }, '');
  return initials;
};

/**
 * Generates a random hexadecimal color code.
 * This can be used to set a random background color for an avatar.
 *
 * @returns {string} - The hexadecimal color code as a string.
 */
function getRandomBackgroundColor(): string {
  // Function to generate a random number between 0 and 255
  const getRandom = () => Math.floor(Math.random() * 256);

  // Generate each color component
  const red = getRandom();
  const green = getRandom();
  const blue = getRandom();

  // Convert the color components to a hexadecimal color string
  const hexColor = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
  return hexColor;
}

/**
 * Generates a unique hexadecimal color code based on the given string.
 * This can be used to set a background color for an avatar based on a string input.
 * @param {string} str - string input
 * @returns {string} - The hexadecimal color code as a string.
 */
function stringToColor(str: string) {
  let hash = 0;
  str.split('').forEach((char) => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  });
  let colour = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += value.toString(16).padStart(2, '0');
  }
  return colour;
}

export const UserAvatarComponent = (
  {
    imgSrc,
    fullName,
    onClick,
    wrapperClassname,
    style,
    useInitialAsFallback,
    fallbackStyles,
    useUniqueBackgroundColor = false,
  }: UserAvatarProps,
  ref: ForwardedRef<HTMLSpanElement>
) => {
  const backgroundColor = useMemo(
    () => (useUniqueBackgroundColor ? stringToColor(fullName) : getRandomBackgroundColor()),
    [useUniqueBackgroundColor, fullName]
  );

  const renderAvatar = () => {
    if (useInitialAsFallback) {
      return (
        <>
          <Avatar.Image src={imgSrc} alt="User's Profile" className="w-full h-full object-cover" />
          <Avatar.Fallback
            delayMs={600}
            className="w-full h-full flex items-center justify-center leading-none"
            style={{
              backgroundColor: backgroundColor,
              ...fallbackStyles,
            }}
          >
            {getInitials(fullName)}
          </Avatar.Fallback>
        </>
      );
    } else {
      return imgSrc ? (
        <Avatar.Image
          src={imgSrc}
          alt="User's Profile"
          className="w-full h-full object-cover"
          onError={(event) => {
            event.currentTarget.src = '';
            event.currentTarget.onerror = null;
          }}
        />
      ) : (
        getInitials(fullName)
      );
    }
  };

  return (
    <Avatar.Root
      className={cn(
        'inline-flex items-center justify-center align-middle overflow-hidden select-none w-8.5 h-8.5 rounded-full cursor-pointer',
        wrapperClassname
      )}
      style={{
        backgroundColor: !imgSrc ? backgroundColor : undefined,
        ...style,
      }}
      onClick={onClick}
      ref={ref}
    >
      {renderAvatar()}
    </Avatar.Root>
  );
};

export const UserAvatar = forwardRef(UserAvatarComponent);
