"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function RoomPage({ params }: { params: { roomCode: string } }) {
  const searchParams = useSearchParams();
  const playerId = searchParams.get("playerId");
  const router = useRouter();
  const [players, setPlayers] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const hasRedirected = useRef(false);

  const fetchData = async () => {
    try {
      const { data: roomData, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", params.roomCode)
        .single();

      if (error) {
        console.error("Erreur room:", error);
        return;
      }

      if (roomData) {
        setRoom(roomData);

        // 🎯 REDIRECTION AUTOMATIQUE si le jeu est lancé
        if (roomData.status === "playing" && !hasRedirected.current) {
          hasRedirected.current = true;
          console.log("Redirection vers le jeu...");
          router.replace(`/room/${params.roomCode}/game?playerId=${playerId}`);
          return;
        }
      }

      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", params.roomCode)
        .order("joined_at", { ascending: true });
      
      if (playersData) setPlayers(playersData);
    } catch (err) {
      console.error("Erreur fetchData:", err);
    }
  };

  useEffect(() => {
    // Appel immédiat
    fetchData();

    // Polling toutes les secondes (plus rapide)
    const interval = setInterval(fetchData, 1000);

    return () => {
      clearInterval(interval);
      hasRedirected.current = false;
    };
  }, [params.roomCode, playerId]);

  const copyCode = () => {
    navigator.clipboard.writeText(params.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = async () => {
    console.log("Host lance le jeu...");
    
    // Mettre le statut à "playing"
    const { error } = await supabase
      .from("rooms")
      .update({ status: "playing" })
      .eq("id", params.roomCode);

    if (error) {
      console.error("Erreur update room:", error);
      return;
    }

    console.log("Statut mis à jour, redirection...");
    hasRedirected.current = true;
    router.replace(`/room/${params.roomCode}/game?playerId=${playerId}`);
  };

  const getModeLabel = () => {
    if (room?.total_questions === 10) return { text: "⚡ RAPIDE (10 questions)", color: "text-yellow-400" };
    if (room?.total_questions === 20) return { text: "🔥 MOYEN (20 questions)", color: "text-orange-400" };
    return { text: " COMPLÈTE (40 questions)", color: "text-red-400" };
  };

  const modeInfo = getModeLabel();
  const hostId = players[0]?.id;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <h1 className="text-4xl md:text-5xl font-black mb-4 text-green-400">
        MASTER BLAST! 💥
      </h1>

      {room && (
        <div className={`mb-6 text-xl md:text-2xl font-black ${modeInfo.color}`}>
          Mode {modeInfo.text}
        </div>
      )}

      <div className="mb-8 text-center">
        <p className="text-green-300 mb-2 font-bold text-lg">Code du salon :</p>
        <button
          onClick={copyCode}
          className="bg-black border-4 border-green-400 rounded-2xl py-6 px-12 text-6xl font-black text-green-400 tracking-widest shadow-[0_0_30px_rgba(74,222,128,0.4)] hover:scale-105 transition-transform"
        >
          {params.roomCode}
        </button>
        {copied && <p className="text-green-300 mt-2 font-bold">✅ Code copié !</p>}
      </div>

      <div className="w-full max-w-md mb-8">
        <h2 className="text-2xl font-black text-green-300 mb-4 text-center">
          Joueurs connectés ({players.length})
        </h2>
        <div className="space-y-3">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="bg-black border-2 border-green-400 rounded-xl py-3 px-5 flex items-center justify-between"
            >
              <span className="text-green-400 font-bold text-xl">{player.name}</span>
              {index === 0 && (
                <span className="text-yellow-400 text-sm font-bold"> HOST</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {players.length >= 2 && playerId === hostId && (
        <button
          onClick={startGame}
          className="bg-green-400 text-black hover:bg-green-300 active:scale-95 transition-all font-black py-4 px-12 rounded-xl text-2xl shadow-[0_0_20px_rgba(74,222,128,0.5)] border-b-4 border-green-600 animate-pulse"
        >
          LANCER LE JEU 🚀
        </button>
      )}

      {players.length < 2 && (
        <p className="text-green-300 text-center animate-pulse font-bold">
          En attente de joueurs... Partage le code ! 📱
        </p>
      )}

      {players.length >= 2 && playerId !== hostId && (
        <p className="text-yellow-300 text-center animate-pulse font-bold">
          En attente que le host lance le jeu... 
        </p>
      )}
    </div>
  );
}