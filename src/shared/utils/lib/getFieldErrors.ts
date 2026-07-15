export const getErrorForm = (registered: string, errors: any) => {
  const arrayRegistered = registered.split('.');
  const errMessage = [...arrayRegistered, 'message'].reduce((prev, curr) => {
    return prev ? prev[curr] : prev;
  }, errors as any);

  if (errMessage && typeof errMessage === 'string') {
    return errMessage;
  } else {
    return null;
  }
};
