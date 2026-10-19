"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function RoomPage({ params }: { params: { roomCode: string } }) {
  const [players, setPlayers] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const router = useRouter();

  const roomCode = params.roomCode;
  
  const playerId = typeof window !== "undefined" 
    ? (new URLSearchParams(window.location.search).get("playerId") || localStorage.getItem("userId"))
    : null;

  useEffect(() => {
    if (!roomCode || !playerId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomCode)
          .single();

        if (roomError) {
          console.error(" Erreur room:", roomError);
          setLoading(false);
          return;
        }

        if (roomData) {
          setRoom(roomData);
          
          // ✅ Comparaison avec playerId (URL) ET userId (localStorage)
          const userId = localStorage.getItem("userId");
          const hostCheck = roomData.host_id === playerId || roomData.host_id === userId;
          setIsHost(hostCheck);
          
          console.log("🔍 host_id:", roomData.host_id);
          console.log("🔍 playerId (URL):", playerId);
          console.log("🔍 userId (localStorage):", userId);
          console.log("🔍 isHost:", hostCheck);
          
          if (roomData.status === "playing") {
            router.push(`/room/${roomCode}/game?playerId=${playerId}`);
            return;
          }
        }

        const { data: playersData } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomCode)
          .order("joined_at", { ascending: true });

        if (playersData) setPlayers(playersData);
        setLoading(false);
      } catch (err) {
        console.error(" Erreur:", err);
        setLoading(false);
      }
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

  const quitRoom = async () => {
    if (!roomCode || !playerId) return;

    const userId = localStorage.getItem("userId");
    const confirmMsg = isHost 
      ? "Tu es l'hôte. Si tu quittes, le joueur suivant deviendra hôte. Continuer ?"
      : "Veux-tu vraiment quitter le salon ?";

    if (!confirm(confirmMsg)) return;

    try {
      if (isHost && players.length > 1) {
        const hostIndex = players.findIndex(p => p.player_id === userId || p.player_id === playerId);
        const nextPlayer = players[hostIndex + 1] || players[0];

        if (nextPlayer && nextPlayer.player_id !== userId && nextPlayer.player_id !== playerId) {
          await supabase
            .from("players")
            .update({ is_host: true })
            .eq("id", nextPlayer.id);

          await supabase
            .from("rooms")
            .update({ host_id: nextPlayer.player_id })
            .eq("id", roomCode);
        }
      }

      await supabase
        .from("players")
        .delete()
        .eq("room_id", roomCode)
        .eq("player_id", userId || playerId);

      window.location.href = "/";
      
    } catch (err: any) {
      console.error(" Erreur quitter:", err);
      alert("Erreur : " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white">
        <p className="text-2xl font-bold text-green-400 animate-pulse">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <h1 className="text-4xl md:text-6xl font-black mb-4 text-green-400">
        MASTER BLAST! 💥
      </h1>

      <h2 className="text-xl md:text-2xl text-yellow-400 mb-8 font-bold">
        Mode  RAPIDE ({room?.total_questions || 10} questions)
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

      {isHost && players.length >= 1 && (
        <button
          onClick={startGame}
          className="mt-8 bg-green-400 text-black hover:bg-green-300 font-black py-4 px-12 rounded-xl text-2xl border-b-4 border-green-600 transition-all active:scale-95 shadow-[0_0_20px_rgba(74,222,128,0.5)]"
        >
          LANCER LE JEU 🚀
        </button>
      )}

      {!isHost && (
        <p className="mt-8 text-yellow-400 font-bold text-lg animate-pulse">
          En attente que le host lance le jeu...
        </p>
      )}

      <button
        onClick={quitRoom}
        className="mt-4 bg-red-500 text-white hover:bg-red-400 font-black py-3 px-8 rounded-xl text-lg border-b-4 border-red-700 transition-all active:scale-95"
      >
        QUITTER LE SALON 🚪
      </button>
    </div>
  );
}