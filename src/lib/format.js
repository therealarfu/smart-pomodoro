export const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${pad(m)}:${pad(sec)}`;
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// O timer guarda "quando começou a rodar" (run_start) em vez de contar
// segundos com um timer local. Assim, o tempo decorrido é sempre calculado
// comparando com o relógio atual — funciona mesmo se a aba for fechada e
// reaberta depois, em qualquer aparelho, porque o estado vem do banco.
export function elapsedFor(state, nowMs) {
  if (state.status === "running" && state.run_start) {
    const startMs = new Date(state.run_start).getTime();
    return state.accumulated_seconds + (nowMs - startMs) / 1000;
  }
  return state.accumulated_seconds;
}
