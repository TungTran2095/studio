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
  | 'data-collection'
  | 'quantitative-research'
  | 'real-time-monitor'
  | 'data-sources'
  | 'data-quality'
  | 'algorithm-optimization'
  | 'risk-management'
  | 'market-news'
  | 'reports'
  | 'research-library'; 