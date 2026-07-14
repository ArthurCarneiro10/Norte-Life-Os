import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Task, Subtask } from "@/types/db";
import { CardClient } from "./CardClient";

export const dynamic = "force-dynamic";

export default async function CardPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!task) notFound();

  const { data: subtasks } = await supabase
    .from("subtasks")
    .select("*")
    .eq("task_id", params.id)
    .order("position", { ascending: true });

  return (
    <div className="scroll">
      <CardClient task={task as Task} initialSubtasks={(subtasks as Subtask[]) ?? []} />
    </div>
  );
}
