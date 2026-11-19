"use client";

import React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

export type TabItem = {
  id: string;
  label: string;
  count?: number | string;
};

export function Tabs({
  items,
  value,
  onChange,
  className = "",
  children,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onChange} className="product-tabs">
      <TabsPrimitive.List className={`tabbar ${className}`} aria-label="Choose a view">
        {items.map((item) => (
          <TabsPrimitive.Trigger key={item.id} value={item.id} className="tab">
            {item.label}
            {item.count !== undefined && (
              <span className="font-mono text-[10.5px] text-graphite">{item.count}</span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      <TabsPrimitive.Content value={value} className="product-tabs-panel">
        {children}
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  );
}

export default Tabs;
