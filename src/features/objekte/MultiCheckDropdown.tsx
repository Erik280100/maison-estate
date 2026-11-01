"use client";

import { useEffect, useId, useRef, useState } from "react";

type Option = { value: string; label: string };

/** Dropdown, dessen Inhalt aus Checkboxen besteht (Mehrfachauswahl). */
export function MultiCheckDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const summary = selected.length
    ? options
        .filter((o) => selected.includes(o.value))
        .map((o) => o.label.replace(" Zimmer", ""))
        .join(", ")
    : "Alle";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-sm border border-ivory-100 bg-white px-3 py-2 text-left text-sm outline-none focus:border-gold-500"
      >
        <span className="truncate">
          <span className="text-stone-500">{label}: </span>
          {summary}
        </span>
        <span aria-hidden className="text-gold-600">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute z-20 mt-1 w-full min-w-48 space-y-1 rounded-sm border border-ivory-100 bg-white p-3 shadow-lg"
        >
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-gold-600"
                checked={selected.includes(o.value)}
                onChange={() =>
                  onChange(
                    selected.includes(o.value)
                      ? selected.filter((v) => v !== o.value)
                      : [...selected, o.value],
                  )
                }
              />
              {o.label}
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="pt-1 text-xs text-gold-600 hover:underline"
            >
              Auswahl löschen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
