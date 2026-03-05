import React from "react";

export default function LoadingDots({ text = "Thinking" }) {
  return (
    <div className="flex items-center gap-2 text-dark-200">
      <span className="text-sm">{text}</span>
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-brand-indigo typing-dot" />
        <div className="w-2 h-2 rounded-full bg-brand-indigo typing-dot" />
        <div className="w-2 h-2 rounded-full bg-brand-indigo typing-dot" />
      </div>
    </div>
  );
}
