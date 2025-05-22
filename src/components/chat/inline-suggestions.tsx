"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InlineSuggestionsProps {
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
}

export const InlineSuggestions: FC<InlineSuggestionsProps> = ({
  suggestions,
  onSelectSuggestion
}) => {
  if (!suggestions.length) return null;

  return (
    <div className="absolute bottom-full left-0 w-full mb-1 z-10 bg-card border rounded-md shadow-md animate-in fade-in duration-200">
      <ScrollArea className="max-h-[200px]">
        <div className="p-1">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start text-sm h-auto py-2 px-3 font-normal text-left"
              onClick={() => onSelectSuggestion(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}; 