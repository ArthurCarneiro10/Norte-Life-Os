import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Modelo barato para narração — o motor faz o trabalho pesado, o LLM só narra.
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM = `Você é o Norte, um copiloto de vida — não um app de produtividade que grita motivação.
Escreva o briefing matinal do usuário em português do Brasil, em 2 a 3 frases curtas, tom calmo, direto e humano.
Cumprimente pelo nome. Oriente o dia em torno da prioridade única e da melhor janela de foco.
Se houver sobrecarga, diga com honestidade e sugira proteger o essencial — sem alarmismo nem culpa.
Use no máximo um ponto de exclamação. Não invente nada além dos dados fornecidos.
Responda apenas com o briefing, sem preâmbulo nem aspas.`;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const ctx = await req.json();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayStr = today.toISOString().slice(0, 10);

  // cache: já existe briefing de hoje?
  const { data: cached } = await supabase
    .from("briefings")
    .select("text")
    .eq("user_id", user.id)
    .eq("day", dayStr)
    .maybeSingle();
  if (cached?.text) return NextResponse.json({ text: cached.text, cached: true });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" });

  const userMsg = [
    `Dados de hoje para ${ctx.name ?? "o piloto"}:`,
    `- Prioridade principal: ${ctx.norte ?? "nenhuma definida"}`,
    `- Melhor janela de foco: ${ctx.window ?? "não calculada"}`,
    `- Compromissos hoje: ${ctx.eventsCount ?? 0}`,
    `- Tempo livre: ${ctx.liquido ?? "—"}`,
    ctx.overload
      ? `- Sobrecarga: sim — ${ctx.dueSoonCount} tarefa(s) vencendo, ~${ctx.needed} de trabalho para ${ctx.liquido} livres.`
      : `- Sobrecarga: não.`,
    ``,
    `Escreva o briefing matinal.`,
  ].join("\n");

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: SYSTEM,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    const data = await resp.json();
    const text: string =
      (data?.content ?? [])
        .map((b: { type: string; text?: string }) => (b.type === "text" ? b.text ?? "" : ""))
        .join("")
        .trim() || "";
    if (!text) return NextResponse.json({ error: "empty" });

    await supabase.from("briefings").insert({ user_id: user.id, day: dayStr, text });
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "api_failed" });
  }
}
