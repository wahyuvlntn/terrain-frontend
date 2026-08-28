export const PERSONNEL_ORDERS_PAGE_LIMITT = 13;
export const FREQUENT_ISSUES_PAGE_LIMIT = 13;
export const MTBF_MTTR_PAGE_LIMIT = 13;
export const DEFAULT_DEBOUNCE_SEARCH_INTERVAL = 500;
export const TOP_FREQUENT_ISSUES_LIMIT = 3;
export const TOP_PERSONNEL_ORDERS_LIMIT = 3;

export const getKeyByValue = (
  object: Record<string, string>,
  value: string
): string | undefined => {
  for (const [key, val] of Object.entries(object)) {
    if (val === value) {
      return key;
    }
  }
  return undefined;
};
