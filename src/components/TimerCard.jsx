import React from "react";
import { Play, Pause, Square, Plus, Minus, BookOpen, Coffee } from "lucide-react";
import { formatClock } from "../lib/format.js";

export default function TimerCard({
  timerState,
  remaining,
  progress,
  activityInput,
  setActivityInput,
  workMinutes,
  breakMinutes,
  setWorkMinutes,
  setBreakMinutes,
  onModeChange,
  onStart,
  onPause,
  onResume,
  onCancel,
  onFinishNow,
  onNameBlur,
}) {
  const isWork = timerState.mode === "work";
  const isIdle = timerState.status === "idle";
  const isRunning = timerState.status === "running";
  const isPaused = timerState.status === "paused";

  const size = 260;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress);
  const accent = isWork ? "var(--amber)" : "var(--slate)";

  return (
    <div className="pf-card pf-timer-card">
      <div className="pf-mode-toggle">
        <button
          type="button"
          className={`pf-mode-btn ${isWork ? "is-active is-work" : ""}`}
          onClick={() => onModeChange("work")}
          disabled={!isIdle}
        >
          <BookOpen size={14} /> Foco
        </button>
        <button
          type="button"
          className={`pf-mode-btn ${!isWork ? "is-active is-break" : ""}`}
          onClick={() => onModeChange("break")}
          disabled={!isIdle}
        >
          <Coffee size={14} /> Descanso
        </button>
      </div>

      <div className="pf-dial-wrap">
        <svg width={size} height={size} className="pf-dial" viewBox={`0 0 ${size} ${size}`}>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
            const cx = size / 2;
            const cy = size / 2;
            const rOuter = size / 2 - 2;
            const rInner = size / 2 - 10;
            const x1 = cx + rInner * Math.cos(angle);
            const y1 = cy + rInner * Math.sin(angle);
            const x2 = cx + rOuter * Math.cos(angle);
            const y2 = cy + rOuter * Math.sin(angle);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
            );
          })}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className={isRunning ? "pf-dial-progress is-running" : "pf-dial-progress"}
          />
        </svg>
        <div className="pf-dial-center">
          <span className="pf-dial-time">{formatClock(remaining)}</span>
          <span className="pf-dial-status">
            {isIdle && (isWork ? "pronto para focar" : "pronto para descansar")}
            {isRunning && (isWork ? "em foco" : "descansando")}
            {isPaused && "pausado"}
          </span>
        </div>
      </div>

      <input
        className="pf-name-input"
        placeholder={isWork ? "Nome da atividade (ex: estudo de matemática)" : "Nome (opcional)"}
        value={activityInput}
        onChange={(e) => setActivityInput(e.target.value)}
        onBlur={onNameBlur}
        maxLength={60}
      />

      {isIdle && (
        <div className="pf-duration-row">
          <span className="pf-duration-label">Duração</span>
          <div className="pf-stepper">
            <button
              type="button"
              className="pf-stepper-btn"
              onClick={() =>
                isWork ? setWorkMinutes((m) => Math.max(1, m - 5)) : setBreakMinutes((m) => Math.max(1, m - 1))
              }
            >
              <Minus size={14} />
            </button>
            <span className="pf-stepper-value">{isWork ? workMinutes : breakMinutes} min</span>
            <button
              type="button"
              className="pf-stepper-btn"
              onClick={() =>
                isWork ? setWorkMinutes((m) => Math.min(120, m + 5)) : setBreakMinutes((m) => Math.min(60, m + 1))
              }
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="pf-controls">
        {isIdle && (
          <button className="pf-btn pf-btn-primary pf-btn-wide" onClick={onStart} type="button">
            <Play size={16} /> Iniciar
          </button>
        )}
        {isRunning && (
          <>
            <button className="pf-btn pf-btn-ghost" onClick={onPause} type="button">
              <Pause size={16} /> Pausar
            </button>
            <button className="pf-btn pf-btn-primary" onClick={onFinishNow} type="button">
              <Square size={15} /> Concluir
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button className="pf-btn pf-btn-primary" onClick={onResume} type="button">
              <Play size={16} /> Retomar
            </button>
            <button className="pf-btn pf-btn-primary" onClick={onFinishNow} type="button">
              <Square size={15} /> Concluir
            </button>
          </>
        )}
        {!isIdle && (
          <button className="pf-btn pf-btn-danger" onClick={onCancel} type="button">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
