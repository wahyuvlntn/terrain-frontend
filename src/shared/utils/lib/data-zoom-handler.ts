interface TGetDataZoomHandler {
  maxValue?: number;
  minValue?: number;
  bottomPadding?: number | string;
  show?: boolean;
  colors: {
    primary: string;
    secondary: string;
  };
}

export const getDataZoomHandler = ({
  maxValue,
  minValue,
  bottomPadding,
  show = true,
  colors,
}: TGetDataZoomHandler) => {
  return [
    {
      type: 'inside',
      maxValueSpan: maxValue,
      minValueSpan: minValue,
      moveOnMouseWheel: true,
      zoomOnMouseWheel: false,
    },
    {
      height: 0,
      show: show,
      bottom: bottomPadding,
      maxValueSpan: maxValue,
      minValueSpan: minValue,
      handleSize: '100%',
      showDetail: false,
      backgroundColor: colors.primary,
      handleStyle: {
        color: colors.primary,
      },
      moveHandleStyle: {
        color: colors.secondary,
      },
      fillerColor: 'transparent',
      emphasis: {
        handleStyle: {
          color: colors.primary,
        },
        moveHandleStyle: {
          color: colors.secondary,
        },
      },
    },
  ];
};
