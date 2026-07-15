import { type FieldValues, useFormState } from 'react-hook-form';

type useFieldStateProps<T extends FieldValues> = Parameters<
  typeof useFormState<T>
>[0];

/**
 * This hook created because control?.getFieldState(registered).error?.message not working as intended.
 * control.getFieldState(registered).error?.message is not updated when the error message is updated.
 */
export const useFieldState = <T extends FieldValues>(
  props: useFieldStateProps<T>
) => {
  if (!props?.control) return null;

  return useFormState(props);
};
