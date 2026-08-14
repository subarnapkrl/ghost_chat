"use client";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { signOut } from "next-auth/react";
import {
  RiAddBoxLine,
  RiArrowRightBoxLine,
  RiLoader2Line,
  RiLogoutBoxLine,
  RiPriceTag2Line,
  RiRadio2Fill,
  RiRadio2Line,
  RiShieldCheckLine,
  RiSparkling2Line,
  RiUser2Line,
} from "@remixicon/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../@/components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription } from "../../components/ui/card";
import { Badge } from "../../@/components/ui/badge";

interface RoomListItem {
  id: string;
  name: string;
  createdAt: string;
  creatorChatName: string | null;
  memberCount: number;
  isMember: boolean;
}
export default function DashboardClient({ chatName }: { chatName: string }) {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [enteringRoomId, setEnteringRoomId] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (!res.ok) throw new Error("Failed to load rooms");
      const data = await res.json();
      setRooms(data.rooms);
      setError(null);
    } catch {
      const msg = "Could not load active channels. Link unstable.";
      setError("Could not load rooms. Try refreshing.");
      toast.error("Connection Error", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchOnMount() {
      try {
        const res = await fetch("/api/rooms");
        if (!res.ok) throw new Error("Failed to load rooms");
        const data = await res.json();
        if (isMounted) {
          setRooms(data.rooms);
        }
      } catch {
        if (isMounted) {
          setError("Could not load rooms. Try refreshing.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchOnMount();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const issue =
          data?.issues?.fieldErrors?.name?.[0] ??
          data?.error ??
          "Could not initialize room";
        setError(issue);
        toast.error("Creation Failed", { description: issue });
        setCreating(false);
        return;
      }
      toast.success("Channel Initialized", {
        description: `Redirecting to #${data.room.name}...`,
      });
      setNewRoomName("");
      setIsDialogOpen(false);
      router.push(`/rooms/${data.room.id}`);
    } catch {
      const msg = "Signal interruption. Room initialization failed.";
      setError(msg);
      toast.error("Error", { description: msg });
      setCreating(false);
    }
  }

  async function handleEnterRoom(room: RoomListItem) {
    setEnteringRoomId(room.id);
    setError(null);
    try {
      if (!room.isMember) {
        const res = await fetch(`/api/rooms/${room.id}/join`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json();
          const issue = data?.error ?? "Access Denied. Link failed.";
          setError(issue);
          toast.error("Access Denied", { description: issue });
          setEnteringRoomId(null);
          return;
        }

        toast.success("Joined channel", {
          description: `Access granted to #${room.name}`,
        });
      }
      router.push(`/rooms/${room.id}`);
    } catch {
      const msg = "Connection refused by remote host.";
      setError(msg);
      toast.error("Connection Failed", { description: msg });
      setEnteringRoomId(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h1 className="text-sm font-bold tracking-widest text-emerald-500 uppercase flex items-center gap-2">
                Ghost_Chat // Dashboard
              </h1>
            </div>
            <p className="text-xs text-zinc-400">
              operator ::{" "}
              <span className="text-zinc-100 font-semibold">{chatName}</span>
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast.info("Terminating session...");
              signOut({ callbackUrl: "/login" });
            }}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs gap-1.5 uppercase tracking-wider"
          >
            <RiLogoutBoxLine className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </header>

        {error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded border border-red-500/30 bg-red-500/10 text-red-400">
            <RiShieldCheckLine className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiRadio2Line className="h-4 w-4 text-purple-400 animate-pulse" />
            <h2 className="text-xs font-bold tracking-widest text-purple-400 uppercase">
              Active_Channels ({rooms.length})
            </h2>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger className="bg-purple-600 hover:bg-purple-500 text-zinc-950 font-bold text-xs uppercase tracking-wider gap-1.5 inline-flex items-center justify-center rounded-md px-3 py-1.5">
              <RiAddBoxLine className="h-4 w-4" />
              New Channel
            </DialogTrigger>

            <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 font-mono max-w-md">
              <form onSubmit={handleCreateRoom}>
                <DialogHeader>
                  <DialogTitle className="text-emerald-500 uppercase tracking-widest text-sm flex items-center gap-2">
                    <RiSparkling2Line className="h-4 w-4" />
                    Initialize Channel
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs">
                    Create a new secure channel on the Ghost_Chat network.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2">
                  <Input
                    placeholder="channel_identifier..."
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    maxLength={50}
                    autoFocus
                    disabled={creating}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-purple-500 font-mono text-sm"
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDialogOpen(false)}
                    className="text-zinc-400 hover:text-zinc-200 text-xs uppercase"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating || !newRoomName.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs uppercase tracking-wider"
                  >
                    {creating ? (
                      <>
                        <RiLoader2Line className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      "Initialize"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Card className="border-zinc-800 bg-zinc-950/50 p-8 text-center">
            <div className="flex flex-col items-center gap-2 text-zinc-500 text-xs">
              <RiLoader2Line className="h-5 w-5 animate-spin text-purple-500" />
              <span>Scanning frequencies...</span>
            </div>
          </Card>
        ) : rooms.length === 0 ? (
          <Card className="border-dashed border-zinc-800 bg-zinc-950/30 p-8 text-center">
            <CardDescription className="text-zinc-500 text-xs">
              No active channels detected. Initialize a new protocol channel
              above.
            </CardDescription>
          </Card>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <Card
                key={room.id}
                className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900/90 transition-colors"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <RiPriceTag2Line className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="font-bold text-sm text-zinc-100 truncate">
                        {room.name}
                      </span>
                      {room.isMember && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0"
                        >
                          Joined
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 flex items-center gap-2">
                      <span>
                        host ::{" "}
                        <strong className="font-normal text-zinc-300">
                          {room.creatorChatName ?? "unknown"}
                        </strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-zinc-400">
                        <RiUser2Line className="h-3 w-3 text-zinc-500" />
                        {room.memberCount}{" "}
                        {room.memberCount === 1 ? "signal" : "signals"}
                      </span>
                    </p>
                  </div>

                  <Button
                    onClick={() => handleEnterRoom(room)}
                    disabled={enteringRoomId === room.id}
                    size="sm"
                    variant={room.isMember ? "outline" : "default"}
                    className={
                      room.isMember
                        ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 text-xs font-bold tracking-wider uppercase"
                        : "bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs tracking-wider uppercase"
                    }
                  >
                    {enteringRoomId === room.id ? (
                      <>
                        <RiLoader2Line className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Connecting...
                      </>
                    ) : room.isMember ? (
                      <>
                        Enter
                        <RiArrowRightBoxLine className="ml-1.5 h-3.5 w-3.5" />
                      </>
                    ) : (
                      "Join + Enter"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
