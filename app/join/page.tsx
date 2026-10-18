"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function JoinRoom() {
  const [code, setCode] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    if (!code.trim() || !pseudo.trim()) {
      alert("Entre le code du salon ET ton pseudo !");
      return;
    }

    setLoading(true);

    // Vérifier que le salon existe
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", code)
      .single();

    if (roomError || !room) {
      alert("Salon introuvable ! Vérifie le code.");
      setLoading(false);
      return;
    }

    // Créer le joueur
    const playerId = crypto.randomUUID();
    const { error: playerError } = await supabase
      .from("players")
      .insert([{ id: playerId, room_id: code, name: pseudo, score: 0 }]);

    if (playerError) {
      alert("Erreur lors de la connexion au salon");
      setLoading(false);
      return;
    }

    // Rediriger vers le salon
    router.push(`/room/${code}?playerId=${playerId}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <h1 className="text-4xl md:text-6xl font-black mb-8 text-green-400">
        REJOINDRE UN SALON 🎯
      </h1>

      <div className="w-full max-w-md space-y-6">
        <div>
          <label className="block text-green-300 mb-2 font-bold text-lg">
            Code du salon :
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex: 6064"
            maxLength={4}
            className="w-full bg-black border-2 border-green-400 text-green-400 placeholder-green-700 rounded-xl py-3 px-4 text-xl font-bold focus:outline-none focus:shadow-[0_0_15px_rgba(74,222,128,0.5)] text-center tracking-widest"
          />
        </div>

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

        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full bg-green-400 text-black hover:bg-green-300 active:scale-95 transition-all font-black py-4 rounded-xl text-xl shadow-[0_0_20px_rgba(74,222,128,0.5)] border-b-4 border-green-600 disabled:opacity-50"
        >
          {loading ? "CONNEXION..." : "REJOINDRE 🚀"}
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