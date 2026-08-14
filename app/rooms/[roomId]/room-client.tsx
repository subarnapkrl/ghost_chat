"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "../../../lib/socket-client";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiArrowUpSLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiDeleteBin2Line,
  RiEyeLine,
  RiFireLine,
  RiHashtag,
  RiLoader2Line,
  RiSendPlane2Fill,
  RiShieldCheckLine,
  RiSkull2Line,
  RiTerminalBoxLine,
  RiTimeLine,
  RiWifiOffLine,
} from "@remixicon/react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../@/components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../@/components/ui/select";
import { Switch } from "../../../@/components/ui/switch";
import { formatRelativeTime } from "../../../lib/format-time";

interface Message {
  id: string;
  roomId: string;
  userId: string;
  status: "active" | "expired" | "burned";
  burnAfterRead: boolean;
  createdAt: string;
  expiresAt: string;
  readAt: string | null;
  readBy: string[];
  content: string | null;
  masked?: boolean;
  chatName?: string;
}

interface Paricle {
  tx: number;
  ty: number;
  rot: number;
  color: string;
}
const SLIME_COLORS = ["#6dff3f", "#3f9c26", "#a8ff7a", "#2b662f"];
const PURPLE_COLORS = ["#b24bff", "#7a30b3", "#dcb2ff", "#5c2489"];
const BURST_DURATION_MS = 650;

