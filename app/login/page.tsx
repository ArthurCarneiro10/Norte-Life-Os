"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const supabase = createClient();

    const { error } =
      mode === "criar"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(traduz(error.message));
      return;
    }
    router.push("/app/tarefas");
    router.refresh();
  }

  return (
    <div className="authwrap">
      <div className="brand">NORTE</div>
      <div className="q">Encontre seu norte.</div>
      <p className="lead">Viva com direção, produza com equilíbrio.</p>

      <input
        className="field"
        type="email"
        placeholder="voce@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="field"
        type="password"
        placeholder="senha (mín. 6 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />

      {error && (
        <p style={{ color: "var(--coral)", fontSize: 13, margin: "2px 0 10px" }}>
          {error}
        </p>
      )}

      <button className="btn ink" onClick={submit} disabled={loading}>
        {loading
          ? "Aguarde..."
          : mode === "criar"
          ? "Criar minha conta"
          : "Entrar no Norte"}
      </button>

      <p className="note">
        {mode === "entrar" ? "Ainda não tem conta? " : "Já tem conta? "}
        <button
          onClick={() => {
            setMode(mode === "entrar" ? "criar" : "entrar");
            setError(null);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--gold)",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 12.5,
          }}
        >
          {mode === "entrar" ? "Criar conta" : "Entrar"}
        </button>
      </p>
    </div>
  );
}

function traduz(msg: string) {
  if (msg.includes("Invalid login")) return "E-mail ou senha incorretos.";
  if (msg.includes("already registered"))
    return "Esse e-mail já tem conta. Escolha 'Entrar'.";
  if (msg.includes("Email not confirmed"))
    return "E-mail não confirmado. Desligue 'Confirm email' no Supabase (em dev).";
  return msg;
}