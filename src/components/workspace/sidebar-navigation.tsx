"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  LayoutDashboard, 
  Database, 
  Brain, 
  Settings, 
  Shield, 
  Newspaper, 
  FileText, 
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { WORKSPACE_MODULES } from '@/constants/workspace-modules';
import { ModuleId } from '@/types/workspace';

const iconMap = {
  LayoutDashboard,
  Database,
  Brain,
  Settings,
  Shield,
  Newspaper,
  FileText,
  BookOpen
};

interface SidebarNavigationProps {
  activeModule: ModuleId;
  onModuleChange: (moduleId: ModuleId) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarNavigation({ 
  activeModule, 
  onModuleChange, 
  isCollapsed = false,
  onToggleCollapse 
}: SidebarNavigationProps) {
  return (
    <div className={cn(
      "h-full bg-card border-r border-border flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h2 className="text-lg font-semibold text-foreground">Workspace</h2>
            <p className="text-sm text-muted-foreground">Quant Trading Studio</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="ml-auto"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Items */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-2">
          {WORKSPACE_MODULES.map((module) => {
            const IconComponent = iconMap[module.icon as keyof typeof iconMap];
            const isActive = activeModule === module.id;

            const button = (
              <Button
                key={module.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-left h-auto p-3",
                  isCollapsed && "justify-center p-3",
                  isActive && "bg-primary/10 text-primary border-primary/20"
                )}
                onClick={() => onModuleChange(module.id as ModuleId)}
              >
                <IconComponent className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")} />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{module.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {module.description}
                    </div>
                  </div>
                )}
                {!isCollapsed && isActive && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Active
                  </Badge>
                )}
              </Button>
            );

            if (isCollapsed) {
              return (
                <TooltipProvider key={module.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {button}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div>
                        <div className="font-medium">{module.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {module.description}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return button;
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!isCollapsed ? (
          <div className="text-xs text-muted-foreground">
            YINSEN Trading Platform v1.0
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
} 