import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import HourglassMark from "./HourglassMark.jsx";

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email.includes("@")) {
      setError("Digite um e-mail válido.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setBusy(true);
    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(traduzErro(signUpError.message));
      } else if (!data.session) {
        setInfo("Conta criada! Verifique seu e-mail para confirmar antes de entrar.");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(traduzErro(signInError.message));
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
            onClick={() => { setMode("login"); setError(""); setInfo(""); }}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`pf-tab ${mode === "signup" ? "is-active" : ""}`}
            onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
            type="button"
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pf-form">
          <label className="pf-field">
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
            />
          </label>
          <label className="pf-field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mín. 6 caracteres"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          {error && <div className="pf-error">{error}</div>}
          {info && <div className="pf-info">{info}</div>}

          <button className="pf-btn pf-btn-primary" type="submit" disabled={busy}>
            {busy ? <Loader2 size={16} className="pf-spin" /> : null}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="pf-auth-note">
          O login fica salvo no navegador — você continua conectado mesmo depois de fechar o site.
        </p>
      </div>
    </div>
  );
}

function traduzErro(msg) {
  if (/already registered/i.test(msg)) return "Esse e-mail já tem uma conta. Tente entrar.";
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).";
  return msg;
}
