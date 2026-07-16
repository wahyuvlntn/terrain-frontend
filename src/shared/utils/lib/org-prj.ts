export const ORG_ALIAS = (): string => {
  return process.env.VITE_ORG || 'local';
};

export const PROJECT_ALIAS = (): string => {
  return process.env.VITE_PRJ || 'digital_twin_afdd';
};

export const DATABASE_ALIAS = (dbType: 'business' | 'machine'): string => {
  return dbType === 'business'
    ? process.env.VITE_DB_BUSINESS || 'am'
    : process.env.VITE_DB_MACHINE || 'amm';
};

export const DEFAULT_LANGUAGE = (): string => {
  return localStorage.getItem('current_language') ?? 'en';
};
