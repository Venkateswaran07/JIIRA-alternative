import React, { useEffect, useState, useRef } from "react";
import * as Icons from "lucide-react";

export function MiniDatePicker({
  name,
  label,
  value,
  onChange,
  required,
  disabled
}: {
  name: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (value) {
      const parsed = new Date(value + "T00:00:00");
      if (!isNaN(parsed.getTime())) {
        setYear(parsed.getFullYear());
        setMonth(parsed.getMonth());
      }
    }
  }, [value, open]);

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstWeekday = (y: number, m: number) => new Date(y, m, 1).getDay();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const selectedDate = value ? new Date(value + "T00:00:00") : null;

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const handleSelectDay = (day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${year}-${mm}-${dd}`);
    setOpen(false);
  };

  const displayLabel = value && selectedDate && !isNaN(selectedDate.getTime())
    ? selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "Select date";

  return (
    <div className="mini-date-picker-wrap" ref={containerRef} style={{ position: "relative" }}>
      {label && <span className="mini-date-picker-label">{label}</span>}
      <input type="hidden" name={name} value={value} required={required} />

      {/* Trigger button */}
      <button
        type="button"
        className="mini-date-picker-trigger"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="mini-date-picker-trigger-inner">
          <Icons.CalendarDays size={15} className="mini-date-picker-icon" />
          <span className={value ? "mini-date-picker-value" : "mini-date-picker-placeholder"}>
            {displayLabel}
          </span>
        </span>
        {value && !disabled && (
          <span
            role="button"
            aria-label="Clear date"
            className="mini-date-picker-clear"
            onClick={e => { e.stopPropagation(); onChange(""); }}
          >
            <Icons.X size={13} />
          </span>
        )}
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="mini-date-picker-calendar" role="dialog" aria-modal="true" aria-label="Date picker">
          {/* Header */}
          <div className="mini-date-picker-header">
            <button
              type="button"
              className="mini-date-picker-nav"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <Icons.ChevronLeft size={16} />
            </button>
            <span className="mini-date-picker-month-year">
              {monthNames[month].slice(0, 3)} {year}
            </span>
            <button
              type="button"
              className="mini-date-picker-nav"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <Icons.ChevronRight size={16} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="mini-date-picker-weekdays">
            {dayNames.map(d => (
              <div key={d} className="mini-date-picker-weekday">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="mini-date-picker-grid">
            {Array.from({ length: firstWeekday(year, month) }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map(day => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = !!(selectedDate && day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear());
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={[
                    "mini-date-picker-day",
                    isSelected ? "selected" : "",
                    isToday && !isSelected ? "today" : "",
                  ].filter(Boolean).join(" ")}
                  aria-label={`${monthNames[month]} ${day}, ${year}`}
                  aria-pressed={isSelected}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mini-date-picker-footer">
            <button
              type="button"
              className="mini-date-picker-today-btn"
              onClick={() => {
                const t = new Date();
                setYear(t.getFullYear());
                setMonth(t.getMonth());
                handleSelectDay(t.getDate());
              }}
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                className="mini-date-picker-clear-btn"
                onClick={() => { onChange(""); setOpen(false); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
