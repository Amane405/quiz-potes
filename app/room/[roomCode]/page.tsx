"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/supabase";

export default function RoomPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerId = searchParams.get("playerId");

  useEffect(() => {
    const roomCode = window.location.pathname.split("/").pop();
    if (!roomCode || !playerId) return;

    const fetchData = async () => {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomCode)
        .single();

      if (roomData) {
        setRoom(roomData);
        if (roomData.host_id === playerId) {
          setIsHost(true);
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
  }, [playerId]);

  const startGame = async () => {
    const roomCode = window.location.pathname.split("/").pop();
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

  const roomCode = window.location.pathname.split("/").pop();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <h1 className="text-4xl md:text-6xl font-black mb-4 text-green-400">
        MASTER BLAST! 💥
      </h1>

      <h2 className="text-xl md:text-2xl text-yellow-400 mb-8 font-bold">
        Mode ⚡ RAPIDE ({room?.total_questions || 10} questions)
      </h2>

      <div className="mb-8 text-center">
        <p className="text-green-300 mb-2 font-bold">Code du salon :</p>
        <div className="bg-black border-4 border-green-400 rounded-2xl py-6 px-12 inline-block">
          <p className="text-5xl md:text-7xl font-black text-green-400 tracking-widest">
            {roomCode}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md">
        <h3 className="text-2xl font-black text-green-400 mb-4 text-center">
          Joueurs connectés ({players.length})
        </h3>
        <div className="space-y-3">
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-black border-2 border-green-400 rounded-xl py-3 px-6 flex justify-between items-center"
            >
              <span className="text-xl font-bold text-green-400">{player.name}</span>
              {player.is_host && (
                <span className="text-yellow-400 font-black text-sm">HOST</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* BOUTON LANCER - Visible uniquement pour le host */}
      {isHost && players.length >= 1 && (
        <button
          onClick={startGame}
          className="mt-8 bg-yellow-400 text-black hover:bg-yellow-300 font-black py-4 px-12 rounded-xl text-2xl border-b-4 border-yellow-600 transition-all active:scale-95 shadow-[0_0_20px_rgba(250,204,21,0.5)]"
        >
          LANCER LE JEU 🚀
        </button>
      )}

      {!isHost && (
        <p className="mt-8 text-yellow-400 font-bold text-lg animate-pulse">
          En attente que le host lance le jeu...
        </p>
      )}
    </div>
  );
}