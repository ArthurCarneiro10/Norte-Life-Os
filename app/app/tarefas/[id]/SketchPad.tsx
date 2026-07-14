"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SketchPad({
  taskId,
  initialSketch,
  initialNotes,
}: {
  taskId: string;
  initialSketch: string | null;
  initialNotes: string | null;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const inited = useRef(false);

  function init() {
    const cv = cvRef.current;
    if (!cv || inited.current) return;
    const rect = cv.getBoundingClientRect();
    if (!rect.width) return;
    cv.width = rect.width;
    cv.height = 170;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#33302B";
    ctx.lineWidth = 2.4;
    ctxRef.current = ctx;
    inited.current = true;
    if (initialSketch) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialSketch;
    }
  }

  useEffect(() => {
    if (open) setTimeout(init, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function pos(e: React.PointerEvent) {
    const r = cvRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent) {
    init();
    drawing.current = true;
    last.current = pos(e);
    cvRef.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current || !ctxRef.current || !last.current) return;
    const p = pos(e);
    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }
  async function up() {
    if (!drawing.current) return;
    drawing.current = false;
    const data = cvRef.current?.toDataURL("image/png") ?? null;
    await supabase.from("tasks").update({ sketch: data }).eq("id", taskId);
  }
  async function clear() {
    init();
    ctxRef.current?.clearRect(0, 0, cvRef.current!.width, cvRef.current!.height);
    await supabase.from("tasks").update({ sketch: null }).eq("id", taskId);
  }
  async function saveNotes() {
    await supabase.from("tasks").update({ notes: notes.trim() || null }).eq("id", taskId);
  }

  return (
    <div className={`accordion ${open ? "open" : ""}`}>
      <div className="acc-head" onClick={() => setOpen(!open)}>
        <span className="acc-tw">▶</span>✏️ Rascunho
      </div>
      <div className="acc-body">
        <div className="acc-inner">
          <textarea
            className="notes"
            placeholder="Notas livres..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />
          <div className="sketchwrap">
            <canvas
              ref={cvRef}
              className="sketch"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerLeave={up}
            />
            <div className="sketchbar">
              <span className="hint">Rabisque uma ideia sem sair da tarefa</span>
              <button className="clr" onClick={clear}>Limpar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
