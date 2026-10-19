"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function RoomPage({ params }: { params: { roomCode: string } }) {
  const [players, setPlayers] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const roomCode = params.roomCode;
  const playerId = typeof window !== "undefined" 
    ? new URLSearchParams(window.location.search).get("playerId") 
    : null;

  useEffect(() => {
    if (!roomCode || !playerId) return;

    const fetchData = async () => {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomCode)
        .single();

      if (roomData) {
        setRoom(roomData);
        // Si le jeu a commencé, rediriger vers game
        if (roomData.status === "playing") {
          router.push(`/room/${roomCode}/game?playerId=${playerId}`);
          return;
        }
      }

      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomCode);

      if (playersData) setPlayers(playersData);
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [roomCode, playerId, router]);

  const startGame = async () => {
    if (!roomCode) return;

    await supabase
      .from("rooms")
      .update({ status: "playing" })
      .eq("id", roomCode);

    router.push(`/room/${roomCode}/game?playerId=${playerId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white">
        <p className="text-2xl font-bold text-green-400 animate-pulse">Chargement...</p>
      </div>
    );
  }

  const isHost = room?.host_id === playerId;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <h1 className="text-4xl md:text-6xl font