import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronsUpDown } from 'lucide-react';

export interface SelectItem {
    value: string;
    label: string;
    secondaryLabel?: string;
}

interface SearchableSelectProps {
    items: SelectItem[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    title?: string;
}

/**
 * Simplified port of the Next.js app's Radix-based `SearchableSelect` (Popover +
 * Command) — this subsystem has no Radix dependency, so it's a plain button that
 * toggles a filtered dropdown list, closing on outside click / Escape / selection.
 * Same props/behavior the Daily Game Plan form modal relies on: type-to-filter,
 * click-to-select, clearable via the header "X".
 */
export function SearchableSelect({
    items,
    value,
    onValueChange,
    placeholder = 'Select item...',
    searchPlaceholder = 'Search...',
    emptyText = 'No items found.',
    disabled = false,
    title,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) setQuery('');
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const selected = items.find((i) => i.value === value);

    const filteredItems = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return items;
        return items.filter((item) => item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q));
    }, [items, query]);

    return (
        <div className="dgp-searchable-select" ref={rootRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
                className="dgp-searchable-select__trigger"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={selected ? 'dgp-searchable-select__value' : 'dgp-searchable-select__placeholder'}>
                    {selected ? selected.label : placeholder}
                </span>
                <span className="dgp-searchable-select__icons">
                    {selected && (
                        <span
                            role="button"
                            tabIndex={-1}
                            onClick={(e) => { e.stopPropagation(); onValueChange(''); }}
                            className="dgp-searchable-select__clear"
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </span>
            </button>

            {open && (
                <div className="dgp-searchable-select__panel">
                    {title && <div className="dgp-searchable-select__title">{title}</div>}
                    <div className="dgp-searchable-select__search">
                        <Search className="h-4 w-4 opacity-40" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                        />
                    </div>
                    <div className="dgp-searchable-select__list" role="listbox">
                        {filteredItems.length === 0 && (
                            <div className="dgp-searchable-select__empty">{emptyText}</div>
                        )}
                        {filteredItems.map((item) => (
                            <button
                                type="button"
                                key={item.value}
                                role="option"
                                aria-selected={item.value === value}
                                className={`dgp-searchable-select__item${item.value === value ? ' is-selected' : ''}`}
                                onClick={() => { onValueChange(item.value); setOpen(false); }}
                            >
                                <span>{item.label}</span>
                                {item.secondaryLabel && <span className="dgp-searchable-select__secondary">{item.secondaryLabel}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchableSelect;
