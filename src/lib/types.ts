export type WorkLogEntry = {
  id: string;
  userId: string;
  title: string;
  description: string;
  fileName?: string;
  fileUrl?: string;
  category: string;
  timestamp: Date;
  startTime: string;
  endTime: string;
};
