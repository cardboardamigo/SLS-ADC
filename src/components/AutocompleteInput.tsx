"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  getSuggestions: () => Promise<string[]>;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AutocompleteInput({
  value,
  onChange,
  getSuggestions,
  placeholder,
  className,
  style,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Fetch (or re-fetch) the suggestion list from the data source.
  // Called on mount and again on every focus so locally-written entries
  // and background cache refreshes are always picked up.
  const loadSuggestions = useCallback(() => {
    getSuggestions()
      .then((names) => setSuggestions(names))
      .catch((err) => console.warn("AutocompleteInput: failed to load suggestions", err));
  }, [getSuggestions]);

  // Load suggestions on mount
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // Filter suggestions as user types
  useEffect(() => {
    if (!value.trim()) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const query = value.toLowerCase();
    const matches = suggestions.filter((s) =>
      s.toLowerCase().includes(query)
    );
    setFiltered(matches);
    setOpen(matches.length > 0);
    setActiveIndex(-1);
  }, [value, suggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const select = useCallback(
    (val: string) => {
      onChange(val);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          loadSuggestions(); // Re-fetch to pick up newly saved entries
          if (value.trim() && filtered.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        required
        placeholder={placeholder}
        className={className}
        style={style}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `autocomplete-opt-${activeIndex}` : undefined
        }
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.12)",
            maxHeight: "200px",
            overflowY: "auto",
            zIndex: 50,
            padding: "6px 0",
            listStyle: "none",
          }}
        >
          {filtered.map((item, i) => (
            <li
              key={item}
              id={`autocomplete-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus on input
                select(item);
              }}
              style={{
                padding: "10px 24px",
                cursor: "pointer",
                textAlign: "center",
                color: "var(--text)",
                background:
                  i === activeIndex ? "var(--surface)" : "transparent",
                transition: "background 0.1s ease",
                fontSize: "0.95rem",
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
