"use client";

import { useState, useSyncExternalStore } from "react";

interface Ghost {
  id: number;
  top: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

function generateGhosts(): Ghost[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: i,
    top: Math.floor(Math.random() * 90),
    left: Math.floor(Math.random() * 90),
    size: Math.floor(Math.random() * 40) + 40,
    duration: Math.floor(Math.random() * 10) + 12,
    delay: Math.floor(Math.random() * 5),
    opacity: Math.random() * 0.35 + 0.15,
  }));
}

const emptySubscribe = () => () => {};

export function FloatingGhosts() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [ghosts] = useState<Ghost[]>(generateGhosts);

  if (!isClient) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {ghosts.map((ghost) => (
        <img
          key={ghost.id}
          src="/ghost.png"
          alt=""
          aria-hidden="true"
          className="absolute animate-ghost-float filter drop-shadow-[0_0_12px_rgba(168,85,247,0.3)] select-none"
          style={{
            top: `${ghost.top}%`,
            left: `${ghost.left}%`,
            width: `${ghost.size}px`,
            opacity: ghost.opacity,
            animationDuration: `${ghost.duration}s`,
            animationDelay: `${ghost.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
