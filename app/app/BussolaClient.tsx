"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AgendaEvent, Task } from "@/types/db";
import { freeWindows, tempoLiquido, rankByChronotype, type Interval } from "@/lib/engine";

interface Profile {
  name: string | null;
  north: string | null;
  wake_time: string | null;
  sleep_time: string | null;
  chronotype_start: string | null;
  chronotype_end: string | null;
}

const PRANK: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
const hhmm = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m}min`);
function atTime(day: Date, t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

export function BussolaClient() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const briefingAsked = useRef(false);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const ds = new Date(now); ds.setHours(0, 0, 0, 0);
      const de = new Date(ds); de.setDate(de.getDate() + 1);
      const [{ data: prof }, { data: evs }, { data: tks }] = await Promise.all([
        supabase.from("profiles").select("name,north,wake_time,sleep_time,chronotype_start,chronotype_end").single(),
        supabase.from("events").select("*").gte("starts_at", ds.toISOString()).lt("starts_at", de.toISOString()).order("starts_at"),
        supabase.from("tasks").select("*").neq("status", "finalizado"),
      ]);
      setProfile((prof as Profile) ?? null);
      setEvents((evs as AgendaEvent[]) ?? []);
      setTasks((tks as Task[]) ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const hour = now.getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const name = (profile?.name ?? "piloto").split(" ")[0];
  const nameCap = name.charAt(0).toUpperCase() + name.slice(1);

  // janelas + pico
  const wake = atTime(today, profile?.wake_time ?? "07:00");
  const sleep = atTime(today, profile?.sleep_time ?? "23:00");
  const busy: Interval[] = events.map((e) => ({ start: new Date(e.starts_at), end: new Date(e.ends_at) }));
  const windows = freeWindows(busy, wake, sleep, 45);
  const liquido = tempoLiquido(windows);
  const peakStart = atTime(today, profile?.chronotype_start ?? "09:00");
  const peakEnd = atTime(today, profile?.chronotype_end ?? "11:00");
  const bestWindow = rankByChronotype(windows, peakStart, peakEnd)[0];

  // norte de hoje: tarefa mais importante
  const ranked = [...tasks].sort((a, b) => {
    const pr = (PRANK[a.priority] ?? 1) - (PRANK[b.priority] ?? 1);
    if (pr !== 0) return pr;
    const ad = a.due_at ? +new Date(a.due_at) : Infinity;
    const bd = b.due_at ? +new Date(b.due_at) : Infinity;
    return ad - bd;
  });
  const norte = ranked[0];

  // custo de oportunidade: vencendo hoje/amanhã x tempo livre
  const dueSoon = tasks.filter((t) => t.due_at && new Date(t.due_at) < tomorrow);
  const neededMin = dueSoon.reduce((a, t) => a + (t.estimated_minutes ?? 60), 0);
  const overloaded = dueSoon.length > 0 && neededMin > liquido;

  // briefing narrado por IA (gerado 1x/dia; degrada se não houver API key)
  useEffect(() => {
    if (loading || briefingAsked.current) return;
    briefingAsked.current = true;
    setBriefingLoading(true);
    fetch("/api/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameCap,
        norte: norte?.title ?? null,
        window: bestWindow ? `${hhmm(bestWindow.start)}–${hhmm(bestWindow.end)}` : null,
        eventsCount: events.length,
        liquido: dur(liquido),
        overload: overloaded,
        dueSoonCount: dueSoon.length,
        needed: dur(neededMin),
      }),
    })
      .then((r) => r.json())
      .then((d) => { if (d?.text) setBriefing(d.text); })
      .catch(() => {})
      .finally(() => setBriefingLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) {
    return (
      <div className="scroll">
        <p style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 20 }}>Carregando seu dia...</p>
      </div>
    );
  }

  return (
    <div className="scroll">
      <div className="vhead">
        <div className="wm"><span className="tick" />NORTE</div>
        <div className="datestr">
          {today.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase()}
        </div>
      </div>

      <h1 className="greeting">
        {greet}, {nameCap}.<br />
        <span className="soft">{norte ? "Você tem um norte claro hoje." : "Um dia em aberto pela frente."}</span>
      </h1>

      {(briefing || briefingLoading) && (
        <div className="briefing-ai">
          {briefing ? (
            <p>{briefing}</p>
          ) : (
            <p className="briefing-loading">✦ Preparando seu briefing...</p>
          )}
        </div>
      )}

      {windows.length > 0 && (
        <div className="statusline">
          <span className="d" />
          {dur(liquido)} livres · {events.length} compromisso{events.length !== 1 ? "s" : ""}
        </div>
      )}

      {profile && !profile.chronotype_start && (
        <Link href="/app/onboarding" className="calib-banner">
          ✦ Calibre seu Norte em 1 min — deixa o briefing mais preciso →
        </Link>
      )}

      {/* SEU NORTE HOJE */}
      {norte ? (
        <>
          <div className="sec">Seu norte hoje<span className="rule" /></div>
          <Link href={`/app/tarefas/${norte.id}`} className="north">
            <div className="kicker">Prioridade de hoje</div>
            <h2>{norte.emoji ? norte.emoji + " " : ""}{norte.title}</h2>
            {bestWindow && (
              <span className="win">◔ Melhor foco: {hhmm(bestWindow.start)}–{hhmm(bestWindow.end)}</span>
            )}
            {norte.due_at && (
              <p className="why">
                Prazo {new Date(norte.due_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                {" · "}prioridade {norte.priority}.
              </p>
            )}
          </Link>
        </>
      ) : (
        <>
          <div className="sec">Seu norte hoje<span className="rule" /></div>
          <Link href="/app/tarefas" className="north empty">
            <h2>Nenhuma prioridade definida.</h2>
            <p className="why">Adicione uma tarefa e o Norte começa a te orientar. →</p>
          </Link>
        </>
      )}

      {/* ROTA DO DIA */}
      <div className="sec">Rota do dia<span className="rule" /></div>
      {events.length === 0 ? (
        <Link href="/app/agenda" className="soft-cta">Nenhum compromisso hoje. Adicionar na agenda →</Link>
      ) : (
        <div className="day-route">
          {events.map((e) => (
            <div key={e.id} className={`rstop ${e.sphere} ${!e.is_fixed ? "foco" : ""}`}>
              <div className="rtime">{hhmm(new Date(e.starts_at))}</div>
              <div className="rnode" />
              <div className="rbody">
                <div className="rtitle">{e.title}</div>
                <div className="rmeta">{!e.is_fixed ? "Foco agendado" : e.sphere === "profissional" ? "Profissional" : "Pessoal"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CUSTO DE OPORTUNIDADE */}
      {overloaded && (
        <div className="oppcost">
          <div className="oppcost-head">⚠ Realidade do dia</div>
          <p>
            Você tem <b>{dueSoon.length} tarefa{dueSoon.length !== 1 ? "s" : ""}</b> vencendo até amanhã (~{dur(neededMin)} de
            trabalho), mas só <b>{dur(liquido)}</b> livres hoje. Vale adiar algo ou proteger seu bloco de foco antes que o dia decida por você.
          </p>
          <Link href="/app/agenda" className="oppcost-btn">Ver janelas na agenda</Link>
        </div>
      )}
    </div>
  );
}
