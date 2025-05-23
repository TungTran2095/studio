// src/app/page.tsx
"use client";

import { useState } from 'react';
import { ChatWindow } from "@/components/chat/chat-window";
import { SidebarNavigation } from "@/components/workspace/sidebar-navigation";
import { WorkspaceContent } from "@/components/workspace/workspace-content";
import { ModuleId } from '@/types/workspace';
import { cn } from '@/lib/utils';

export default function Home() {
  // Workspace state
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Chat state
  const [isChatExpanded, setIsChatExpanded] = useState(true);

  const handleModuleChange = (moduleId: ModuleId) => {
    setActiveModule(moduleId);
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleChatToggle = () => {
    setIsChatExpanded(!isChatExpanded);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left: Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <SidebarNavigation
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleSidebarToggle}
        />

        {/* Main Workspace Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <WorkspaceContent activeModule={activeModule} />
        </div>
      </div>

      {/* Right: Yinsen Chat Panel */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300 ease-in-out h-full border-l border-border bg-card",
          isChatExpanded ? "w-96 min-w-[384px]" : "w-16"
        )}
      >
        <ChatWindow isExpanded={isChatExpanded} onToggle={handleChatToggle} />
      </div>
    </div>
  );
}
