import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/types/db";
import { TaskList } from "./TaskList";

export const dynamic = "force-dynamic";

export default async function TarefasPage() {
  const supabase = createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="scroll">
      <div className="vhead">
        <div className="wm">
          <span className="tick" />
          NORTE
        </div>
        <div className="datestr">TAREFAS</div>
      </div>
      <TaskList tasks={(tasks as Task[]) ?? []} />
    </div>
  );
}
