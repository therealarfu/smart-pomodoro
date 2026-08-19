import React from "react";
import { Loader2, Trash2, BookOpen, Coffee } from "lucide-react";
import { MONTHS, todayISO, formatDuration } from "../lib/format.js";

export default function DayDetailCard({
  selectedDate,
  loading,
  activities,
  workTotal,
  breakTotal,
  onDelete,
  notesDraft,
  notesSaved,
  onNotesChange,
}) {
  const [, m, d] = selectedDate.split("-").map(Number);
  const label = `${d} de ${MONTHS[m - 1]}`;
  const isToday = selectedDate === todayISO();

  return (
    <div className="pf-card pf-day-card">
      <div className="pf-day-header">
        <h2>{isToday ? `Hoje, ${label}` : label}</h2>
        {loading && <Loader2 size={15} className="pf-spin" />}
      </div>

      <div className="pf-day-total">
        <span className="pf-day-total-value">{formatDuration(workTotal)}</span>
        <span className="pf-day-total-label">estudadas</span>
        {breakTotal > 0 && (
          <span className="pf-day-total-break">+ {formatDuration(breakTotal)} de descanso</span>
        )}
      </div>

      {activities.length === 0 ? (
        <p className="pf-day-empty">Nenhuma atividade registrada neste dia ainda.</p>
      ) : (
        <ul className="pf-activity-list">
          {activities
            .slice()
            .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
            .map((a) => (
              <li key={a.id} className="pf-activity-item">
                <span className={`pf-activity-badge ${a.mode === "work" ? "is-work" : "is-break"}`}>
                  {a.mode === "work" ? <BookOpen size={12} /> : <Coffee size={12} />}
                </span>
                <span className="pf-activity-name">{a.name}</span>
                <span className="pf-activity-duration">{formatDuration(a.seconds)}</span>
                <button
                  type="button"
                  className="pf-activity-delete"
                  onClick={() => onDelete(a.id)}
                  title="Remover"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
        </ul>
      )}

      <div className="pf-notes">
        <div className="pf-notes-header">
          <span>Notas do dia</span>
          <span className="pf-notes-saved">{notesSaved ? "salvo" : "salvando…"}</span>
        </div>
        <textarea
          className="pf-notes-textarea"
          placeholder="Escreva alguma coisa sobre esse dia..."
          value={notesDraft}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
        />
      </div>
    </div>
  );
}
