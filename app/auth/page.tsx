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
        // --- CONNEXION (email + mot de passe) ---
        const { data: user, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .eq("password_hash", hashedPassword)
          .single();

        if (error || !user) {
          setError("Email ou mot de passe incorrect");
        } else {
          localStorage.setItem("userId", user.id);
          localStorage.setItem("userPseudo", user.pseudo);
          localStorage.setItem("userEmail", user.email);
          router.push("/profile");
        }
      } else {
        // --- INSCRIPTION (email + pseudo + mot de passe) ---
        const { data: user, error } = await supabase
          .from("users")
          .insert([{ 
            email: email.toLowerCase().trim(), 
            pseudo, 
            password_hash: hashedPassword 
          }])
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            if (error.message.includes("email")) {
              setError("Cet email est déjà utilisé !");
            } else {
              setError("Ce pseudo est déjà pris !");
            }
          } else {
            setError(`Erreur: ${error.message}`);
          }
        } else {
          localStorage.setItem("userId", user.id);
          localStorage.setItem("userPseudo", user.pseudo);
          localStorage.setItem("userEmail", user.email);
          router.push("/profile");
        }
      }
    } catch (err) {
      setError("Une erreur est survenue");
    }
    
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <h1 className="text-4xl md:text-6xl font-black mb-8 text-green-400">
        {isLogin ? "CONNEXION" : "INSCRIPTION"}
      </h1>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        {/* Email (toujours affiché) */}
        <div>
          <label className="block text-green-300 mb-2 font-bold text-lg">Email :</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            required
            className="w-full bg-black border-2 border-green-400 text-green-400 placeholder-green-700 rounded-xl py-3 px-4 text-xl font-bold focus:outline-none"
          />
        </div>

        {/* Pseudo (uniquement à l'inscription) */}
        {!isLogin && (
          <div>
            <label className="block text-green-300 mb-2 font-bold text-lg">Pseudo :</label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ton pseudo dans le jeu..."
              required
              className="w-full bg-black border-2 border-green-400 text-green-400 placeholder-green-700 rounded-xl py-3 px-4 text-xl font-bold focus:outline-none"
            />
          </div>
        )}

        {/* Mot de passe (toujours affiché) */}
        <div>
          <label className="block text-green-300 mb-2 font-bold text-lg">Mot de passe :</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ton mot de passe..."
            required
            minLength={4}
            className="w-full bg-black border-2 border-green-400 text-green-400 placeholder-green-700 rounded-xl py-3 px-4 text-xl font-bold focus:outline-none"
          />
        </div>

        {error && <p className="text-red-400 text-center font-bold">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-400 text-black hover:bg-green-300 font-black py-4 rounded-xl text-xl border-b-4 border-green-600 disabled:opacity-50"
        >
          {loading ? "CHARGEMENT..." : isLogin ? "SE CONNECTER " : "S'INSCRIRE "}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="text-green-300 hover:text-green-100 font-bold"
          >
            {isLogin ? "Pas de compte ? Inscris-toi !" : "Déjà un compte ? Connecte-toi !"}
          </button>
        </div>

        <a
          href="/"
          className="block text-center text-green-300 hover:text-green-100 font-bold"
        >
          ← Retour à l'accueil
        </a>
      </form>
    </div>
  );
}