"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import { hashPassword } from "@/lib/utils";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const hashedPassword = await hashPassword(password);

      if (isLogin) {
        // --- CONNEXION ---
        const { data: user, error } = await supabase
          .from("profiles") // ⚠️ Si ta table s'appelle "users", remplace "profiles" par "users" ici
          .select("*")
          .eq("email", email.toLowerCase().trim())
          .eq("password_hash", hashedPassword)
          .single();

        if (error || !user) {
          setError("Email ou mot de passe incorrect.");
        } else {
          localStorage.setItem("userId", user.id);
          localStorage.setItem("userPseudo", user.pseudo);
          localStorage.setItem("userEmail", user.email);
          localStorage.setItem("userAvatar", String(user.avatar_index || 0));
          router.push("/profile");
        }
      } else {
        // --- INSCRIPTION ---
        const { data: user, error } = await supabase
          .from("profiles") // ⚠️ Idem, "profiles" ou "users" selon le nom de ta table
          .insert([{ 
            email: email.toLowerCase().trim(), 
            pseudo: pseudo.trim(), 
            password_hash: hashedPassword 
          }])
          .select()
          .single();

        if (error) {
          console.error("🔴 ERREUR SUPABASE DÉTAILLÉE :", error); // Regarde la console du navigateur (F12)
          
          if (error.code === "23505" || error.message?.includes("duplicate key")) {
            if (error.message?.toLowerCase().includes("email") || error.message?.includes("email_key")) {
              setError("Cet email est déjà utilisé !");
            } else if (error.message?.toLowerCase().includes("pseudo") || error.message?.includes("pseudo_key")) {
              setError("Ce pseudo est déjà pris !");
            } else {
              setError("Cet email ou ce pseudo est déjà utilisé !");
            }
          } else {
            setError(`Erreur: ${error.message || "Problème de connexion à la base de données"}`);
          }
        } else {
          localStorage.setItem("userId", user.id);
          localStorage.setItem("userPseudo", user.pseudo);
          localStorage.setItem("userEmail", user.email);
          localStorage.setItem("userAvatar", String(user.avatar_index || 0));
          router.push("/profile");
        }
      }
    } catch (err: any) {
      console.error("🔴 ERREUR INATTENDUE :", err);
      setError(`Une erreur est survenue : ${err.message || "Vérifie ta connexion"}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <p className="text-xl md:text-2xl text-green-300 mb-4 text-center font-bold">
        {isLogin ? "Connecte-toi et joue entre amis 🎮" : "Rejoins la communauté Master Blast ! 🚀"}
      </p>

      <h1 className="text-4xl md:text-6xl font-black mb-8 text-green-400">
        {isLogin ? "CONNEXION" : "INSCRIPTION"}
      </h1>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <div>
          <label className="block text-green-300 mb-2 font-bold text-lg">Email :</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            required
            className="w-full bg-black border-2 border-green-400 text-green-400 placeholder-green-700 rounded-xl py-3 px-4 text-xl font-bold focus:outline-none focus:shadow-[0_0_15px_rgba(74,222,128,0.5)]"
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-green-300 mb-2 font-bold text-lg">Pseudo :</label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ton pseudo dans le jeu..."
              required
              className="w-full bg-black border-2 border-green-400 text-green-400 placeholder-green-700 rounded-xl py-3 px-4 text-xl font-bold focus:outline-none focus:shadow-[0_0_15px_rgba(74,222,128,0.5)]"
            />
          </div>
        )}

        <div>
          <label className="block text-green-300 mb-2 font-bold text-lg">Mot de passe :</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ton mot de passe..."
            required
            minLength={4}
            className="w-full bg-black border-2 border-green-400 text-green-400 placeholder-green-700 rounded-xl py-3 px-4 text-xl font-bold focus:outline-none focus:shadow-[0_0_15px_rgba(74,222,128,0.5)]"
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
          {loading ? "CHARGEMENT..." : isLogin ? "SE CONNECTER 🚀" : "S'INSCRIRE 🎮"}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="text-green-300 hover:text-green-100 font-bold text-lg underline"
          >
            {isLogin ? "Pas de compte ? Inscris-toi !" : "Déjà un compte ? Connecte-toi !"}
          </button>
        </div>

        <a
          href="/"
          className="block text-center text-green-300 hover:text-green-100 font-bold text-lg mt-4"
        >
          ← Retour à l'accueil
        </a>
      </form>
    </div>
  );
}