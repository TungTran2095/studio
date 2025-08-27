// Note: legacy Genkit tool implementation is disabled to avoid build errors.
// This file intentionally avoids importing '@/lib/workspace-content' to prevent missing export errors.

// Temporary placeholder to prevent build errors
export const workspaceActionTool = {
  // Placeholder implementation
  execute: async (action: string, context?: string) => {
    console.warn('Workspace action tool is temporarily disabled');
    return {
      success: false,
      message: 'Workspace action tool temporarily unavailable',
      content: 'This feature is temporarily disabled due to genkit integration issues.'
    };
  }
};