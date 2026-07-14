"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Task, STATUS_LABEL } from "@/types/db";
import { NewTaskModal } from "./NewTaskModal";

const BOARD = 40;
type Period = "dia" | "semana" | "quinzena" | "mes";
const PERIODS: { key: Period; label: string }[] = [
  { key: "dia", label: "Dia" },
  { key: "semana", label: "Semana" },
  { key: "quinzena", label: "15 dias" },
  { key: "mes", label: "Mês" },
];

function windowStart(mode: Period): Date {
  const n = new Date();
  if (mode === "dia") {
    const d = new Date(n);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = mode === "semana" ? 7 : mode === "quinzena" ? 15 : 30;
  return new Date(n.getTime() - days * 86400000);
}

function allSubsDone(t: Task) {
  const subs = t.subtasks ?? [];
  return subs.length === 0 || subs.every((s) => s.done);
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<Task[]>(tasks);
  const [mode, setMode] = useState<"status" | "cliente">("status");
  const [period, setPeriod] = useState<Period>("semana");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => setItems(tasks), [tasks]);

  const cutoff = windowStart(period);
  const winCompleted = items.filter(
    (t) => t.status === "finalizado" && t.completed_at && new Date(t.completed_at) >= cutoff
  ).length;
  const cartelas = Math.floor(winCompleted / BOARD);
  const filled = winCompleted % BOARD;
  const justFinished = winCompleted > 0 && filled === 0;

  async function toggleDone(t: Task, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const finished = t.status === "finalizado";
    if (!finished && !allSubsDone(t)) return;
    const newStatus = finished ? "a_fazer" : "finalizado";
    const completed_at = finished ? null : new Date().toISOString();
    setItems(items.map((x) => (x.id === t.id ? { ...x, status: newStatus, completed_at } : x)));
    await supabase.from("tasks").update({ status: newStatus, completed_at }).eq("id", t.id);
    router.refresh();
  }

  const groups: Record<string, Task[]> = {};
  for (const t of items) {
    const key = mode === "status" ? STATUS_LABEL[t.status] : t.category ?? "Sem categoria";
    (groups[key] ??= []).push(t);
  }

  return (
    <>
      {/* CARTELA */}
      <div className="board">
        <div className="board-head">
          <span className="board-title">Sua cartela</span>
          {cartelas > 0 && (
            <span className="board-badge">🏆 {cartelas}</span>
          )}
        </div>
        <div className="btabs">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`btab ${period === p.key ? "on" : ""}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mosaic">
          {Array.from({ length: BOARD }).map((_, i) => (
            <div key={i} className={`msq ${i < filled ? "on" : ""} ${i === filled - 1 ? "last" : ""}`} />
          ))}
        </div>
        <div className="board-cap">
          {winCompleted === 0
            ? "Nenhuma concluída nesse período ainda."
            : justFinished
            ? "🎉 Cartela completa nesse período!"
            : `${filled}/${BOARD} concluídas`}
        </div>
      </div>

      {items.length === 0 ? (
        <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6, marginTop: 6 }}>
          Nenhuma tarefa ainda. Toque no <b>+</b> pra criar a primeira.
        </p>
      ) : (
        <>
          <div className="seg">
            <button className={`segb ${mode === "status" ? "on" : ""}`} onClick={() => setMode("status")}>
              Por etapa
            </button>
            <button className={`segb ${mode === "cliente" ? "on" : ""}`} onClick={() => setMode("cliente")}>
              Por cliente
            </button>
          </div>

          {Object.entries(groups).map(([g, list]) => (
            <div key={g} style={{ marginBottom: 18 }}>
              <div className="grph">
                {g} <span className="cnt">{list.length}</span>
              </div>
              {list.map((t) => {
                const finished = t.status === "finalizado";
                const locked = !finished && !allSubsDone(t);
                return (
                  <Link key={t.id} href={`/app/tarefas/${t.id}`} className={`tcard ${finished ? "done" : ""}`}>
                    <button
                      className={`tcheck ${finished ? "done" : ""} ${locked ? "locked" : ""}`}
                      onClick={(e) => toggleDone(t, e)}
                      aria-label={locked ? "Conclua as sub-etapas primeiro" : "Concluir tarefa"}
                      title={locked ? "Conclua as sub-etapas primeiro" : "Concluir tarefa"}
                    >
                      {locked ? "🔒" : "✓"}
                    </button>
                    <span className="tem">{t.emoji ?? "•"}</span>
                    <div>
                      <div className="tt">{t.title}</div>
                      <div className="tm">
                        <span className={`sd ${t.sphere}`} />
                        {t.category ?? (t.sphere === "profissional" ? "Profissional" : "Pessoal")}
                      </div>
                    </div>
                    <span className="tr">{t.due_at ? "◆ " + fmtDue(t.due_at) : ""}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </>
      )}

      <button className="fab" onClick={() => setShowNew(true)} aria-label="Nova tarefa">
        +
      </button>
      {showNew && <NewTaskModal onClose={() => setShowNew(false)} />}
    </>
  );
}

function fmtDue(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
}