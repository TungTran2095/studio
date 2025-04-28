// src/components/ui/scroll-area.tsx
"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

// Extend props to include viewportRef and orientation
interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  viewportRef?: React.Ref<HTMLDivElement>;
  orientation?: "vertical" | "horizontal" | "both"; // Add orientation prop
}


const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps // Use the extended props interface
>(({ className, children, viewportRef, orientation = "vertical", ...props }, ref) => ( // Default to vertical
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    {/* Pass the viewportRef to the Viewport component */}
    <ScrollAreaPrimitive.Viewport
      ref={viewportRef}
      className="h-full w-full rounded-[inherit]"
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    {/* Conditionally render scrollbars based on orientation */}
    {(orientation === "vertical" || orientation === "both") && <ScrollBar orientation="vertical" />}
    {(orientation === "horizontal" || orientation === "both") && <ScrollBar orientation="horizontal" />}
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors z-50", // Added z-index
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]", // Changed to flex-col
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className={cn(
        "relative rounded-full bg-border", // Ensure thumb is visible
         orientation === 'vertical' && 'flex-1', // Ensure vertical thumb fills height
         orientation === 'horizontal' && 'flex-1' // Ensure horizontal thumb fills width (might need width adjustment if parent flex-col)
      )} />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
