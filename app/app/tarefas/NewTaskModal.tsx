"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Sphere, Priority } from "@/types/db";

const EMOJIS = ["📄", "📊", "⚖️", "💼", "📚", "🏃", "🌿", "🚀", "🏠", "💡", "📞", "✅"];
const PRIOS: { key: Priority; cls: string; label: string }[] = [
  { key: "baixa", cls: "lo", label: "Baixa" },
  { key: "media", cls: "md", label: "Média" },
  { key: "alta", cls: "hi", label: "Alta" },
];

export function NewTaskModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [emoji, setEmoji] = useState("📄");
  const [title, setTitle] = useState("");
  const [sphere, setSphere] = useState<Sphere>("profissional");
  const [priority, setPriority] = useState<Priority>("media");
  const [due, setDue] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    if (!title.trim()) {
      setError("Dê um título à tarefa.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada. Entre novamente.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: title.trim(),
      emoji,
      sphere,
      priority,
      category: category.trim() || null,
      due_at: due ? new Date(due + "T12:00:00").toISOString() : null,
      status: "a_fazer",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={handle} />
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Nova tarefa</div>

        {/* emoji + título */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={emojiBox}>{emoji}</div>
          <input
            className="field"
            style={{ margin: 0, flex: 1 }}
            placeholder="O que precisa ser feito?"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </div>

        {/* emoji picker */}
        <div style={emojiRow}>
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              style={{
                ...emojiPick,
                borderColor: emoji === e ? "var(--gold)" : "var(--line)",
                background: emoji === e ? "var(--gold-bg)" : "var(--surface)",
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* esfera */}
        <label style={lbl}>Esfera</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["profissional", "pessoal"] as Sphere[]).map((s) => (
            <button
              key={s}
              onClick={() => setSphere(s)}
              style={{
                ...seg,
                borderColor: sphere === s ? "var(--gold)" : "var(--line-2)",
                background: sphere === s ? "var(--gold-bg)" : "var(--surface)",
                color: sphere === s ? "var(--gold)" : "var(--ink-2)",
              }}
            >
              {s === "profissional" ? "Profissional" : "Pessoal"}
            </button>
          ))}
        </div>

        {/* prioridade (farol) */}
        <label style={lbl}>Prioridade</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {PRIOS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPriority(p.key)}
              style={{
                ...seg,
                borderColor: priority === p.key ? "var(--ink)" : "var(--line-2)",
                background: priority === p.key ? "var(--sunk)" : "var(--surface)",
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <span className={`farol ${p.cls}`} />
              {p.label}
            </button>
          ))}
        </div>

        {/* prazo + categoria */}
        <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Prazo</label>
            <input
              className="field"
              style={{ margin: 0 }}
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Categoria</label>
            <input
              className="field"
              style={{ margin: 0 }}
              placeholder="Cliente, área..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p style={{ color: "var(--coral)", fontSize: 13, margin: "10px 0 0" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            className="btn"
            style={{ background: "var(--sunk)", color: "var(--ink-2)" }}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="btn ink" onClick={create} disabled={loading}>
            {loading ? "Criando..." : "Criar tarefa"}
          </button>
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(40,35,25,.35)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  zIndex: 100,
};
const sheet: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: "var(--paper)",
  borderRadius: "22px 22px 0 0",
  padding: "14px 20px 26px",
  boxShadow: "0 -20px 60px -20px rgba(0,0,0,.35)",
  animation: "riseUp .25s ease",
};
const handle: React.CSSProperties = {
  width: 38,
  height: 4,
  borderRadius: 99,
  background: "var(--line-2)",
  margin: "0 auto 16px",
};
const emojiBox: React.CSSProperties = {
  width: 48,
  height: 48,
  flex: "0 0 48px",
  borderRadius: 12,
  border: "1px solid var(--line-2)",
  background: "var(--surface)",
  display: "grid",
  placeItems: "center",
  fontSize: 22,
};
const emojiRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 16,
};
const emojiPick: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 9,
  border: "1px solid var(--line)",
  cursor: "pointer",
  fontSize: 17,
};
const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".05em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
  marginBottom: 7,
};
const seg: React.CSSProperties = {
  flex: 1,
  padding: "10px",
  borderRadius: 10,
  border: "1.5px solid",
  fontFamily: "var(--sans)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};