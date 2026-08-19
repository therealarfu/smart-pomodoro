import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS, MONTHS, pad, todayISO, formatDuration } from "../lib/format.js";

export default function CalendarCard({
  viewMonth,
  setViewMonth,
  monthSummary,
  monthLoading,
  selectedDate,
  setSelectedDate,
}) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function changeMonth(delta) {
    setViewMonth(new Date(year, month + delta, 1));
  }

  const todayStr = todayISO();

  return (
    <div className="pf-card pf-calendar-card">
      <div className="pf-cal-header">
        <button className="pf-icon-btn" onClick={() => changeMonth(-1)} type="button">
          <ChevronLeft size={18} />
        </button>
        <span className="pf-cal-title">
          {MONTHS[month]} de {year}
        </span>
        <button className="pf-icon-btn" onClick={() => changeMonth(1)} type="button">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="pf-cal-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className={`pf-cal-grid ${monthLoading ? "is-loading" : ""}`}>
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="pf-cal-cell is-empty" />;
          const dateISO = `${year}-${pad(month + 1)}-${pad(d)}`;
          const summary = monthSummary[dateISO];
          const isToday = dateISO === todayStr;
          const isSelected = dateISO === selectedDate;
          return (
            <button
              key={dateISO}
              type="button"
              className={`pf-cal-cell ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
              onClick={() => setSelectedDate(dateISO)}
            >
              <span className="pf-cal-day-num">{d}</span>
              {summary && summary.workSeconds > 0 && (
                <span className="pf-cal-dot" title={formatDuration(summary.workSeconds)} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
