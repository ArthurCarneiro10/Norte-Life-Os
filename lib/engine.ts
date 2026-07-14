// ============================================================
// NORTE · motor determinístico (camada TS)
// Sem IA aqui. Isto é o que mantém o custo por usuário baixo:
// conflito, tempo líquido e janelas são matemática, não LLM.
// ============================================================

export interface Interval {
  start: Date;
  end: Date;
}

export interface Block extends Interval {
  id: string;
  title: string;
  sphere: "profissional" | "pessoal";
  isFixed: boolean;
}

const ms = (min: number) => min * 60_000;
const overlaps = (a: Interval, b: Interval) =>
  a.start < b.end && b.start < a.end;

/** Une intervalos que se sobrepõem (base do tempo líquido). */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );
  const out: Interval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) {
      if (cur.end > last.end) last.end = cur.end;
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/** Conflitos duros: dois eventos fixos que colidem (o card magenta). */
export function hardConflicts(blocks: Block[]): [Block, Block][] {
  const fixed = blocks.filter((b) => b.isFixed);
  const pairs: [Block, Block][] = [];
  for (let i = 0; i < fixed.length; i++)
    for (let j = i + 1; j < fixed.length; j++)
      if (overlaps(fixed[i], fixed[j])) pairs.push([fixed[i], fixed[j]]);
  return pairs;
}

/**
 * Janelas livres entre eventos fixos, dentro do intervalo acordado.
 * (Buscador de Janelas + Tempo Líquido.)
 */
export function freeWindows(
  fixed: Interval[],
  dayStart: Date,
  dayEnd: Date,
  minMinutes = 45
): Interval[] {
  const busy = mergeIntervals(
    fixed
      .map((b) => ({
        start: new Date(Math.max(b.start.getTime(), dayStart.getTime())),
        end: new Date(Math.min(b.end.getTime(), dayEnd.getTime())),
      }))
      .filter((b) => b.end > b.start)
  );

  const gaps: Interval[] = [];
  let cursor = dayStart;
  for (const b of busy) {
    if (b.start.getTime() - cursor.getTime() >= ms(minMinutes)) {
      gaps.push({ start: cursor, end: b.start });
    }
    if (b.end > cursor) cursor = b.end;
  }
  if (dayEnd.getTime() - cursor.getTime() >= ms(minMinutes)) {
    gaps.push({ start: cursor, end: dayEnd });
  }
  return gaps;
}

/** Minutos líquidos disponíveis no dia. */
export function tempoLiquido(windows: Interval[]): number {
  return Math.round(
    windows.reduce((acc, w) => acc + (w.end.getTime() - w.start.getTime()), 0) /
      60_000
  );
}

/**
 * Rankeia janelas pelo encaixe com o pico do cronotipo.
 * Janela dentro do pico pontua mais alto — é onde o Norte agenda o foco.
 */
export function rankByChronotype(
  windows: Interval[],
  peakStart: Date,
  peakEnd: Date
): Interval[] {
  const peak: Interval = { start: peakStart, end: peakEnd };
  const score = (w: Interval) => {
    const inter =
      Math.min(w.end.getTime(), peak.end.getTime()) -
      Math.max(w.start.getTime(), peak.start.getTime());
    const overlapMin = Math.max(0, inter) / 60_000;
    const lenMin = (w.end.getTime() - w.start.getTime()) / 60_000;
    return overlapMin * 2 + lenMin; // peso duplo para tempo dentro do pico
  };
  return [...windows].sort((a, b) => score(b) - score(a));
}

/**
 * Previsão de Entrega: compara trabalho restante estimado com o prazo.
 * `velocityMinPerDay` vem do histórico do usuário (v2); default razoável no v1.
 */
export function deliveryForecast(
  remainingMinutes: number,
  due: Date,
  now = new Date(),
  velocityMinPerDay = 180
): { daysNeeded: number; daysAvailable: number; compatible: boolean } {
  const daysNeeded = remainingMinutes / velocityMinPerDay;
  const daysAvailable =
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return {
    daysNeeded: Math.round(daysNeeded * 10) / 10,
    daysAvailable: Math.round(daysAvailable * 10) / 10,
    compatible: daysNeeded <= daysAvailable,
  };
}

/**
 * Alerta preditivo da cascata: se uma micro-etapa atrasa, o prazo final
 * herda o risco. Retorna as etapas que estão segurando a cadeia.
 */
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  dependsOn: string | null;
}
export function blockingSubtasks(subs: Subtask[]): Subtask[] {
  const byId = new Map(subs.map((s) => [s.id, s]));
  return subs.filter((s) => {
    if (s.done) return false;
    // segura a cadeia se algo depende dela (direta ou transitivamente)
    return subs.some((o) => !o.done && dependsOnChain(o, s.id, byId));
  });
}
function dependsOnChain(
  node: Subtask,
  targetId: string,
  byId: Map<string, Subtask>
): boolean {
  let cur: Subtask | undefined = node;
  const seen = new Set<string>();
  while (cur?.dependsOn && !seen.has(cur.dependsOn)) {
    if (cur.dependsOn === targetId) return true;
    seen.add(cur.dependsOn);
    cur = byId.get(cur.dependsOn);
  }
  return false;
}
