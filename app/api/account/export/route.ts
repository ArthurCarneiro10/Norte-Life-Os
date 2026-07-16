import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// LGPD art. 18, V — portabilidade: devolve tudo que é do usuário em JSON.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const [profile, tasks, subtasks, events, focus, alerts, briefings] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("tasks").select("*"),
    supabase.from("subtasks").select("*"),
    supabase.from("events").select("*"),
    supabase.from("focus_sessions").select("*"),
    supabase.from("task_alerts").select("*"),
    supabase.from("briefings").select("*"),
  ]);

  const payload = {
    exportado_em: new Date().toISOString(),
    conta: { id: user.id, email: user.email, criada_em: user.created_at },
    perfil: profile.data ?? null,
    tarefas: tasks.data ?? [],
    subetapas: subtasks.data ?? [],
    compromissos: events.data ?? [],
    sessoes_de_foco: focus.data ?? [],
    alertas: alerts.data ?? [],
    briefings: briefings.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="norte-meus-dados-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
