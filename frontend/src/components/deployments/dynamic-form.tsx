'use client';

import React from 'react';
import { HelpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DynamicFormProps {
  schema: {
    type?: string;
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  errors?: Record<string, string>;
}

export function DynamicForm({
  schema,
  values,
  onChange,
  errors = {},
}: DynamicFormProps) {
  const properties = schema?.properties || {};
  const requiredFields = new Set(schema?.required || []);

  if (Object.keys(properties).length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-500 text-xs">
        This template requires no custom parameters. Defaults will be provisioned directly.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {Object.entries(properties).map(([key, prop]: [string, any]) => {
        const isRequired = requiredFields.has(key);
        const value = values[key] !== undefined ? values[key] : (prop.default ?? '');
        const error = errors[key];
        const isEnum = Array.isArray(prop.enum);
        const isBoolean = prop.type === 'boolean';
        const isNumber = prop.type === 'number' || prop.type === 'integer';

        return (
          <div
            key={key}
            className={`space-y-1.5 p-4 rounded-xl border transition-all ${
              error
                ? 'border-rose-500/50 bg-rose-950/10'
                : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700/80'
            } ${prop.type === 'object' || prop.type === 'array' ? 'md:col-span-2' : ''}`}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <span className="font-mono text-indigo-300">{key}</span>
                {isRequired && <span className="text-rose-400 font-bold">*</span>}
              </label>

              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {prop.type || 'string'}
              </span>
            </div>

            {prop.description && (
              <p className="text-[11px] text-slate-400 leading-snug">{prop.description}</p>
            )}

            {/* Input Controls */}
            <div className="pt-1">
              {isEnum ? (
                <select
                  value={value}
                  onChange={(e) => onChange(key, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="" disabled>
                    Select an option...
                  </option>
                  {prop.enum.map((opt: any) => (
                    <option key={String(opt)} value={opt}>
                      {String(opt)}
                    </option>
                  ))}
                </select>
              ) : isBoolean ? (
                <label className="relative inline-flex items-center cursor-pointer space-x-3">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => onChange(key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="text-xs font-medium text-slate-300">
                    {value ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              ) : isNumber ? (
                <input
                  type="number"
                  min={prop.minimum}
                  max={prop.maximum}
                  step={prop.type === 'integer' ? '1' : 'any'}
                  placeholder={prop.default !== undefined ? String(prop.default) : ''}
                  value={value}
                  onChange={(e) =>
                    onChange(
                      key,
                      e.target.value === ''
                        ? ''
                        : prop.type === 'integer'
                        ? parseInt(e.target.value, 10)
                        : parseFloat(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
              ) : (
                <input
                  type={
                    key.toLowerCase().includes('password') ||
                    key.toLowerCase().includes('secret')
                      ? 'password'
                      : 'text'
                  }
                  placeholder={prop.default !== undefined ? String(prop.default) : `Enter ${key}...`}
                  value={value}
                  onChange={(e) => onChange(key, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
              )}
            </div>

            {/* Field level validation or default notification */}
            {error ? (
              <div className="flex items-center space-x-1.5 text-rose-400 text-[11px] pt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{error}</span>
              </div>
            ) : prop.default !== undefined ? (
              <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                Default: {JSON.stringify(prop.default)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
