"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Task, Sphere, Priority } from "@/types/db";

const EMOJIS = ["📄", "📊", "⚖️", "💼", "📚", "🏃", "🌿", "🚀", "🏠", "💡", "📞", "✅"];
const PRIOS: { key: Priority; cls: string; label: string }[] = [
  { key: "baixa", cls: "lo", label: "Baixa" },
  { key: "media", cls: "md", label: "Média" },
  { key: "alta", cls: "hi", label: "Alta" },
];

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function EditTaskModal({
  task,
  onClose,
  onUpdated,
}: {
  task: Task;
  onClose: () => void;
  onUpdated: (patch: Partial<Task>) => void;
}) {
  const router = useRouter();
  const [emoji, setEmoji] = useState(task.emoji ?? "📄");
  const [title, setTitle] = useState(task.title);
  const [sphere, setSphere] = useState<Sphere>(task.sphere);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [due, setDue] = useState(toDateInput(task.due_at));
  const [category, setCategory] = useState(task.category ?? "");
  const [estimate, setEstimate] = useState(task.estimated_minutes?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!title.trim()) return setError("O título não pode ficar vazio.");
    setLoading(true);
    const supabase = createClient();
    const patch: Partial<Task> = {
      emoji,
      title: title.trim(),
      sphere,
      priority,
      category: category.trim() || null,
      due_at: due ? new Date(due + "T12:00:00").toISOString() : null,
      estimated_minutes: estimate ? parseInt(estimate, 10) : null,
    };
    const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
    setLoading(false);
    if (error) return setError(error.message);
    onUpdated(patch);
    router.refresh();
    onClose();
  }

  async function remove() {
    if (!confirm("Excluir esta tarefa? Não dá pra desfazer.")) return;
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", task.id);
    router.push("/app/tarefas");
    router.refresh();
  }

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={handle} />
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Editar tarefa</div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={emojiBox}>{emoji}</div>
          <input className="field" style={{ margin: 0, flex: 1 }} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div style={emojiRow}>
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} style={{ ...emojiPick, borderColor: emoji === e ? "var(--gold)" : "var(--line)", background: emoji === e ? "var(--gold-bg)" : "var(--surface)" }}>
              {e}
            </button>
          ))}
        </div>

        <label style={lbl}>Esfera</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["profissional", "pessoal"] as Sphere[]).map((s) => (
            <button key={s} onClick={() => setSphere(s)} style={{ ...seg, borderColor: sphere === s ? "var(--gold)" : "var(--line-2)", background: sphere === s ? "var(--gold-bg)" : "var(--surface)", color: sphere === s ? "var(--gold)" : "var(--ink-2)" }}>
              {s === "profissional" ? "Profissional" : "Pessoal"}
            </button>
          ))}
        </div>

        <label style={lbl}>Prioridade</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {PRIOS.map((p) => (
            <button key={p.key} onClick={() => setPriority(p.key)} style={{ ...seg, borderColor: priority === p.key ? "var(--ink)" : "var(--line-2)", background: priority === p.key ? "var(--sunk)" : "var(--surface)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <span className={`farol ${p.cls}`} />
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Prazo</label>
            <input className="field" style={{ margin: 0 }} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Estimativa (min)</label>
            <input className="field" style={{ margin: 0 }} type="number" inputMode="numeric" placeholder="ex: 120" value={estimate} onChange={(e) => setEstimate(e.target.value)} />
          </div>
        </div>

        <label style={lbl}>Categoria</label>
        <input className="field" style={{ margin: "0 0 4px" }} placeholder="Cliente, área..." value={category} onChange={(e) => setCategory(e.target.value)} />

        {error && <p style={{ color: "var(--coral)", fontSize: 13, margin: "10px 0 0" }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn" style={{ background: "var(--coral-bg)", color: "var(--coral)", flex: "0 0 auto", width: 54 }} onClick={remove} title="Excluir tarefa">
            🗑
          </button>
          <button className="btn ink" onClick={save} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(40,35,25,.35)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 };
const sheet: React.CSSProperties = { width: "100%", maxWidth: 440, background: "var(--paper)", borderRadius: "22px 22px 0 0", padding: "14px 20px 26px", maxHeight: "90dvh", overflowY: "auto", boxShadow: "0 -20px 60px -20px rgba(0,0,0,.35)", animation: "riseUp .25s ease" };
const handle: React.CSSProperties = { width: 38, height: 4, borderRadius: 99, background: "var(--line-2)", margin: "0 auto 16px" };
const emojiBox: React.CSSProperties = { width: 48, height: 48, flex: "0 0 48px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--surface)", display: "grid", placeItems: "center", fontSize: 22 };
const emojiRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 };
const emojiPick: React.CSSProperties = { width: 36, height: 36, borderRadius: 9, border: "1px solid var(--line)", cursor: "pointer", fontSize: 17 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 7 };
const seg: React.CSSProperties = { flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, cursor: "pointer" };
