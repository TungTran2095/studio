export interface WorkspaceModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  component?: React.ComponentType;
}

export interface WorkspaceTab {
  id: string;
  title: string;
  module: string;
  isActive?: boolean;
  isDirty?: boolean;
}

export type ModuleId = 
  | 'dashboard'
  | 'market-data'
  | 'quant-research'
  | 'algorithm-optimization'
  | 'risk-management'
  | 'market-news'
  | 'reports'
  | 'research-library'; 