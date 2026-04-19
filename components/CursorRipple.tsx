"use client";

import { useEffect, useRef, useState } from "react";

interface Droplet {
  id: number;
  x: number;
  y: number;
}

export default function CursorRipple() {
  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const lastPos = useRef({ x: 0, y: 0 });
  const idCounter = useRef(0);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) return;

      lastPos.current = { x: e.clientX, y: e.clientY };
      const id = idCounter.current++;

      setDroplets((prev) => [...prev.slice(-14), { id, x: e.clientX, y: e.clientY }]);

      setTimeout(() => {
        setDroplets((prev) => prev.filter((d) => d.id !== id));
      }, 1200);
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  if (droplets.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{ mixBlendMode: "screen" }}
    >
      {droplets.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full animate-[ripple_1200ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
          style={{
            left: d.x,
            top: d.y,
            width: 8,
            height: 8,
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(232, 168, 124, 0.35) 0%, rgba(232, 168, 124, 0.15) 40%, transparent 70%)",
            filter: "blur(8px)",
          }}
        />
      ))}
    </div>
  );
}
