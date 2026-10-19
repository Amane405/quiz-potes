"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function JoinPage() {
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) router.push("/auth");
  }, [router]);

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const userId = localStorage.getItem("userId");
    const userPseudo = localStorage.getItem("userPseudo") || "Joueur";

    if (!userId) {
      setError("Tu dois être connecté !");
      setLoading(false);
      return;
    }

    try {
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomCode.toUpperCase().trim())
        .single();

      if (roomError || !room) {
        setError("Salon introuvable !");
        setLoading(false);
        return;
      }

      if (room.status !== "waiting") {
        setError("Ce salon a déjà commencé !");
        setLoading(false);
        return;
      }

      const { error: playerError } = await supabase
        .from("players")
        .insert([{
          room_id: roomCode.toUpperCase().trim(),
          player_id: userId,
          name: userPseudo,
          score: 0,
          is_host: false,
        }]);

      if (playerError) {
        if (playerError.code === "23505") {
          setError("Tu es déjà dans ce salon !");
        } else {
          setError("Erreur : " + playerError.message);
        }
        setLoading(false);
        return;
      }

      router.push(`/room/${roomCode.toUpperCase().trim()}?playerId=${userId}`);
    } catch (err: any) {
      setError("Erreur : " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <h1 className="text-4xl md:text-6xl font-black mb-8 text-green-400">
        REJOINDRE UN SALON
      </h1>

      <form onSubmit={joinRoom} className="w-full max-w-md space-y-6">
        <div>
          <label className="block text-green-300 mb-2 font-bold text-lg text-center">
            Code du salon :
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            required
            maxLength={6}
            className="w-full bg-black border-2 border-green-400 text-green-400 placeholder-green-700 rounded-xl py-4 px-4 text-2xl font-black text-center tracking-widest focus:outline-none focus:shadow-[0_0_15px_rgba(74,222,128,0.5)]"
          />
        </div>

        {error && (
          <p className="text-red-400 text-center font-bold bg-red-900/20 p-3 rounded-lg border border-red-500/50">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-400 text-black hover:bg-green-300 font-black py-4 rounded-xl text-xl border-b-4 border-green-600 disabled:opacity-50 transition-all active:scale-95"
        >
          {loading ? "REJOINT..." : "REJOINDRE 🎮"}
        </button>

        <a
          href="/"
          className="block text-center text-green-300 hover:text-green-100 font-bold text-lg"
        >
          ← Retour au menu
        </a>
      </form>
    </div>
  );
}