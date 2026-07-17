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
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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

  return (
    <div className="field" ref={containerRef} style={{ position: "relative" }}>
      <span>{label}</span>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        className="btn"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "40px",
          background: "var(--surface-2, #27272a)",
          border: "1px solid var(--border, #3f3f46)",
          color: value ? "var(--text)" : "var(--muted)",
          padding: "0 12px",
          borderRadius: "8px",
          cursor: disabled ? "not-allowed" : "pointer"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icons.CalendarDays size={15} style={{ color: "var(--muted)" }} />
          {value && selectedDate && !isNaN(selectedDate.getTime())
            ? selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
            : "Select date"}
        </div>
        {value && !disabled && (
          <span
            role="button"
            aria-label="Clear date"
            onClick={e => { e.stopPropagation(); onChange(""); }}
            style={{ opacity: 0.75, cursor: "pointer", fontSize: "14px" }}
          >✕</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 9999,
          background: "var(--surface, #18181b)", border: "1px solid var(--border, #333)",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          padding: "12px", width: 240,
          animation: "fadeIn .15s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted,#888)", padding: "2px 6px", borderRadius: 6, fontSize: 16 }}>‹</button>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text,#e5e7eb)" }}>{monthNames[month]} {year}</span>
            <button type="button" onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted,#888)", padding: "2px 6px", borderRadius: 6, fontSize: 16 }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {dayNames.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "var(--text-muted,#888)", padding: "2px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {Array.from({ length: firstWeekday(year, month) }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map(day => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = selectedDate && day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  style={{
                    border: "none", background: isSelected ? "var(--accent,#7c3aed)" : isToday ? "var(--accent-muted,rgba(124,58,237,0.18))" : "transparent",
                    color: isSelected ? "#fff" : isToday ? "var(--accent,#7c3aed)" : "var(--text,#e5e7eb)",
                    borderRadius: 6, padding: "4px 0", cursor: "pointer", fontSize: 12, fontWeight: isSelected || isToday ? 700 : 400,
                    transition: "background .12s",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-muted,rgba(124,58,237,0.18))"; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = isToday ? "var(--accent-muted,rgba(124,58,237,0.18))" : "transparent"; }}
                >{day}</button>
              );
            })}
          </div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => { const t = new Date(); setYear(t.getFullYear()); setMonth(t.getMonth()); handleSelectDay(t.getDate()); }}
              style={{ fontSize: 11, background: "none", border: "none", color: "var(--accent,#7c3aed)", cursor: "pointer", fontWeight: 600 }}
            >Today</button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                style={{ fontSize: 11, background: "none", border: "none", color: "var(--text-muted,#888)", cursor: "pointer" }}
              >Clear</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
