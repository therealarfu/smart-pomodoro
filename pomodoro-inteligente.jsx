import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  Square,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Loader2,
  Trash2,
  BookOpen,
  Coffee,
} from "lucide-react";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayISO() {
  return toISODate(new Date());
}

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${pad(m)}:${pad(sec)}`;
}

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function sanitizeUsername(raw) {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "");
}

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const userKey = (u) => `user:${u}`;
const timerKey = (u) => `timer_state:${u}`;
const dayKey = (u, dateISO) => `day_data:${u}:${dateISO}`;

const DEFAULT_WORK_MIN = 25;
const DEFAULT_BREAK_MIN = 5;

const IDLE_TIMER = (mode = "work") => ({
  status: "idle",
  mode,
  activityName: "",
  targetSeconds: (mode === "work" ? DEFAULT_WORK_MIN : DEFAULT_BREAK_MIN) * 60,
  accumulatedSeconds: 0,
  runStartTimestamp: null,
});

function elapsedFor(state, nowMs) {
  if (state.status === "running" && state.runStartTimestamp) {
    return state.accumulatedSeconds + (nowMs - state.runStartTimestamp) / 1000;
  }
  return state.accumulatedSeconds;
}

/* ---------------------------------------------------------
   Root component
--------------------------------------------------------- */

export default function PomodoroInteligente() {
  const [authUser, setAuthUser] = useState(null);

  return (
    <div className="pf-root">
      <Style />
      {authUser ? (
        <AppShell username={authUser} onLogout={() => setAuthUser(null)} />
      ) : (
        <AuthScreen onAuthenticated={(u) => setAuthUser(u)} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Auth screen
--------------------------------------------------------- */

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const u = sanitizeUsername(username);
    if (u.length < 3) {
      setError("O usuário precisa ter pelo menos 3 letras.");
      return;
    }
    if (pin.trim().length < 4) {
      setError("A senha precisa ter pelo menos 4 caracteres.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        let exists = true;
        try {
          await window.storage.get(userKey(u), true);
        } catch {
          exists = false;
        }
        if (exists) {
          setError("Esse usuário já existe. Tente entrar em vez de criar.");
          setBusy(false);
          return;
        }
        await window.storage.set(
          userKey(u),
          JSON.stringify({ passwordHash: simpleHash(pin), createdAt: Date.now() }),
          true
        );
        onAuthenticated(u);
      } else {
        let record = null;
        try {
          const res = await window.storage.get(userKey(u), true);
          record = res ? JSON.parse(res.value) : null;
        } catch {
          record = null;
        }
        if (!record) {
          setError("Usuário não encontrado. Que tal criar uma conta?");
          setBusy(false);
          return;
        }
        if (record.passwordHash !== simpleHash(pin)) {
          setError("Senha incorreta.");
          setBusy(false);
          return;
        }
        onAuthenticated(u);
      }
    } catch (err) {
      setError("Não foi possível conectar ao armazenamento. Tente novamente.");
    }
    setBusy(false);
  }

  return (
    <div className="pf-auth">
      <div className="pf-auth-card">
        <div className="pf-auth-mark">
          <HourglassMark size={34} />
        </div>
        <h1 className="pf-auth-title">Pomodoro Inteligente</h1>
        <p className="pf-auth-sub">
          Cronometre seu foco, registre suas horas por dia e veja seu progresso no calendário.
        </p>

        <div className="pf-tabs">
          <button
            className={`pf-tab ${mode === "login" ? "is-active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`pf-tab ${mode === "signup" ? "is-active" : ""}`}
            onClick={() => { setMode("signup"); setError(""); }}
            type="button"
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pf-form">
          <label className="pf-field">
            <span>Usuário</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: arfur"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <label className="pf-field">
            <span>Senha</span>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="mín. 4 caracteres"
            />
          </label>

          {error && <div className="pf-error">{error}</div>}

          <button className="pf-btn pf-btn-primary" type="submit" disabled={busy}>
            {busy ? <Loader2 size={16} className="pf-spin" /> : null}
            {mode === "login" ? "Entrar" : "Criar conta e entrar"}
          </button>
        </form>

        <p className="pf-auth-note">
          Login simples para uso pessoal — pensado para uma única pessoa acompanhar seus estudos, não é um sistema de segurança robusto.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Main app shell (after login)
--------------------------------------------------------- */

function AppShell({ username, onLogout }) {
  const [timerState, setTimerState] = useState(IDLE_TIMER());
  const [timerLoaded, setTimerLoaded] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const [activityInput, setActivityInput] = useState("");
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MIN);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MIN);

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [monthSummary, setMonthSummary] = useState({}); // dateISO -> {workSeconds, count}
  const [monthLoading, setMonthLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [dayDetail, setDayDetail] = useState({ activities: [], notes: "" });
  const [dayLoading, setDayLoading] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaved, setNotesSaved] = useState(true);
  const notesTimeoutRef = useRef(null);

  const justCompletedRef = useRef(false);

  /* --- load timer state on mount --- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(timerKey(username), true);
        const parsed = res ? JSON.parse(res.value) : IDLE_TIMER();
        if (!cancelled) {
          setTimerState(parsed);
          setActivityInput(parsed.activityName || "");
        }
      } catch {
        if (!cancelled) setTimerState(IDLE_TIMER());
      }
      if (!cancelled) setTimerLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  /* --- ticking clock while running --- */
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const persistTimer = useCallback(
    async (next) => {
      setTimerState(next);
      try {
        await window.storage.set(timerKey(username), JSON.stringify(next), true);
      } catch {
        /* best effort */
      }
    },
    [username]
  );

  /* --- load a month's summary --- */
  const loadMonth = useCallback(
    async (monthDate) => {
      setMonthLoading(true);
      const prefix = `day_data:${username}:${monthDate.getFullYear()}-${pad(monthDate.getMonth() + 1)}`;
      try {
        const listRes = await window.storage.list(prefix, true);
        const keys = listRes?.keys || [];
        const entries = await Promise.all(
          keys.map(async (k) => {
            try {
              const r = await window.storage.get(k, true);
              const data = r ? JSON.parse(r.value) : { activities: [] };
              return [k, data];
            } catch {
              return [k, null];
            }
          })
        );
        const summary = {};
        for (const [k, data] of entries) {
          if (!data) continue;
          const dateISO = k.split(":").slice(-1)[0];
          const workSeconds = (data.activities || [])
            .filter((a) => a.mode === "work")
            .reduce((s, a) => s + a.seconds, 0);
          summary[dateISO] = {
            workSeconds,
            count: (data.activities || []).length,
          };
        }
        setMonthSummary(summary);
      } catch {
        setMonthSummary({});
      }
      setMonthLoading(false);
    },
    [username]
  );

  useEffect(() => {
    loadMonth(viewMonth);
  }, [viewMonth, loadMonth]);

  /* --- load selected day detail --- */
  const loadDay = useCallback(
    async (dateISO) => {
      setDayLoading(true);
      try {
        const res = await window.storage.get(dayKey(username, dateISO), true);
        const data = res ? JSON.parse(res.value) : { activities: [], notes: "" };
        setDayDetail(data);
        setNotesDraft(data.notes || "");
      } catch {
        setDayDetail({ activities: [], notes: "" });
        setNotesDraft("");
      }
      setNotesSaved(true);
      setDayLoading(false);
    },
    [username]
  );

  useEffect(() => {
    loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  async function saveDay(dateISO, data) {
    try {
      await window.storage.set(dayKey(username, dateISO), JSON.stringify(data), true);
    } catch {
      /* best effort */
    }
  }

  /* --- notes autosave (debounced) --- */
  function handleNotesChange(text) {
    setNotesDraft(text);
    setNotesSaved(false);
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(async () => {
      const next = { ...dayDetail, notes: text };
      setDayDetail(next);
      await saveDay(selectedDate, next);
      setNotesSaved(true);
      if (isCurrentMonth(viewMonth, selectedDate)) loadMonth(viewMonth);
    }, 700);
  }

  /* --- timer derived values --- */
  const elapsed = elapsedFor(timerState, nowMs);
  const remaining = Math.max(0, timerState.targetSeconds - elapsed);
  const progress = timerState.targetSeconds > 0
    ? Math.min(1, elapsed / timerState.targetSeconds)
    : 0;

  /* --- auto-complete when time runs out --- */
  useEffect(() => {
    if (
      timerLoaded &&
      timerState.status === "running" &&
      elapsed >= timerState.targetSeconds &&
      !justCompletedRef.current
    ) {
      justCompletedRef.current = true;
      completeTimer(false).finally(() => {
        justCompletedRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, timerState.status, timerLoaded]);

  function startTimer() {
    const mode = timerState.mode;
    const minutes = mode === "work" ? workMinutes : breakMinutes;
    const next = {
      status: "running",
      mode,
      activityName: activityInput.trim(),
      targetSeconds: minutes * 60,
      accumulatedSeconds: 0,
      runStartTimestamp: Date.now(),
    };
    persistTimer(next);
  }

  function pauseTimer() {
    const e = elapsedFor(timerState, Date.now());
    persistTimer({ ...timerState, status: "paused", accumulatedSeconds: e, runStartTimestamp: null });
  }

  function resumeTimer() {
    persistTimer({ ...timerState, status: "running", runStartTimestamp: Date.now() });
  }

  function cancelTimer() {
    const e = elapsedFor(timerState, Date.now());
    if (e > 30) {
      const ok = window.confirm("Cancelar a sessão em andamento? O tempo não será salvo.");
      if (!ok) return;
    }
    const nextMode = timerState.mode;
    persistTimer(IDLE_TIMER(nextMode));
    setActivityInput("");
  }

  async function completeTimer(manual) {
    const e = elapsedFor(timerState, Date.now());
    const finalSeconds = Math.round(manual ? Math.min(e, timerState.targetSeconds) : timerState.targetSeconds);
    const mode = timerState.mode;

    if (finalSeconds >= 5) {
      const dateISO = todayISO();
      let existing;
      try {
        const res = await window.storage.get(dayKey(username, dateISO), true);
        existing = res ? JSON.parse(res.value) : { activities: [], notes: "" };
      } catch {
        existing = { activities: [], notes: "" };
      }
      const session = {
        id: randomId(),
        name: (timerState.activityName || activityInput || "").trim() ||
          (mode === "work" ? "Sessão de foco" : "Descanso"),
        mode,
        seconds: finalSeconds,
        completedAt: Date.now(),
      };
      const nextDay = { ...existing, activities: [...(existing.activities || []), session] };
      await saveDay(dateISO, nextDay);
      if (dateISO === selectedDate) {
        setDayDetail(nextDay);
      }
      loadMonth(viewMonth);
    }

    const nextMode = mode === "work" ? "break" : "work";
    await persistTimer(IDLE_TIMER(nextMode));
    setActivityInput("");
  }

  async function deleteActivity(activityId) {
    const nextActivities = (dayDetail.activities || []).filter((a) => a.id !== activityId);
    const next = { ...dayDetail, activities: nextActivities };
    setDayDetail(next);
    await saveDay(selectedDate, next);
    loadMonth(viewMonth);
  }

  function adjustMode(mode) {
    if (timerState.status !== "idle") return;
    persistTimer(IDLE_TIMER(mode));
  }

  const workTotal = (dayDetail.activities || [])
    .filter((a) => a.mode === "work")
    .reduce((s, a) => s + a.seconds, 0);
  const breakTotal = (dayDetail.activities || [])
    .filter((a) => a.mode === "break")
    .reduce((s, a) => s + a.seconds, 0);

  return (
    <div className="pf-shell">
      <header className="pf-header">
        <div className="pf-header-left">
          <HourglassMark size={22} />
          <span className="pf-header-title">Pomodoro Inteligente</span>
        </div>
        <div className="pf-header-right">
          <span className="pf-header-user">{username}</span>
          <button className="pf-icon-btn" onClick={onLogout} title="Sair" type="button">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <main className="pf-main">
        <section className="pf-timer-col">
          <TimerCard
            timerState={timerState}
            remaining={remaining}
            progress={progress}
            activityInput={activityInput}
            setActivityInput={setActivityInput}
            workMinutes={workMinutes}
            breakMinutes={breakMinutes}
            setWorkMinutes={setWorkMinutes}
            setBreakMinutes={setBreakMinutes}
            onModeChange={adjustMode}
            onStart={startTimer}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onCancel={cancelTimer}
            onFinishNow={() => completeTimer(true)}
            onNameBlur={() => persistTimer({ ...timerState, activityName: activityInput.trim() })}
          />
        </section>

        <section className="pf-right-col">
          <CalendarCard
            viewMonth={viewMonth}
            setViewMonth={setViewMonth}
            monthSummary={monthSummary}
            monthLoading={monthLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />

          <DayDetailCard
            selectedDate={selectedDate}
            loading={dayLoading}
            activities={dayDetail.activities || []}
            workTotal={workTotal}
            breakTotal={breakTotal}
            onDelete={deleteActivity}
            notesDraft={notesDraft}
            notesSaved={notesSaved}
            onNotesChange={handleNotesChange}
          />
        </section>
      </main>
    </div>
  );
}

function isCurrentMonth(viewMonth, dateISO) {
  const [y, m] = dateISO.split("-").map(Number);
  return y === viewMonth.getFullYear() && m === viewMonth.getMonth() + 1;
}

/* ---------------------------------------------------------
   Timer card (signature element)
--------------------------------------------------------- */

function TimerCard({
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
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="var(--border)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--track)"
            strokeWidth={stroke}
          />
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
                isWork
                  ? setWorkMinutes((m) => Math.max(1, m - 5))
                  : setBreakMinutes((m) => Math.max(1, m - 1))
              }
            >
              <Minus size={14} />
            </button>
            <span className="pf-stepper-value">{isWork ? workMinutes : breakMinutes} min</span>
            <button
              type="button"
              className="pf-stepper-btn"
              onClick={() =>
                isWork
                  ? setWorkMinutes((m) => Math.min(120, m + 5))
                  : setBreakMinutes((m) => Math.min(60, m + 1))
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

/* ---------------------------------------------------------
   Calendar card
--------------------------------------------------------- */

function CalendarCard({ viewMonth, setViewMonth, monthSummary, monthLoading, selectedDate, setSelectedDate }) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function changeMonth(delta) {
    const next = new Date(year, month + delta, 1);
    setViewMonth(next);
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

/* ---------------------------------------------------------
   Day detail card
--------------------------------------------------------- */

function DayDetailCard({ selectedDate, loading, activities, workTotal, breakTotal, onDelete, notesDraft, notesSaved, onNotesChange }) {
  const [y, m, d] = selectedDate.split("-").map(Number);
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
            .sort((a, b) => a.completedAt - b.completedAt)
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

/* ---------------------------------------------------------
   Small mark / icon
--------------------------------------------------------- */

function HourglassMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3h12M6 21h12M7 3c0 4 3.5 5.5 3.5 8s-3.5 4-3.5 8M17 3c0 4-3.5 5.5-3.5 8s3.5 4 3.5 8"
        stroke="var(--amber)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.7 6.5h6.6M8.7 17.5h6.6" stroke="var(--slate)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------------------------------
   Styles
--------------------------------------------------------- */

function Style() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

      .pf-root {
        --ink: #14181b;
        --panel: #1c2226;
        --panel-raised: #222a2f;
        --track: #2a3237;
        --border: #2c353b;
        --text: #f2eee6;
        --text-muted: #9aa1a0;
        --amber: #e7a33e;
        --amber-dim: #7a5a28;
        --slate: #75a0bd;
        --slate-dim: #33454f;
        --danger: #c96a5a;

        font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
        background: var(--ink);
        color: var(--text);
        min-height: 100%;
        width: 100%;
        box-sizing: border-box;
        border-radius: 18px;
        overflow: hidden;
      }
      .pf-root * { box-sizing: border-box; }
      .pf-root button { font-family: inherit; cursor: pointer; }
      .pf-root input, .pf-root textarea { font-family: inherit; }
      .pf-root :focus-visible {
        outline: 2px solid var(--amber);
        outline-offset: 2px;
      }

      /* ---------- Auth ---------- */
      .pf-auth {
        min-height: 560px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px 20px;
      }
      .pf-auth-card {
        width: 100%;
        max-width: 380px;
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 28px 24px 22px;
        text-align: center;
      }
      .pf-auth-mark { display: flex; justify-content: center; margin-bottom: 12px; }
      .pf-auth-title {
        font-size: 21px;
        margin: 0 0 8px;
        letter-spacing: 0.2px;
      }
      .pf-auth-sub {
        color: var(--text-muted);
        font-size: 13.5px;
        line-height: 1.5;
        margin: 0 0 20px;
      }
      .pf-tabs {
        display: flex;
        background: var(--track);
        border-radius: 10px;
        padding: 3px;
        margin-bottom: 18px;
      }
      .pf-tab {
        flex: 1;
        border: none;
        background: transparent;
        color: var(--text-muted);
        padding: 8px 0;
        border-radius: 8px;
        font-size: 13.5px;
        font-weight: 500;
      }
      .pf-tab.is-active {
        background: var(--panel-raised);
        color: var(--text);
      }
      .pf-form { display: flex; flex-direction: column; gap: 12px; text-align: left; }
      .pf-field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--text-muted); }
      .pf-field input {
        background: var(--track);
        border: 1px solid var(--border);
        border-radius: 9px;
        padding: 10px 12px;
        color: var(--text);
        font-size: 14px;
      }
      .pf-error {
        color: var(--danger);
        font-size: 12.5px;
        text-align: left;
      }
      .pf-auth-note {
        margin: 16px 0 0;
        font-size: 11px;
        color: var(--text-muted);
        line-height: 1.5;
      }

      /* ---------- Buttons ---------- */
      .pf-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid var(--border);
        background: var(--panel-raised);
        color: var(--text);
        border-radius: 10px;
        padding: 10px 16px;
        font-size: 13.5px;
        font-weight: 500;
        transition: transform 0.08s ease, background 0.15s ease;
      }
      .pf-btn:active { transform: scale(0.97); }
      .pf-btn:disabled { opacity: 0.5; cursor: default; }
      .pf-btn-primary {
        background: var(--amber);
        border-color: var(--amber);
        color: #251705;
      }
      .pf-btn-ghost { background: transparent; }
      .pf-btn-danger {
        background: transparent;
        border-color: var(--border);
        color: var(--danger);
      }
      .pf-btn-wide { width: 100%; }
      .pf-icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px; height: 32px;
        border-radius: 9px;
        border: 1px solid var(--border);
        background: var(--panel-raised);
        color: var(--text-muted);
      }
      .pf-spin { animation: pf-spin 0.9s linear infinite; }
      @keyframes pf-spin { to { transform: rotate(360deg); } }

      /* ---------- Shell / layout ---------- */
      .pf-shell { min-height: 100%; padding-bottom: 24px; }
      .pf-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid var(--border);
      }
      .pf-header-left { display: flex; align-items: center; gap: 9px; }
      .pf-header-title { font-size: 14.5px; font-weight: 600; letter-spacing: 0.2px; }
      .pf-header-right { display: flex; align-items: center; gap: 10px; }
      .pf-header-user { font-size: 13px; color: var(--text-muted); }

      .pf-main {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }
      .pf-right-col { display: flex; flex-direction: column; gap: 16px; }

      @media (min-width: 900px) {
        .pf-main {
          display: grid;
          grid-template-columns: 340px 1fr;
          align-items: start;
          padding: 24px;
          gap: 20px;
        }
        .pf-timer-col { position: sticky; top: 24px; }
      }

      @media (min-width: 1280px) {
        .pf-right-col { display: grid; grid-template-columns: 1fr 1fr; align-items: start; gap: 20px; }
      }

      .pf-card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 20px;
      }

      /* ---------- Timer card ---------- */
      .pf-timer-card { display: flex; flex-direction: column; align-items: center; gap: 16px; }
      .pf-mode-toggle {
        display: flex;
        background: var(--track);
        border-radius: 10px;
        padding: 3px;
        width: 100%;
      }
      .pf-mode-btn {
        flex: 1;
        display: flex; align-items: center; justify-content: center; gap: 6px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        padding: 8px 0;
        border-radius: 8px;
        font-size: 12.5px;
        font-weight: 500;
      }
      .pf-mode-btn:disabled { cursor: default; }
      .pf-mode-btn.is-work { background: var(--amber-dim); color: var(--amber); }
      .pf-mode-btn.is-break { background: var(--slate-dim); color: var(--slate); }

      .pf-dial-wrap { position: relative; width: 260px; height: 260px; }
      .pf-dial { display: block; }
      .pf-dial-progress { transition: stroke-dashoffset 0.9s linear; }
      @media (prefers-reduced-motion: reduce) {
        .pf-dial-progress { transition: none; }
      }
      .pf-dial-center {
        position: absolute; inset: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 4px;
      }
      .pf-dial-time {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 44px;
        font-weight: 600;
        letter-spacing: 1px;
        font-variant-numeric: tabular-nums;
      }
      .pf-dial-status { font-size: 12px; color: var(--text-muted); text-transform: lowercase; }

      .pf-name-input {
        width: 100%;
        background: var(--track);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 10px 12px;
        color: var(--text);
        font-size: 13.5px;
      }
      .pf-name-input::placeholder { color: var(--text-muted); }

      .pf-duration-row { display: flex; align-items: center; justify-content: space-between; width: 100%; }
      .pf-duration-label { font-size: 12.5px; color: var(--text-muted); }
      .pf-stepper { display: flex; align-items: center; gap: 10px; }
      .pf-stepper-btn {
        width: 26px; height: 26px;
        border-radius: 7px;
        border: 1px solid var(--border);
        background: var(--panel-raised);
        color: var(--text);
        display: flex; align-items: center; justify-content: center;
      }
      .pf-stepper-value {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 13px;
        min-width: 52px;
        text-align: center;
      }

      .pf-controls { display: flex; gap: 10px; width: 100%; }
      .pf-controls .pf-btn { flex: 1; }

      /* ---------- Calendar card ---------- */
      .pf-cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
      .pf-cal-title { font-size: 14px; font-weight: 600; text-transform: capitalize; }
      .pf-cal-weekdays {
        display: grid; grid-template-columns: repeat(7, 1fr);
        margin-bottom: 6px;
      }
      .pf-cal-weekdays span {
        text-align: center; font-size: 10.5px; color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.5px;
      }
      .pf-cal-grid {
        display: grid; grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        transition: opacity 0.15s ease;
      }
      .pf-cal-grid.is-loading { opacity: 0.5; }
      .pf-cal-cell {
        position: relative;
        aspect-ratio: 1;
        border: 1px solid transparent;
        background: var(--track);
        border-radius: 9px;
        color: var(--text);
        font-size: 12.5px;
        display: flex; align-items: center; justify-content: center;
      }
      .pf-cal-cell.is-empty { background: transparent; }
      .pf-cal-cell.is-today { border-color: var(--amber); }
      .pf-cal-cell.is-selected { background: var(--amber-dim); color: var(--amber); }
      .pf-cal-dot {
        position: absolute;
        bottom: 5px;
        width: 5px; height: 5px;
        border-radius: 50%;
        background: var(--amber);
      }
      .pf-cal-cell.is-selected .pf-cal-dot { background: var(--ink); }

      /* ---------- Day detail card ---------- */
      .pf-day-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
      .pf-day-header h2 { font-size: 14.5px; font-weight: 600; margin: 0; text-transform: capitalize; }
      .pf-day-total { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
      .pf-day-total-value {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 26px; font-weight: 600; color: var(--amber);
      }
      .pf-day-total-label { font-size: 12.5px; color: var(--text-muted); }
      .pf-day-total-break { font-size: 11.5px; color: var(--text-muted); width: 100%; }
      .pf-day-empty { font-size: 13px; color: var(--text-muted); }

      .pf-activity-list { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      .pf-activity-item {
        display: flex; align-items: center; gap: 9px;
        background: var(--track);
        border-radius: 10px;
        padding: 8px 10px;
      }
      .pf-activity-badge {
        display: flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; border-radius: 6px;
        flex-shrink: 0;
      }
      .pf-activity-badge.is-work { background: var(--amber-dim); color: var(--amber); }
      .pf-activity-badge.is-break { background: var(--slate-dim); color: var(--slate); }
      .pf-activity-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pf-activity-duration {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px; color: var(--text-muted); flex-shrink: 0;
      }
      .pf-activity-delete {
        border: none; background: transparent; color: var(--text-muted);
        display: flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
      }
      .pf-activity-delete:hover { color: var(--danger); }

      .pf-notes-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
      .pf-notes-header span:first-child { font-size: 12.5px; color: var(--text-muted); }
      .pf-notes-saved { font-size: 10.5px; color: var(--text-muted); }
      .pf-notes-textarea {
        width: 100%;
        background: var(--track);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 10px 12px;
        color: var(--text);
        font-size: 13px;
        resize: vertical;
        min-height: 88px;
      }
      .pf-notes-textarea::placeholder { color: var(--text-muted); }
    `}</style>
  );
}
