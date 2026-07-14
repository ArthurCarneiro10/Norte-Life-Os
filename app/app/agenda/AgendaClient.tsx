"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgendaEvent, Task } from "@/types/db";
import {
  freeWindows,
  tempoLiquido,
  rankByChronotype,
  type Interval,
} from "@/lib/engine";
import { EventModal } from "./EventModal";

interface Profile {
  wake_time: string | null;
  sleep_time: string | null;
  chronotype_start: string | null;
  chronotype_end: string | null;
}

const MIN_WINDOW = 45;

function atTime(day: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m || 0, 0, 0);
  return d;
}
const hhmm = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dur = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}` : `${min}min`;

export function AgendaClient() {
  const supabase = createClient();
  const [day, setDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const dayStart = day;
  const dayEnd = useMemo(() => {
    const d = new Date(day);
    d.setDate(d.getDate() + 1);
    return d;
  }, [day]);

  const loadDay = useCallback(async () => {
    setLoading(true);
    const [{ data: evs }, { data: tks }, { data: prof }] = await Promise.all([
      supabase
        .from("events")
        .select("*")
        .gte("starts_at", dayStart.toISOString())
        .lt("starts_at", dayEnd.toISOString())
        .order("starts_at"),
      supabase.from("tasks").select("*").neq("status", "finalizado"),
      supabase.from("profiles").select("wake_time,sleep_time,chronotype_start,chronotype_end").single(),
    ]);
    setEvents((evs as AgendaEvent[]) ?? []);
    setTasks((tks as Task[]) ?? []);
    setProfile((prof as Profile) ?? null);
    setLoading(false);
  }, [supabase, dayStart, dayEnd]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  // --- motor: janelas livres ---
  const wake = atTime(day, profile?.wake_time ?? "07:00");
  const sleep = atTime(day, profile?.sleep_time ?? "23:00");
  const busy: Interval[] = events.map((e) => ({
    start: new Date(e.starts_at),
    end: new Date(e.ends_at),
  }));
  const windows = freeWindows(busy, wake, sleep, MIN_WINDOW);
  const liquido = tempoLiquido(windows);

  // --- antecipar: tarefas com prazo futuro que cabem numa janela ---
  const peakStart = atTime(day, profile?.chronotype_start ?? "09:00");
  const peakEnd = atTime(day, profile?.chronotype_end ?? "11:00");
  const rankedWindows = rankByChronotype(windows, peakStart, peakEnd);
  const urgent = tasks
    .filter((t) => t.due_at && new Date(t.due_at) > dayEnd && !t.scheduled_event_id)
    .sort((a, b) => +new Date(a.due_at!) - +new Date(b.due_at!));
  const suggestions = rankedWindows
    .slice(0, 3)
    .map((w, i) => ({ window: w, task: urgent[i] }))
    .filter((s) => s.task);

  async function scheduleTask(task: Task, w: Interval) {
    const durMin = task.estimated_minutes
      ? Math.min(task.estimated_minutes, (w.end.getTime() - w.start.getTime()) / 60000)
      : Math.min(90, (w.end.getTime() - w.start.getTime()) / 60000);
    const s = w.start;
    const e = new Date(s.getTime() + durMin * 60000);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: ev } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        source: "norte",
        sphere: task.sphere,
        title: "Foco: " + task.title,
        starts_at: s.toISOString(),
        ends_at: e.toISOString(),
        is_fixed: false,
        status: "confirmed",
      })
      .select()
      .single();
    if (ev) await supabase.from("tasks").update({ scheduled_event_id: ev.id }).eq("id", task.id);
    loadDay();
  }

  const isToday = day.toDateString() === new Date().toDateString();
  const shiftDay = (n: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + n);
    setDay(d);
  };

  return (
    <div className="scroll">
      <div className="vhead">
        <div className="wm">
          <span className="tick" />
          NORTE
        </div>
        <div className="datestr">AGENDA</div>
      </div>

      {/* navegação de dia */}
      <div className="daynav">
        <button onClick={() => shiftDay(-1)} aria-label="Dia anterior">‹</button>
        <div className="daynav-label">
          {day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
          {isToday && <span className="today-dot">hoje</span>}
        </div>
        <button onClick={() => shiftDay(1)} aria-label="Próximo dia">›</button>
      </div>

      {!isToday && (
        <button className="hoje-btn" onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setDay(d); }}>
          ← voltar pra hoje
        </button>
      )}

      {loading ? (
        <p style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 20 }}>Carregando...</p>
      ) : (
        <>
          {/* tempo líquido */}
          <div className="liquido">
            <span className="mono">TEMPO LÍQUIDO</span>
            <span className="sep" />
            <b>{liquido >= 60 ? dur(liquido) : liquido + "min"} livres</b>
          </div>

          {/* antecipar */}
          {suggestions.length > 0 && (
            <>
              <div className="sec">💡 Dá pra adiantar<span className="rule" /></div>
              {suggestions.map((s, i) => (
                <div key={i} className="suggest">
                  <div className="suggest-body">
                    <div className="suggest-win">
                      Livre {hhmm(s.window.start)}–{hhmm(s.window.end)}
                    </div>
                    <div className="suggest-task">
                      {s.task.emoji ?? "•"} {s.task.title}
                      <span className="suggest-due">
                        prazo {new Date(s.task.due_at!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                  </div>
                  <button className="suggest-btn" onClick={() => scheduleTask(s.task, s.window)}>
                    Agendar
                  </button>
                </div>
              ))}
            </>
          )}

          {/* linha do dia */}
          <div className="sec">Linha do dia<span className="rule" /></div>
          {events.length === 0 ? (
            <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>
              Nenhum compromisso. Toque no <b>+</b> pra adicionar — aí o Norte calcula suas janelas livres.
            </p>
          ) : (
            <div className="tl">
              {events.map((e) => {
                const foco = !e.is_fixed;
                return (
                  <div key={e.id} className={`agev ${e.sphere} ${foco ? "foco" : ""}`}>
                    <div className="agev-time mono">
                      {hhmm(new Date(e.starts_at))}
                      <span>{hhmm(new Date(e.ends_at))}</span>
                    </div>
                    <div className="agev-body">
                      <div className="agev-title">{e.title}</div>
                      <div className="agev-tag">
                        {foco ? "Foco agendado" : e.sphere === "profissional" ? "Profissional" : "Pessoal"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* janelas livres */}
          {windows.length > 0 && (
            <>
              <div className="sec">Janelas livres<span className="rule" /></div>
              {windows.map((w, i) => (
                <div key={i} className="freewin">
                  <span className="freewin-time mono">
                    {hhmm(w.start)}–{hhmm(w.end)}
                  </span>
                  <span className="freewin-dur">
                    {dur(Math.round((w.end.getTime() - w.start.getTime()) / 60000))} livre
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <button className="fab" onClick={() => setShowNew(true)} aria-label="Novo compromisso">
        +
      </button>
      {showNew && <EventModal day={day} onClose={() => setShowNew(false)} onCreated={loadDay} />}
    </div>
  );
}
