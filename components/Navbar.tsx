"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [pseudo, setPseudo] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userPseudo = localStorage.getItem("userPseudo");
    const userAvatar = localStorage.getItem("userAvatar");

    if (userId && userPseudo) {
      setIsLoggedIn(true);
      setPseudo(userPseudo);
      setAvatarIndex(userAvatar ? parseInt(userAvatar) : 0);
    }
  }, []);

  const goToProfile = () => {
    router.push("/profile");
  };

  if (!isLoggedIn) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-4">
      <button
        onClick={goToProfile}
        className="relative group flex items-center gap-3"
        title="Mon profil"
      >
        <span className="text-green-300 font-black text-2xl drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
          {pseudo}
        </span>

        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-green-400 shadow-[0_0_25px_rgba(74,222,128,0.7)] group-hover:scale-110 group-hover:border-green-300 transition-all duration-300">
          <img
            src={`/avatars/avatar-${avatarIndex}.png`}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-4 border-slate-950 shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
      </button>
    </div>
  );
}