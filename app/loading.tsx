import { RiSkull2Line } from "@remixicon/react";

export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden font-mono text-zinc-100 select-none">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-950/30 via-zinc-950 to-black pointer-events-none" />

      {/* Creepy CRT Scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.4)_50%,rgba(0,0,0,0.4))] bg-[length:100%_4px] pointer-events-none opacity-40 z-10" />

      {/* Centerpiece Pulsing Content */}
      <div className="relative z-20 flex flex-col items-center gap-6">
        {/* Pulsing Glitch Skull */}
        <div className="relative">
          <div className="absolute inset-0 bg-purple-600/30 blur-xl rounded-full animate-ping" />
          <RiSkull2Line className="h-16 w-16 text-purple-500 animate-pulse relative z-10 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" />
        </div>

        {/* Eerie Loading Status Text */}
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-purple-400 font-semibold animate-pulse">
            Establishing Channel Link...
          </p>
          <p className="text-[11px] text-zinc-500 tracking-widest font-mono">
            [ syncing temporary payloads ]
          </p>
        </div>

        <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden border border-purple-950/60 relative">
          <div className="h-full bg-gradient-to-r from-purple-900 via-purple-500 to-emerald-500 w-1/2 animate-[ghost-slide_1.8s_infinite_ease-in-out]" />
        </div>
      </div>
    </div>
  );
}
