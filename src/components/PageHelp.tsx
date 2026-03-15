'use client';

import { useState } from 'react';

interface HelpTip {
  icon: string;
  title: string;
  body: string;
}

interface PageHelpProps {
  tips: HelpTip[];
  docSection?: string; // anchor link to help page section
}

export default function PageHelp({ tips, docSection }: PageHelpProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-church-400 hover:text-church-600 transition-colors group"
      >
        <span className="w-5 h-5 rounded-full bg-church-100 group-hover:bg-church-200 flex items-center justify-center text-[11px] font-bold transition-colors">?</span>
        <span>{open ? 'Hide tips' : 'How does this page work?'}</span>
        <span className="text-church-300">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
          {tips.map((tip, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">{tip.icon}</span>
              <div>
                <p className="text-sm font-semibold text-blue-800">{tip.title}</p>
                <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">{tip.body}</p>
              </div>
            </div>
          ))}
          {docSection && (
            <div className="pt-2 border-t border-blue-200">
              <a href={`/dashboard/help#${docSection}`}
                className="text-xs text-brand-600 hover:underline font-medium">
                📖 Read full documentation for this section →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