function generateParticles(colors: string[]): Paricle[] {
  return Array.from({ length: 14 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 40;
    return {
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      rot: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  });
}
function ttlOpacity(msg: Message): number {
  const created = new Date(msg.createdAt).getTime();
  const expires = new Date(msg.expiresAt).getTime();
  const total = expires - created;
  if (total <= 0) return 0;
  const remaining = expires - Date.now();
  return Math.max(0.2, Math.min(1, remaining / total));
}

export default function RoomClient({
  roomId,
  roomName,
  chatName,
  currentUserId,
}: {
  roomId: string;
  roomName: string;
  chatName: string;
  currentUserId: string;
}) {
  const router = useRouter();

  const [connStatus, setConnStatus] = useState<
    "connecting" | "joined" | "error"
  >("connecting");
  const [connError, setConnError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [draft, setDraft] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState(300);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [particlesMap, setParticlesMap] = useState<Record<string, Paricle[]>>(
    {},
  );
  const [bursting, setBursting] = useState<Record<string, "slime" | "purple">>(
    {},
  );
  const receiptedRef = useRef<Set<string>>(new Set());
  const localExpiredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    fetch(`/api/rooms/${roomId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setNextCursor(data.nextCursor ?? null);
      })
      .catch(() => toast.error("Failed to retrieve message logs"))
      .finally(() => setLoadingHistory(false));
  }, [roomId]);

  function triggerBurst(id: string, kind: "slime" | "purple") {
    setParticlesMap((prev) => {
      if (prev[id]) return prev;
      return {
        ...prev,
        [id]: generateParticles(
          kind === "slime" ? SLIME_COLORS : PURPLE_COLORS,
        ),
      };
    });

    setBursting((prev) => ({ ...prev, [id]: kind }));
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status: kind === "slime" ? "expired" : "burned",
              content: null,
            }
          : m,
      ),
    );
    setTimeout(() => {
      setParticlesMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      setBursting((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, BURST_DURATION_MS);
  }

  useEffect(() => {
    const socket = getSocket();

    function joinRoom() {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        setConnStatus("error");
        setConnError("Server did not respond to room join - check the server");
      }, 8000);

      socket.emit(
        "room:join",
        roomId,
        (res: { ok: boolean; error?: string }) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);

          if (res.ok) {
            setConnStatus("joined");
            toast.success("Channel Link Established", {
              description: `Connected to #${roomName}`,
            });
          } else {
            const errMsg = res.error ?? "Could not join room";
            setConnStatus("error");
            setConnError(errMsg);
            toast.error("Handshake Failed", { description: errMsg });
          }
        },
      );
    }
    function onConnect() {
      console.log("[socket] connect event fired, id:", socket.id);
      joinRoom();
    }

    if (socket.connected) {
      console.log("[socket] already connected, joining room directly");
      joinRoom();
    } else {
      console.log("[socket] not yet connected, waiting for connect event");
      socket.on("connect", joinRoom);
    }

    function onNew(msg: Message) {
      if (msg.roomId !== roomId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    }

    function onExpired({ id, roomId: rid }: { id: string; roomId: string }) {
      if (rid !== roomId) return;
      triggerBurst(id, "slime");
    }
    function onBurned({ id, roomId: rid }: { id: string; roomId: string }) {
      if (rid !== roomId) return;
      triggerBurst(id, "purple");
    }
    function onRead({
      id,
      roomId: rid,
      readAt,
    }: {
      id: string;
      roomId: string;
      readAt: string;
    }) {
      if (rid !== roomId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, readAt } : m)),
      );
    }
    function onReceipt({
      id,
      roomId: rid,
      readBy,
    }: {
      id: string;
      roomId: string;
      readBy: string[];
    }) {
      if (rid !== roomId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, readBy } : m)),
      );
    }

    function onConnectError(err: Error) {
      const errMsg =
        err.message === "unauthorized"
          ? "Session expired — sign in again"
          : err.message;
      setConnStatus("error");
      setConnError(errMsg);
      toast.error("Socket Connection Lost", { description: errMsg });
    }
    socket.on("connect", onConnect);
    socket.on("message:new", onNew);
    socket.on("message:expired", onExpired);
    socket.on("message:burned", onBurned);
    socket.on("message:read", onRead);
    socket.on("connect_error", onConnectError);
    socket.on("message:receipt", onReceipt);
    return () => {
      socket.emit("room:leave", roomId);
      socket.off("connect", onConnect);
      socket.off("message:new", onNew);
      socket.off("message:expired", onExpired);
      socket.off("message:burned", onBurned);
      socket.off("message:read", onRead);
      socket.off("connect_error", onConnectError);
      socket.off("message:receipt", onReceipt);
    };
  }, [roomId, roomName]);
  useEffect(() => {
    const checkExpiry = () => {
      const currentTime = Date.now();

      messages.forEach((msg) => {
        if (msg.status === "active" && !localExpiredRef.current.has(msg.id)) {
          const expiresTime = new Date(msg.expiresAt).getTime();

          if (expiresTime <= now) {
            localExpiredRef.current.add(msg.id);
            triggerBurst(msg.id, msg.burnAfterRead ? "purple" : "slime");
          }
        }
      });
    };

    const interval = setInterval(checkExpiry, 500);
    return () => clearInterval(interval);
  }, [messages, now]);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const toReceipt = messages.filter(
      (m) =>
        m.status === "active" &&
        !m.masked &&
        m.userId !== currentUserId &&
        !(m.readBy ?? []).includes(currentUserId) &&
        !receiptedRef.current.has(m.id),
    );
    if (toReceipt.length === 0) return;

    const timer = setTimeout(() => {
      toReceipt.forEach((m) => {
        receiptedRef.current.add(m.id);
        fetch(`/api/messages/${m.id}/receipt`, { method: "POST" }).catch(() => {
          receiptedRef.current.delete(m.id);
        });
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [messages, currentUserId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setSendError(null);
    const clientMessageId = crypto.randomUUID();

    try {
      const res = await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientMessageId,
          content: draft.trim(),
          ttlSeconds,
          burnAfterRead,
        }),
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const msg = retryAfter
          ? `Slow down — try again in ${retryAfter}s`
          : "Slow down — you're sending too fast";
        setSendError(msg);
        setSending(false);
        toast.error("Rate limited", { description: msg });
        return;
      }
      const data = await res.json();

      if (!res.ok) {
        setSendError(data?.error ?? "Could not send message");
        setSending(false);
        toast.error("Transmission Failed", { description: data?.error });
        return;
      }

      setDraft("");
      setSending(false);
    } catch {
      setSendError("Could not send message. Try again.");
      setSending(false);
      toast.error("Server problem. Try again after few minutes.");
    }
  }

  async function handleReveal(messageId: string) {
    try {
      const res = await fetch(`/api/messages/${messageId}/read`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to reveal payload");
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: data.content,
                masked: false,
                readAt: data.readAt ?? m.readAt,
              }
            : m,
        ),
      );
    } catch {
      toast.error("Decryption failed. Retry payload access.");
    }
  }

  async function loadOlderMessages() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/rooms/${roomId}/messages?cursor=${encodeURIComponent(nextCursor)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...(data.messages ?? []), ...prev]);
        setNextCursor(data.nextCursor ?? null);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  function ttlFraction(msg: Message, currentTime: number): number {
    const created = new Date(msg.createdAt).getTime();
    const expires = new Date(msg.expiresAt).getTime();
    const total = expires - created;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, (expires - currentTime) / total));
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-mono p-4 md:p-6 flex flex-col justify-between max-w-3xl mx-auto h-screen">
      {/* Header HUD */}
      <header className="space-y-3 border-b border-zinc-800 pb-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 text-xs gap-1.5 uppercase tracking-wider -ml-2"
        >
          <RiArrowLeftLine className="h-3.5 w-3.5" />
          Back to Rooms
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <RiHashtag className="h-5 w-5 text-emerald-500 shrink-0" />
              <h1
                data-testid="room-name-heading"
                className="text-base font-bold tracking-widest text-emerald-500 uppercase"
              >
                {roomName}
              </h1>
            </div>
            <p className="text-xs text-zinc-400">
              identity ::{" "}
              <span className="text-zinc-100 font-semibold">{chatName}</span>
            </p>
          </div>

          {/* Connection Badge */}
          <Badge
            data-testid="room-status-badge"
            data-status={connStatus}
            variant="outline"
            className={`text-xs px-2.5 py-1 gap-1.5 uppercase tracking-wider shrink-0 ${
              connStatus === "joined"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : connStatus === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-400"
            }`}
          >
            {connStatus === "joined" && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live
              </>
            )}

            {connStatus === "connecting" && (
              <>
                <RiLoader2Line className="h-3 w-3 animate-spin" />
                Connecting...
              </>
            )}

            {connStatus === "error" && (
              <>
                <RiWifiOffLine className="h-3 w-3" />
                Error
              </>
            )}
          </Badge>
        </div>

        {connError && (
          <div className="flex items-center gap-2 p-2.5 text-xs rounded border border-red-500/30 bg-red-500/10 text-red-400">
            <RiShieldCheckLine className="h-4 w-4 shrink-0" />
            <span>{connError}</span>
          </div>
        )}
      </header>

      {/* Main Message Stream */}
      <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 flex flex-col">
        {/* Pagination Trigger */}
        {nextCursor && !loadingHistory && (
          <Button
            type="button"
            data-testid="load-older-messages"
            onClick={loadOlderMessages}
            disabled={loadingMore}
            variant="outline"
            className="w-full py-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/40 text-zinc-400 hover:text-emerald-400 text-xs gap-2 transition-all my-2"
          >
            {loadingMore ? (
              <RiLoader2Line className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RiArrowUpSLine className="h-3.5 w-3.5" />
            )}
            <span>
              {loadingMore
                ? "Fetching previous logs..."
                : "Load older messages"}
            </span>
          </Button>
        )}

        {/* Skeleton Loader */}
        {loadingHistory ? (
          <div
            data-testid="message-history-skeleton"
            className="flex flex-col gap-3 py-4"
          >
            {[0.7, 0.45, 0.6].map((w, i) => (
              <div
                key={i}
                className={`space-y-1.5 ${i % 2 === 0 ? "self-start" : "self-end"}`}
              >
                <div className="h-2 w-16 bg-zinc-800 rounded animate-pulse" />
                <div
                  className="h-9 bg-zinc-900 border border-zinc-800 rounded animate-pulse"
                  style={{ width: `${w * 280}px` }}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          /* Empty Room State */
          <div
            data-testid="empty-room-state"
            className="flex flex-col items-center justify-center my-auto py-12 text-center text-zinc-500 gap-2 border border-dashed border-zinc-800 rounded-lg p-6"
          >
            <RiTerminalBoxLine className="h-8 w-8 text-zinc-700" />
            <p className="text-xs text-zinc-300 font-semibold">
              Nothing here yet
            </p>
            <p className="text-[11px] text-zinc-500">
              Say something before it rots
            </p>
          </div>
        ) : (
          /* Render Message List */
          messages.map((msg) => {
            const isOwn = msg.userId === currentUserId;
            const burstKind = bursting[msg.id];
            const particles = particlesMap[msg.id]; // Read pure state snapshot
            const otherReaders =
              msg.readBy?.filter((id) => id !== currentUserId) ?? [];

            const pct = ttlFraction(msg, now);
            const isCritical = pct < 0.2;

            return (
              <div
                key={msg.id}
                className={`max-w-[85%] space-y-1 message-entering ${
                  isOwn ? "self-end" : "self-start"
                }`}
              >
                {/* Meta header */}
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 tracking-wider uppercase">
                  <span className="text-emerald-400/90 font-semibold">
                    {msg.chatName ?? "member"}
                  </span>
                  <span>·</span>
                  <span title={new Date(msg.createdAt).toLocaleString()}>
                    {formatRelativeTime(msg.createdAt)}
                  </span>
                </div>

                {/* Expired Message State */}
                {msg.status === "expired" && !burstKind && (
                  <div
                    data-testid={`message-expired-${msg.id}`}
                    className="p-2.5 border border-dashed border-zinc-800 bg-zinc-900/30 rounded text-xs text-zinc-600 flex items-center gap-2"
                  >
                    <RiDeleteBin2Line className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                    <span>✕ Message expired</span>
                  </div>
                )}

                {/* Burned Message State */}
                {msg.status === "burned" && !burstKind && (
                  <div
                    data-testid={`message-burned-${msg.id}`}
                    className="p-2.5 border border-dashed border-purple-900/40 bg-purple-950/20 rounded text-xs text-purple-400/70 flex items-center gap-2"
                  >
                    <RiFireLine className="h-3.5 w-3.5 text-purple-400/80 shrink-0" />
                    <span>☠ Burned after reading</span>
                  </div>
                )}

                {/* Masked Payload (Waiting for Reveal) */}
                {msg.status === "active" && msg.masked && !burstKind && (
                  <button
                    type="button"
                    data-testid={`message-masked-${msg.id}`}
                    onClick={() => handleReveal(msg.id)}
                    className="w-full text-left p-3 border border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/40 rounded text-xs text-purple-300 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <RiSkull2Line className="h-4 w-4 text-purple-400 group-hover:animate-bounce" />
                      <span>☠ Tap to reveal — burns after reading</span>
                    </div>
                    <RiEyeLine className="h-3.5 w-3.5 text-purple-400 opacity-70 group-hover:opacity-100" />
                  </button>
                )}

                {/* Visible Active Content */}
                {msg.status === "active" && !msg.masked && (
                  <div className="relative space-y-1.5">
                    <Card
                      data-testid={`message-bubble-${msg.id}`}
                      className={`border-zinc-800 bg-zinc-900/80 text-zinc-100 shadow-md ${
                        burstKind ? "bubble-dissolving" : ""
                      }`}
                      style={{
                        opacity: burstKind ? undefined : ttlOpacity(msg),
                        transition: "opacity 1s linear",
                      }}
                    >
                      <CardContent className="p-3 text-xs leading-relaxed break-words flex items-start justify-between gap-2">
                        <span>{msg.content}</span>
                        {msg.burnAfterRead && (
                          <span className="text-purple-400 shrink-0 mt-0.5 text-[11px]">
                            ☠
                          </span>
                        )}
                      </CardContent>
                    </Card>

                    {/* Particle Disintegration Canvas */}
                    {particles && (
                      <div
                        data-testid={`message-burst-${msg.id}`}
                        className="absolute inset-0 pointer-events-none"
                      >
                        {particles.map((p, i) => (
                          <div
                            key={i}
                            className="burst-particle absolute left-1/2 top-1/2"
                            style={{
                              background: p.color,
                              // @ts-expect-error custom variables consumed by CSS keyframes
                              "--tx": `${p.tx}px`,
                              "--ty": `${p.ty}px`,
                              "--rot": `${p.rot}deg`,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Dynamic Decay Progress Bar */}
                    {!burstKind && (
                      <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                        <div
                          className={`h-full transition-all duration-1000 ease-linear ${
                            isCritical ? "bg-red-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </div>
                    )}

                    {/* Read Receipts Indicator */}
                    {isOwn && !burstKind && (
                      <div
                        data-testid={`message-ticks-${msg.id}`}
                        data-tick-state={
                          otherReaders.length > 0 ? "read" : "sent"
                        }
                        title={otherReaders.length > 0 ? "Read" : "Sent"}
                        className={`flex items-center justify-end text-[11px] gap-0.5 ${
                          otherReaders.length > 0
                            ? "text-sky-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {otherReaders.length > 0 ? (
                          <RiCheckDoubleLine className="h-3.5 w-3.5" />
                        ) : (
                          <RiCheckLine className="h-3 w-3" />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Composer & Controls */}
      <form
        onSubmit={handleSend}
        className="space-y-3 border-t border-zinc-800 pt-3 shrink-0"
      >
        <div className="flex items-center gap-2">
          <Input
            type="text"
            data-testid="message-composer-input"
            placeholder="say something before it rots..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            className="flex-1 bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500 text-xs font-mono placeholder:text-zinc-600 h-9"
          />
          <Button
            type="submit"
            data-testid="message-send-button"
            disabled={sending || !draft.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-xs h-9 px-4 gap-1.5 shrink-0"
          >
            {sending ? (
              <RiLoader2Line className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <RiSendPlane2Fill className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>

        {/* HUD Controls */}
        <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/50 p-2 rounded border border-zinc-800/80">
          <div className="flex items-center gap-4">
            {/* TTL Dropdown */}
            <div className="flex items-center gap-2">
              <RiTimeLine className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider">
                TTL:
              </span>
              <Select
                value={String(ttlSeconds)}
                onValueChange={(val) => setTtlSeconds(Number(val))}
              >
                <SelectTrigger
                  data-testid="ttl-select"
                  className="w-[80px] h-7 bg-zinc-900 border-zinc-800 text-[11px] focus:ring-emerald-500"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 font-mono text-xs">
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="60">1m</SelectItem>
                  <SelectItem value="300">5m</SelectItem>
                  <SelectItem value="3600">1h</SelectItem>
                  <SelectItem value="86400">1d</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Burn-After-Read Toggle */}
            <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
              <Switch
                id="burn-after-read"
                data-testid="burn-after-read-toggle"
                checked={burnAfterRead}
                onCheckedChange={setBurnAfterRead}
                className="data-[state=checked]:bg-purple-600 scale-75"
              />
              <label
                htmlFor="burn-after-read"
                className="text-[11px] text-zinc-400 cursor-pointer flex items-center gap-1 hover:text-zinc-200 transition-colors"
              >
                <RiFireLine className="h-3 w-3 text-purple-400" />
                <span>Burn after read</span>
              </label>
            </div>
          </div>
        </div>

        {sendError && (
          <p className="text-red-400 text-xs font-mono">{sendError}</p>
        )}
      </form>
    </main>
  );
}
