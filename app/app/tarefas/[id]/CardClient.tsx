"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Task, Subtask } from "@/types/db";
import { blockingSubtasks, deliveryForecast } from "@/lib/engine";
import { EditTaskModal } from "./EditTaskModal";
import { SketchPad } from "./SketchPad";

const ALERTS = [
  { label: "7d", text: "1 semana antes", interval: "7 days" },
  { label: "1d", text: "1 dia antes", interval: "1 day" },
  { label: "3h", text: "3h antes", interval: "3 hours" },
];

const PRIORITY: Record<string, { cls: string; label: string }> = {
  alta: { cls: "hi", label: "Alta" },
  media: { cls: "md", label: "Média" },
  baixa: { cls: "lo", label: "Baixa" },
};
const durMin = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m}min`;

export function CardClient({ task, initialSubtasks }: { task: Task; initialSubtasks: Subtask[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [t, setT] = useState<Task>(task);
  const [subs, setSubs] = useState<Subtask[]>(initialSubtasks);
  const [newSub, setNewSub] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; label: string }[]>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("task_alerts")
      .select("id,label")
      .eq("task_id", task.id)
      .then(({ data }) => setAlerts((data as { id: string; label: string }[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleAlert(a: (typeof ALERTS)[number]) {
    const existing = alerts.find((x) => x.label === a.label);
    if (existing) {
      setAlerts(alerts.filter((x) => x.id !== existing.id));
      await supabase.from("task_alerts").delete().eq("id", existing.id);
    } else {
      const { data } = await supabase
        .from("task_alerts")
        .insert({ task_id: t.id, label: a.label, offset_before: a.interval })
        .select("id,label")
        .single();
      if (data) setAlerts((prev) => [...prev, data as { id: string; label: string }]);
    }
  }

  const doneIds = useMemo(() => new Set(subs.filter((s) => s.done).map((s) => s.id)), [subs]);
  const isLocked = (s: Subtask) => !!s.depends_on && !doneIds.has(s.depends_on);
  const blocking = useMemo(
    () => blockingSubtasks(subs.map((s) => ({ id: s.id, title: s.title, done: s.done, dependsOn: s.depends_on }))),
    [subs]
  );
  const doneCount = subs.filter((s) => s.done).length;
  const atRisk = blocking.length > 0;

  // --- previsão de entrega ---
  const total = subs.length;
  const undone = total - doneCount;
  const remaining =
    t.estimated_minutes != null
      ? total > 0
        ? Math.round(t.estimated_minutes * (undone / total))
        : t.estimated_minutes
      : total > 0
      ? undone * 60
      : 90;
  const forecast = t.due_at ? deliveryForecast(remaining, new Date(t.due_at)) : null;

  async function toggle(s: Subtask) {
    if (isLocked(s)) return;
    const next = subs.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x));
    setSubs(next);
    const { error } = await supabase.from("subtasks").update({ done: !s.done }).eq("id", s.id);
    if (error) setSubs(subs);
  }

  async function addSubtask() {
    const title = newSub.trim();
    if (!title || adding) return;
    setAdding(true);
    const last = subs[subs.length - 1];
    const { data, error } = await supabase
      .from("subtasks")
      .insert({ task_id: t.id, title, position: last ? last.position + 1 : 0, done: false, depends_on: last ? last.id : null })
      .select()
      .single();
    setAdding(false);
    if (error || !data) return;
    setSubs([...subs, data as Subtask]);
    setNewSub("");
  }

  async function deleteSubtask(id: string) {
    const prev = subs;
    setSubs(subs.filter((s) => s.id !== id).map((s) => (s.depends_on === id ? { ...s, depends_on: null } : s)));
    const { error } = await supabase.from("subtasks").delete().eq("id", id);
    if (error) setSubs(prev);
  }

  // --- Focus Flow ---
  const [focusOn, setFocusOn] = useState(false);
  const [focusMin, setFocusMin] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<string | null>(null);
  const activeSub = subs.find((s) => !s.done && !isLocked(s));

  async function enterFocus(mins: number) {
    setFocusOn(true);
    setLeft(mins * 60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("focus_sessions")
          .insert({ user_id: user.id, task_id: t.id, subtask_id: activeSub?.id ?? null, planned_minutes: mins })
          .select()
          .single();
        sessionRef.current = data?.id ?? null;
      }
    } catch {}
  }
  async function exitFocus() {
    setFocusOn(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (sessionRef.current) {
      try {
        await supabase.from("focus_sessions").update({ ended_at: new Date().toISOString() }).eq("id", sessionRef.current);
      } catch {}
      sessionRef.current = null;
    }
  }
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const prio = PRIORITY[t.priority] ?? PRIORITY.media;

  return (
    <>
      <div className="cardtop">
        <button className="backbtn" onClick={() => router.back()}>‹</button>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          {t.category ?? (t.sphere === "profissional" ? "Profissional" : "Pessoal")}
        </div>
        <button className="editbtn" onClick={() => setEditing(true)}>Editar</button>
      </div>

      <div className="cardemoji">{t.emoji ?? "📄"}</div>
      <h1 className="ctitle">{t.title}</h1>

      <div className="props">
        <div className="prop">
          <div className="pk">▲ Prioridade</div>
          <div className="pv"><span className={`farol ${prio.cls}`} />{prio.label}</div>
        </div>
        {t.due_at && (
          <div className="prop">
            <div className="pk">◆ Prazo</div>
            <div className="pv">
              <span className="mono" style={{ fontSize: 12 }}>
                {new Date(t.due_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="divider" />

      {/* PREVISÃO DE ENTREGA */}
      {forecast && (
        <div className={`pred ${forecast.compatible ? "ok" : "risk"}`}>
          <div className="pline">
            <span>{forecast.compatible ? "No seu ritmo, dá pra entregar a tempo" : "Prazo apertado pro ritmo atual"}</span>
            <span className="badge">{forecast.compatible ? "✓ compatível" : "⚠ apertado"}</span>
          </div>
          <div className="psub">
            ~{durMin(remaining)} de trabalho restante · prazo em {forecast.daysAvailable}d.
          </div>
        </div>
      )}

      {atRisk && (
        <div className="predalert">
          <span>⚠️</span>
          <span>A etapa <b>{blocking[0].title}</b> está segurando a cadeia — outras etapas dependem dela. Sem avançar, o prazo final entra em risco.</span>
        </div>
      )}

      {t.snapshot && (
        <div className="callout">
          <div>🔖</div>
          <div>
            <div className="ck">Onde você parou</div>
            <div className="ctext">{t.snapshot}</div>
          </div>
        </div>
      )}

      <div className="sec">☑ Sub-etapas<span className="rule" /></div>

      {subs.length > 0 && (
        <div className="subprog">
          <div className="pb"><span style={{ width: `${(doneCount / subs.length) * 100}%` }} /></div>
          <span className="pct">{doneCount}/{subs.length}</span>
        </div>
      )}

      <div className="subs">
        {subs.map((s) => {
          const locked = isLocked(s);
          return (
            <div key={s.id} className={`sub ${s.done ? "done" : ""} ${locked ? "wait" : ""}`} onClick={() => toggle(s)}>
              <div className="box">✓</div>
              <div style={{ flex: 1 }}>
                <div className="stxt">{s.title}</div>
                {locked && <div className="smeta">🔒<span className="waitchip">aguarda etapa anterior</span></div>}
              </div>
              <button className="subdel" onClick={(e) => { e.stopPropagation(); deleteSubtask(s.id); }} aria-label="Excluir sub-etapa">✕</button>
            </div>
          );
        })}
      </div>

      <div className="addsub">
        <span className="addsub-plus">+</span>
        <input value={newSub} onChange={(e) => setNewSub(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubtask()} placeholder="Adicionar sub-etapa" disabled={adding} />
        {newSub.trim() && <button className="addsub-btn" onClick={addSubtask} disabled={adding}>{adding ? "..." : "Adicionar"}</button>}
      </div>

      {/* Rascunho (canvas + notas) */}
      <SketchPad taskId={t.id} initialSketch={t.sketch} initialNotes={t.notes} />

      {/* Alertas de prazo */}
      <div className={`accordion ${alertsOpen ? "open" : ""}`}>
        <div className="acc-head" onClick={() => setAlertsOpen(!alertsOpen)}>
          <span className="acc-tw">▶</span>🔔 Alertas de prazo
        </div>
        <div className="acc-body">
          <div className="acc-inner">
            {!t.due_at && (
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>
                Defina um prazo (em Editar) pra usar alertas relativos.
              </p>
            )}
            <div className="achips">
              {ALERTS.map((a) => {
                const on = alerts.some((x) => x.label === a.label);
                return (
                  <button key={a.label} className={`achip ${on ? "on" : ""}`} onClick={() => toggleAlert(a)}>
                    <span className="ac" />
                    {a.text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 80 }} />

      {/* Focus Flow trigger */}
      <div className="cardaction">
        <div className="fdur">
          {[15, 25, 45, 60, 90].map((m) => (
            <button key={m} className={`fdurb ${focusMin === m ? "on" : ""}`} onClick={() => setFocusMin(m)}>
              {m}min
            </button>
          ))}
        </div>
        <button className="flow" onClick={() => enterFocus(focusMin)}>
          ◐ Focus Flow · {focusMin}min
        </button>
      </div>

      {/* Focus Flow overlay */}
      <div className={`focusmode ${focusOn ? "on" : ""}`}>
        <div className="fk">Focus Flow</div>
        <div className="ftimer">{fmt(left)}</div>
        <div className="fsub">{left === 0 ? "tempo concluído" : "restam"}</div>
        <div className="ftask">Foco único: <b>{activeSub?.title ?? t.title}</b></div>
        <div className="fsilence">◦ uma tarefa por vez · ative o Não Perturbe do celular</div>
        <div className="fbtns">
          <button className="fmore" onClick={() => setLeft((v) => v + 300)}>+5 min</button>
          <button className="fexit" onClick={exitFocus}>Sair do foco</button>
        </div>
      </div>

      {editing && (
        <EditTaskModal task={t} onClose={() => setEditing(false)} onUpdated={(patch) => setT({ ...t, ...patch })} />
      )}
    </>
  );
}