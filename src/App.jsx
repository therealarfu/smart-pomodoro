import React, { useState, useEffect, useRef, useCallback } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { supabase } from "./lib/supabase.js";
import { pad, todayISO, elapsedFor } from "./lib/format.js";
import AuthScreen from "./components/AuthScreen.jsx";
import TimerCard from "./components/TimerCard.jsx";
import CalendarCard from "./components/CalendarCard.jsx";
import DayDetailCard from "./components/DayDetailCard.jsx";
import HourglassMark from "./components/HourglassMark.jsx";

const DEFAULT_WORK_MIN = 25;
const DEFAULT_BREAK_MIN = 5;

const IDLE_TIMER = (mode = "work") => ({
  status: "idle",
  mode,
  activity_name: "",
  target_seconds: (mode === "work" ? DEFAULT_WORK_MIN : DEFAULT_BREAK_MIN) * 60,
  accumulated_seconds: 0,
  run_start: null,
});

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = ainda carregando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="pf-root">
      {session === undefined ? (
        <div className="pf-boot">
          <Loader2 size={22} className="pf-spin" />
        </div>
      ) : session ? (
        <AppShell user={session.user} />
      ) : (
        <AuthScreen />
      )}
    </div>
  );
}

function AppShell({ user }) {
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
  const [monthSummary, setMonthSummary] = useState({});
  const [monthLoading, setMonthLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [dayActivities, setDayActivities] = useState([]);
  const [dayNotes, setDayNotes] = useState("");
  const [dayLoading, setDayLoading] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaved, setNotesSaved] = useState(true);
  const notesTimeoutRef = useRef(null);
  const justCompletedRef = useRef(false);

  /* --- load timer state on mount --- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("timer_state")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        const state = data || IDLE_TIMER();
        setTimerState(state);
        setActivityInput(state.activity_name || "");
        setTimerLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  /* --- ticking clock while running --- */
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const persistTimer = useCallback(
    async (next) => {
      setTimerState(next);
      await supabase.from("timer_state").upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
    },
    [user.id]
  );

  /* --- load a month's summary --- */
  const loadMonth = useCallback(
    async (monthDate) => {
      setMonthLoading(true);
      const y = monthDate.getFullYear();
      const m = monthDate.getMonth();
      const firstISO = `${y}-${pad(m + 1)}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const lastISO = `${y}-${pad(m + 1)}-${pad(lastDay)}`;

      const { data, error } = await supabase
        .from("sessions")
        .select("date, mode, seconds")
        .eq("user_id", user.id)
        .gte("date", firstISO)
        .lte("date", lastISO);

      if (!error && data) {
        const summary = {};
        for (const row of data) {
          if (!summary[row.date]) summary[row.date] = { workSeconds: 0, count: 0 };
          summary[row.date].count += 1;
          if (row.mode === "work") summary[row.date].workSeconds += row.seconds;
        }
        setMonthSummary(summary);
      }
      setMonthLoading(false);
    },
    [user.id]
  );

  useEffect(() => { loadMonth(viewMonth); }, [viewMonth, loadMonth]);

  /* --- load selected day --- */
  const loadDay = useCallback(
    async (dateISO) => {
      setDayLoading(true);
      const [{ data: sessions }, { data: noteRow }] = await Promise.all([
        supabase.from("sessions").select("*").eq("user_id", user.id).eq("date", dateISO),
        supabase.from("day_notes").select("*").eq("user_id", user.id).eq("date", dateISO).maybeSingle(),
      ]);
      setDayActivities(sessions || []);
      setDayNotes(noteRow?.notes || "");
      setNotesDraft(noteRow?.notes || "");
      setNotesSaved(true);
      setDayLoading(false);
    },
    [user.id]
  );

  useEffect(() => { loadDay(selectedDate); }, [selectedDate, loadDay]);

  function handleNotesChange(text) {
    setNotesDraft(text);
    setNotesSaved(false);
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(async () => {
      await supabase.from("day_notes").upsert(
        { user_id: user.id, date: selectedDate, notes: text, updated_at: new Date().toISOString() },
        { onConflict: "user_id,date" }
      );
      setDayNotes(text);
      setNotesSaved(true);
    }, 700);
  }

  /* --- timer derived values --- */
  const elapsed = elapsedFor(timerState, nowMs);
  const remaining = Math.max(0, timerState.target_seconds - elapsed);
  const progress = timerState.target_seconds > 0 ? Math.min(1, elapsed / timerState.target_seconds) : 0;

  /* --- auto-complete when time runs out --- */
  useEffect(() => {
    if (
      timerLoaded &&
      timerState.status === "running" &&
      elapsed >= timerState.target_seconds &&
      !justCompletedRef.current
    ) {
      justCompletedRef.current = true;
      completeTimer(false).finally(() => { justCompletedRef.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, timerState.status, timerLoaded]);

  function startTimer() {
    const mode = timerState.mode;
    const minutes = mode === "work" ? workMinutes : breakMinutes;
    persistTimer({
      status: "running",
      mode,
      activity_name: activityInput.trim(),
      target_seconds: minutes * 60,
      accumulated_seconds: 0,
      run_start: new Date().toISOString(),
    });
  }

  function pauseTimer() {
    const e = elapsedFor(timerState, Date.now());
    persistTimer({ ...timerState, status: "paused", accumulated_seconds: e, run_start: null });
  }

  function resumeTimer() {
    persistTimer({ ...timerState, status: "running", run_start: new Date().toISOString() });
  }

  function cancelTimer() {
    const e = elapsedFor(timerState, Date.now());
    if (e > 30) {
      const ok = window.confirm("Cancelar a sessão em andamento? O tempo não será salvo.");
      if (!ok) return;
    }
    persistTimer(IDLE_TIMER(timerState.mode));
    setActivityInput("");
  }

  async function completeTimer(manual) {
    const e = elapsedFor(timerState, Date.now());
    const finalSeconds = Math.round(manual ? Math.min(e, timerState.target_seconds) : timerState.target_seconds);
    const mode = timerState.mode;

    if (finalSeconds >= 5) {
      const dateISO = todayISO();
      const name =
        (timerState.activity_name || activityInput || "").trim() ||
        (mode === "work" ? "Sessão de foco" : "Descanso");

      await supabase.from("sessions").insert({
        user_id: user.id,
        date: dateISO,
        name,
        mode,
        seconds: finalSeconds,
        completed_at: new Date().toISOString(),
      });

      if (dateISO === selectedDate) loadDay(selectedDate);
      loadMonth(viewMonth);
    }

    const nextMode = mode === "work" ? "break" : "work";
    await persistTimer(IDLE_TIMER(nextMode));
    setActivityInput("");
  }

  async function deleteActivity(activityId) {
    await supabase.from("sessions").delete().eq("id", activityId);
    setDayActivities((prev) => prev.filter((a) => a.id !== activityId));
    loadMonth(viewMonth);
  }

  function adjustMode(mode) {
    if (timerState.status !== "idle") return;
    persistTimer(IDLE_TIMER(mode));
  }

  const workTotal = dayActivities.filter((a) => a.mode === "work").reduce((s, a) => s + a.seconds, 0);
  const breakTotal = dayActivities.filter((a) => a.mode === "break").reduce((s, a) => s + a.seconds, 0);

  return (
    <div className="pf-shell">
      <header className="pf-header">
        <div className="pf-header-left">
          <HourglassMark size={22} />
          <span className="pf-header-title">Pomodoro Inteligente</span>
        </div>
        <div className="pf-header-right">
          <span className="pf-header-user">{user.email}</span>
          <button className="pf-icon-btn" onClick={() => supabase.auth.signOut()} title="Sair" type="button">
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
            onNameBlur={() => persistTimer({ ...timerState, activity_name: activityInput.trim() })}
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
            activities={dayActivities}
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
