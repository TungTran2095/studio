export type WorkLogEntry = {
  id: string;
  title: string;
  description: string;
  fileName?: string;
  category: string;
  timestamp: Date;
};
