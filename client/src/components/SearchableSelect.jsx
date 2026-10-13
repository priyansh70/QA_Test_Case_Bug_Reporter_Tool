import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Search...',
  disabled = false,
  icon,
  label,
}) {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.trim().toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (selectedValue) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearch('');
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
    setIsOpen(true);
  };

  const displayLabel = () => {
    if (search) return search;
    if (selectedOption) return selectedOption.label;
    return placeholder;
  };

  const baseInputClasses = `w-full text-xs transition-all flex items-center gap-2 cursor-pointer ${
    isDark
      ? 'bg-black border-zinc-800 text-zinc-100'
      : 'bg-[var(--bg-tertiary)] border-[var(--border-default)] text-[var(--text-primary)]'
  }`;

  const focusClasses = isOpen
    ? 'border-emerald-500 ring-1 ring-emerald-500'
    : '';

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          className={`block text-xs font-semibold mb-1.5 flex items-center gap-1 ${
            isDark ? 'text-zinc-400' : 'text-[var(--text-secondary)]'
          }`}
        >
          {icon}
          {label}
        </label>
      )}

      {/* Main Input Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${baseInputClasses} ${focusClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2.5 border rounded-xl`}
      >
        {isOpen ? (
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className={`flex-1 bg-transparent outline-none text-xs ${
              isDark
                ? 'text-zinc-100 placeholder-zinc-600'
                : 'text-[var(--text-primary)] placeholder-[var(--text-disabled)]'
            }`}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`flex-1 truncate ${
              selectedOption
                ? isDark
                  ? 'text-zinc-100'
                  : 'text-[var(--text-primary)]'
                : isDark
                  ? 'text-zinc-600'
                  : 'text-[var(--text-disabled)]'
            }`}
          >
            {displayLabel()}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {!isOpen && value && !disabled && (
            <button
              onClick={clearSelection}
              className={`p-0.5 rounded hover:bg-zinc-700 ${
                isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''} ${
              isDark ? 'text-zinc-500' : 'text-[var(--text-muted)]'
            }`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 w-full mt-1 border rounded-xl shadow-xl max-h-52 overflow-y-auto ${
            isDark
              ? 'bg-zinc-900 border-zinc-700'
              : 'bg-[var(--surface)] border-[var(--border-default)]'
          }`}
        >
          <div className="py-1">
            {filtered.length === 0 ? (
              <div
                className={`px-3 py-3 text-xs text-center ${
                  isDark ? 'text-zinc-600' : 'text-[var(--text-disabled)]'
                }`}
              >
                No matching results
              </div>
            ) : (
              filtered.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`px-3 py-2 text-xs cursor-pointer truncate transition-colors ${
                    option.value === value
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-[var(--brand-soft)] text-[var(--brand-text)]'
                      : isDark
                        ? 'text-zinc-300 hover:bg-zinc-800'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
