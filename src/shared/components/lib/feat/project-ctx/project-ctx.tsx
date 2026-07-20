import { PROJECT_ALIAS } from '@digital-twin/utils';
import { createContext } from 'react';

interface ProjectCtx {
  projectVariant: string;
}

export const ProjectCtx = createContext<ProjectCtx>({
  projectVariant: PROJECT_ALIAS(),
});
