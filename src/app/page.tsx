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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  // Chat state
  const [isChatExpanded, setIsChatExpanded] = useState(false);

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
    <div className="flex h-screen bg-gradient-to-br from-background via-background/95 to-background/90 overflow-hidden backdrop-blur-xl">
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background/50 backdrop-blur-sm">
          <WorkspaceContent activeModule={activeModule} />
        </div>
      </div>

      {/* Right: Yinsen Chat Panel */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300 ease-in-out h-full border-l border-border/20 bg-card/50 backdrop-blur-md",
          isChatExpanded ? "w-96 min-w-[384px]" : "w-16"
        )}
      >
        <ChatWindow isExpanded={isChatExpanded} onToggle={handleChatToggle} />
      </div>
    </div>
  );
}
