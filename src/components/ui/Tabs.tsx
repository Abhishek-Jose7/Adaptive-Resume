"use client";

import React from "react";

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
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`tabbar ${className}`} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          type="button"
          aria-selected={value === item.id}
          data-active={value === item.id}
          onClick={() => onChange(item.id)}
          className="tab"
        >
          {item.label}
          {item.count !== undefined && (
            <span className="font-mono text-[10.5px] text-graphite">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
