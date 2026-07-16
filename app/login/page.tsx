"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email || !password) return setError("Preencha e-mail e senha.");
    if (password.length < 6) return setError("A senha precisa ter ao menos 6 caracteres.");
    if (mode === "criar" && !aceite)
      return setError("Para criar a conta, aceite os Termos e a Política de Privacidade.");

    setLoading(true);
    const supabase = createClient();
    const { error } =
      mode === "criar"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) return setError(traduz(error.message));
    router.push("/app");
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

      {mode === "criar" && (
        <label className="consent">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>
            Li e aceito os <a href="/termos" target="_blank">Termos de Uso</a> e a{" "}
            <a href="/privacidade" target="_blank">Política de Privacidade</a>.
          </span>
        </label>
      )}

      {error && <p className="auth-error">{error}</p>}

      <button className="btn ink" onClick={submit} disabled={loading}>
        {loading ? "Aguarde..." : mode === "criar" ? "Criar minha conta" : "Entrar no Norte"}
      </button>

      <p className="note">
        {mode === "entrar" ? "Ainda não tem conta? " : "Já tem conta? "}
        <button
          className="linkbtn"
          onClick={() => {
            setMode(mode === "entrar" ? "criar" : "entrar");
            setError(null);
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
  if (msg.includes("already registered")) return "Esse e-mail já tem conta. Escolha 'Entrar'.";
  if (msg.includes("Email not confirmed"))
    return "E-mail não confirmado. Desligue 'Confirm email' no Supabase (em dev).";
  return msg;
}
