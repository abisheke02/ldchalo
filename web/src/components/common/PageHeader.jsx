import React from 'react';

/**
 * PageHeader — consistent page title area with optional action buttons.
 *
 * @param {string}    title    - Main heading text
 * @param {string}    subtitle - Secondary description text
 * @param {ReactNode} actions  - Right-aligned action buttons / elements
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
