"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

const AVATARS = [
  { id: 0, name: "Ninja" },
  { id: 1, name: "Mage" },
  { id: 2, name: "Dragon" },
  { id: 3, name: "Robot" },
  { id: 4, name: "Lion" },
  { id: 5, name: "Licorne" },
  { id: 6, name: "Renard" },
  { id: 7, name: "Alien" },
  { id: 8, name: "Ours" },
  { id: 9, name: "Loup" },
];

export default function ProfilePage() {
  const [stats, setStats] = useState<any>(null);
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedPseudo = localStorage.getItem("userPseudo");
    const storedEmail = localStorage.getItem("userEmail");
    const storedAvatar = localStorage.getItem("userAvatar");

    if (!storedUserId || !storedPseudo) {
      router.push("/auth");
      return;
    }

    setUserId(storedUserId);
    setPseudo(storedPseudo);
    if (storedEmail) setEmail(storedEmail);
    if (storedAvatar) setSelectedAvatar(parseInt(storedAvatar));

    const loadData = async () => {
      const { data: userData } = await supabase
        .from("users")
        .select("avatar_index")
        .eq("id", storedUserId)
        .single();

      if (userData?.avatar_index !== undefined) {
        setSelectedAvatar(userData.avatar_index);
        localStorage.setItem("userAvatar", String(userData.avatar_index));
      }

      const { data: statsData } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", storedUserId)
        .single();

      if (statsData) setStats(statsData);
    };

    loadData();
  }, [router]);

  const saveAvatar = async (avatarId: number) => {
    setSaving(true);
    setSelectedAvatar(avatarId);
    localStorage.setItem("userAvatar", String(avatarId));

    await supabase
      .from("users")
      .update({ avatar_index: avatarId })
      .eq("id", userId);

    setSaving(false);
  };

  const logout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userPseudo");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userAvatar");
    router.push("/auth");
  };

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white">
        <p className="text-2xl font-bold text-green-400 animate-pulse">Chargement...</p>
      </div>
    );
  }

  const winRate = stats.games_played > 0 
    ? Math.round((stats.games_won / stats.games_played) * 100) 
    : 0;

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4 pt-24">
      <h1 className="text-4xl md:text-6xl font-black mb-8 text-green-400">
        MON PROFIL
      </h1>

      <div className="w-full max-w-3xl space-y-6">
        {/* Infos utilisateur */}
        <div className="bg-black border-2 border-green-400 rounded-2xl p-6 text-center">
          <img
            src={`/avatars/avatar-${selectedAvatar}.png`}
            alt="Avatar"
            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-green-400 object-cover"
          />
          <h2 className="text-3xl font-black text-green-400 mb-2">{pseudo}</h2>
          <p className="text-green-300">{email}</p>
        </div>

        {/* Sélecteur d'avatars */}
        <div className="bg-black border-2 border-green-400 rounded-2xl p-6">
          <h3 className="text-2xl font-black text-green-400 mb-4 text-center">
            🎨 CHOISIS TON AVATAR
          </h3>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => saveAvatar(avatar.id)}
                disabled={saving}
                className={`relative group transition-all duration-200 ${
                  selectedAvatar === avatar.id
                    ? "scale-110 ring-4 ring-green-400 rounded-full"
                    : "hover:scale-105 opacity-70 hover:opacity-100"
                }`}
                title={avatar.name}
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-400 mx-auto">
                  <img
                    src={`/avatars/avatar-${avatar.id}.png`}
                    alt={avatar.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedAvatar === avatar.id && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center text-black font-black text-sm">
                    ✓
                  </div>
                )}
                <p className="text-xs text-green-300 mt-1 text-center font-bold">
                  {avatar.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black border-2 border-green-400 rounded-xl p-4 text-center">
            <div className="text-4xl mb-2"></div>
            <div className="text-3xl font-black text-green-400">{stats.games_played}</div>
            <div className="text-green-300 text-sm">Parties jouées</div>
          </div>

          <div className="bg-black border-2 border-yellow-400 rounded-xl p-4 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-3xl font-black text-yellow-400">{stats.games_won}</div>
            <div className="text-green-300 text-sm">Victoires</div>
          </div>

          <div className="bg-black border-2 border-red-400 rounded-xl p-4 text-center">
            <div className="text-4xl mb-2">💀</div>
            <div className="text-3xl font-black text-red-400">{stats.games_lost}</div>
            <div className="text-green-300 text-sm">Défaites</div>
          </div>

          <div className="bg-black border-2 border-blue-400 rounded-xl p-4 text-center">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-3xl font-black text-blue-400">{winRate}%</div>
            <div className="text-green-300 text-sm">Taux de victoire</div>
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black border-2 border-green-400 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-2xl font-black text-green-400">{stats.total_score}</div>
            <div className="text-green-300 text-sm">Score total</div>
          </div>

          <div className="bg-black border-2 border-yellow-400 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">⭐</div>
            <div className="text-2xl font-black text-yellow-400">{stats.best_score}</div>
            <div className="text-green-300 text-sm">Meilleur score</div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="/"
            className="bg-green-400 text-black hover:bg-green-300 font-black py-3 px-8 rounded-xl text-lg border-b-4 border-green-600"
          >
            JOUER 🎮
          </a>
          <button
            onClick={logout}
            className="bg-red-500 text-white hover:bg-red-400 font-black py-3 px-8 rounded-xl text-lg border-b-4 border-red-700"
          >
            DÉCONNEXION 🚪
          </button>
        </div>
      </div>
    </div>
  );
}