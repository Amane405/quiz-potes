"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function CreateRoom() {
  const [pseudo, setPseudo] = useState("");
  const [mode, setMode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const modes = [
    { value: 10, label: "⚡ RAPIDE", desc: "10 questions", color: "border-yellow-400 text-yellow-400" },
    { value: 20, label: "🔥 MOYEN", desc: "20 questions", color: "border-orange-400 text-orange-400" },
    { value: 40, label: "💀 COMPLÈTE", desc: "40 questions", color: "border-red-400 text-red-400" },
  ];

  const handleCreate = async () => {
    if (!pseudo.trim()) {
      alert("Entre un pseudo !");
      return;
    }
    if (!mode) {
      alert("Choisis un mode de jeu !");
      return;
    }

    setLoading(true);

    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    const playerId = crypto.randomUUID();

    // Créer le salon avec le nombre de questions
    const { error: roomError } = await supabase
      .from("rooms")
      .insert([{
        id: roomCode,
        host_name: pseudo,
        host_id: playerId,
        status: "waiting",
        total_questions: mode
      }]);

    if (roomError) {
      alert("Erreur salon : " + roomError.message);
      setLoading(false);
      return;
    }

    // Créer le joueur (le host)
    await supabase
      .from("players")
      .insert([{ id: playerId, room_id: roomCode, name: pseudo, score: 0 }]);

    router.push(`/room/${roomCode}?playerId=${playerId}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <h1 className="text-4xl md:text-6xl font-black mb-8 text-green-400">
        CRÉER UN SALON 
      </h1>

      <div className="w-full max-w-md space-y-6">
        {/* Pseudo */}
        <div>
          <label className="block text-green-300 mb-2 font-bold text-lg">
            Ton pseudo :
          </label>
          <input
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Entre ton pseudo..."
            className="w-full bg-black border-2 border-green-400 text-green-400 placeholder-green-700 rounded-xl py-3 px-4 text-xl font-bold focus:outline-none focus:shadow-[0_0_15px_rgba(74,222,128,0.5)]"
          />
        </div>

        {/* Choix du mode */}
        <div>
          <label className="block text-green-300 mb-3 font-bold text-lg">
            Mode de jeu :
          </label>
          <div className="grid grid-cols-3 gap-2">
            {modes.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`border-2 rounded-xl py-3 px-2 font-black transition-all ${
                  mode === m.value
                    ? `${m.color} bg-black scale-105 shadow-[0_0_15px_rgba(74,222,128,0.3)]`
                    : "border-gray-600 text-gray-500 hover:border-gray-400"
                }`}
              >
                <div className="text-sm md:text-base">{m.label}</div>
                <div className="text-xs opacity-70">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Bouton créer */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-green-400 text-black hover:bg-green-300 active:scale-95 transition-all font-black py-4 rounded-xl text-xl shadow-[0_0_20px_rgba(74,222,128,0.5)] border-b-4 border-green-600 disabled:opacity-50"
        >
          {loading ? "CRÉATION..." : "CRÉER LE SALON 🚀"}
        </button>

        <a
          href="/"
          className="block text-center text-green-300 hover:text-green-100 font-bold"
        >
          ← Retour à l'accueil
        </a>
      </div>
    </div>
  );
}