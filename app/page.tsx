"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      router.push("/auth");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
      <h1 className="text-6xl md:text-8xl font-black mb-8 text-green-400 animate-pulse">
        MASTER BLAST!
      </h1>
      <p className="text-2xl text-green-300 mb-12 text-center">
        Le quiz multijoueur qui déchire 🔥
      </p>

      <div className="space-y-4 w-full max-w-md">
        <a
          href="/create"
          className="block w-full bg-green-400 text-black hover:bg-green-300 active:scale-95 transition-all font-black py-6 rounded-xl text-2xl shadow-[0_0_20px_rgba(74,222,128,0.5)] border-b-4 border-green-600 text-center"
        >
          CRÉER UN SALON 🎮
        </a>

        <a
          href="/join"
          className="block w-full bg-blue-500 text-white hover:bg-blue-400 active:scale-95 transition-all font-black py-6 rounded-xl text-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)] border-b-4 border-blue-700 text-center"
        >
          REJOINDRE UN SALON 
        </a>
      </div>
    </div>
  );
}