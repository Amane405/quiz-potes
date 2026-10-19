"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function CreatePage() {
  const [roomName, setRoomName] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) router.push("/auth");
  }, [router]);

  const createRoom = async (e: React.FormEvent) => {
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

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert([{
          id: roomCode,
          name: roomName || "Salon de " + userPseudo,
          host_id: userId,
          total_questions: totalQuestions,
          status: "waiting",
          question_phase: "intro",
          game_round: 0,
          current_question_index: 0,
        }])
        .select()
        .single();

      if (roomError) {
        console.error("Erreur room:", roomError);
        setError("Erreur salon : " + roomError.message);
        setLoading(false);
        return;
      }

      const { error: playerError } = await supabase
        .from("players")
        .insert([{
          room_id: roomCode,
          player_id: userId,
          name: userPseudo,
          score: 0,
          is_host: true,
        }]);

      if (playerError) {
        console.error("Erreur player:", playerError);
        await supabase.from("rooms").delete().eq("id", roomCode);
        setError("Erreur joueur : " + playerError.message);
        setLoading(false);
        return;
      }

      // ✅ SEULE MODIFICATION ICI : window.location au lieu de router.push
      window.location.href = `/room/${roomCode}?playerId=${userId}`;
      
    } catch (err: any) {
      console.error("Erreur:", err);
      setError("Erreur : " + err.message);
    }

    setLoading(false);
  };

  const questionOptions = [5, 10, 15, 20, 30, 40, 50];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <h1 className="text-4xl md:text-6xl font-black mb-8 text-green-400 text-center">
        CRÉER UN SALON
      </h1>

      <form onSubmit={createRoom} className="w-full max-w-2xl space-y-8">
        <div>
          <label className="block text-green-300 mb-3 font-bold text-lg text-center">
            Nom du salon (optionnel) :
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Ex: Soirée Quiz Potes"
            className="w-full bg-black border-2 border-green-400 text-green-400 placeholder-green-700 rounded-xl py-3 px-4 text-xl font-bold focus:outline-none focus:shadow-[0_0_15px_rgba(74,222,128,0.5)] text-center"
          />
        </div>

        <div>
          <label className="block text-green-300 mb-4 font-bold text-lg text-center">
            Nombre de questions :
          </label>
          <div className="flex justify-center gap-3 flex-wrap">
            {questionOptions.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setTotalQuestions(num)}
                className={`w-20 h-20 rounded-xl font-black text-2xl border-2 transition-all duration-200 ${
                  totalQuestions === num
                    ? "bg-green-400 text-black border-green-400 scale-110 shadow-[0_0_20px_rgba(74,222,128,0.7)]"
                    : "bg-black text-green-400 border-green-700 hover:border-green-400 hover:scale-105"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <p className="text-center text-green-300 mt-4 font-bold text-lg">
            {totalQuestions} question{totalQuestions > 1 ? "s" : ""} sélectionnée{totalQuestions > 1 ? "s" : ""}
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-center font-bold bg-red-900/20 p-3 rounded-lg border border-red-500/50">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-400 text-black hover:bg-green-300 active:scale-95 transition-all font-black py-5 rounded-xl text-2xl shadow-[0_0_20px_rgba(74,222,128,0.5)] border-b-4 border-green-600 disabled:opacity-50"
        >
          {loading ? "CRÉATION..." : "CRÉER LE SALON 🚀"}
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