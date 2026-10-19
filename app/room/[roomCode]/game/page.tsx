"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/supabase";

// ============ SONS ============
const playSound = (type: "tick" | "tick-fast" | "correct" | "wrong" | "start" | "reveal") => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const createTone = (freq: number, duration: number, startTime: number = 0, oscType: OscillatorType = "sine", volume: number = 0.3) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = oscType;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + startTime);
      osc.stop(audioCtx.currentTime + startTime + duration);
    };

    switch (type) {
      case "tick":
        createTone(600, 0.08, 0, "square", 0.2);
        break;
      case "tick-fast":
        createTone(900, 0.06, 0, "square", 0.3);
        createTone(1000, 0.04, 0.05, "square", 0.2);
        break;
      case "correct":
        createTone(523.25, 0.12, 0, "sine", 0.3);
        createTone(659.25, 0.12, 0.12, "sine", 0.3);
        createTone(783.99, 0.12, 0.24, "sine", 0.3);
        createTone(1046.50, 0.3, 0.36, "sine", 0.4);
        break;
      case "wrong":
        createTone(150, 0.15, 0, "sawtooth", 0.5);
        createTone(120, 0.15, 0.15, "sawtooth", 0.5);
        createTone(100, 0.3, 0.3, "sawtooth", 0.5);
        createTone(80, 0.4, 0.6, "sawtooth", 0.4);
        break;
      case "start":
        createTone(830, 1.5, 0, "sine", 0.4);
        createTone(1245, 1.2, 0.1, "sine", 0.3);
        createTone(1660, 1.0, 0.2, "sine", 0.2);
        break;
      case "reveal":
        createTone(400, 0.3, 0, "sine", 0.3);
        createTone(500, 0.3, 0.2, "sine", 0.3);
        createTone(600, 0.3, 0.4, "sine", 0.3);
        createTone(800, 0.5, 0.6, "sine", 0.4);
        break;
    }
  } catch (e) {
    console.log("Son non supporté");
  }
};

const GOOD_MESSAGES = ["🔥 LÉGENDE !", "🎯 MACHINE !", " CLASSE MONDIALE !", " ROI DU QUIZ !", "🚀 T'ES UNE BÊTE !", "💯 PERFECTION !", "🧙 SORCIER !", "🥇 NUMÉRO 1 !", "🌟 INCROYABLE !", "👹 MONSTRE SACRÉ !"];
const BAD_MESSAGES = ["😂 T'AS SÉRIEUSEMENT CRU ÇA ?", " CLOWN ATTESTÉ", "💀 RIP TON CERVEAU", "🍼 NIVEAU MATERNELLE", "🙃 T'AS RÉPONDU AU HASARD ?", "🐢 PLUS LENT QU'UN ESCARGOT", "🗑️ POUBELLE DE RÉPONSES", " VA RÉVISER À L'ÉCOLE", "🥴 T'ÉTAIS OÙ DANS TA TÊTE ?", "🚫 INTERDIT DE JOUER SANS CERVEAU"];
const BOTTOM_MESSAGES = ["Il fait de son mieux... ", "Au moins il participe 😅", "Il joue en mode facile 🎮", "Prochaine fois, révise ! 📖", "Même ma grand-mère ferait mieux ", "C'est le début d'une grande carrière... vers le bas 📉"];

const COLORS = [
  { bg: "bg-red-500", hover: "hover:bg-red-400", border: "border-red-700", label: "A" },
  { bg: "bg-blue-500", hover: "hover:bg-blue-400", border: "border-blue-700", label: "B" },
  { bg: "bg-yellow-400", hover: "hover:bg-yellow-300", border: "border-yellow-600", label: "C" },
  { bg: "bg-green-500", hover: "hover:bg-green-400", border: "border-green-700", label: "D" },
];

export default function GamePage({ params }: { params: { roomCode: string } }) {
  const searchParams = useSearchParams();
  const playerId = searchParams.get("playerId");
  const router = useRouter();

  const [phase, setPhase] = useState<"intro" | "question" | "answered" | "reveal" | "scores" | "podium" | "end">("intro");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState<any>(null);
  const [qIndex, setQIndex] = useState(0);
  const [totalQ, setTotalQ] = useState(10);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [myResult, setMyResult] = useState<any>(null);
  const [revealTimer, setRevealTimer] = useState(5);
  const [revealMessage, setRevealMessage] = useState("");
  const [waitingForHost, setWaitingForHost] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionsLoaded = useRef(false);
  const lastQuestionIndex = useRef(-1);
  const gameStarted = useRef(false);
  const podiumShown = useRef<Set<number>>(new Set());
  const lastGameRound = useRef(0);

  // ============ INITIALISATION ============
  useEffect(() => {
    const init = async () => {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", params.roomCode)
        .single();

      if (roomData) {
        setTotalQ(roomData.total_questions || 10);
        lastGameRound.current = roomData.game_round || 0;

        const { data: playersData } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", params.roomCode)
          .order("joined_at", { ascending: true });

        if (playersData && playersData.length > 0) {
          setPlayers(playersData);
          setTotalPlayers(playersData.length);
          setIsHost(roomData.host_id === playerId);
        }
      }
    };
    init();
  }, [params.roomCode, playerId]);

  // ============ POLLING PRINCIPAL ============
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", params.roomCode)
        .single();

      if (!roomData) return;

      // 🔑 DÉTECTION DU RETOUR AU SALON PAR LE HOST
      if (roomData.status === "waiting" && phase === "end") {
        console.log("Le host est retourné au salon, redirection...");
        router.push(`/room/${params.roomCode}?playerId=${playerId}`);
        return;
      }

      // Détecter une nouvelle partie (game_round a changé)
      const currentGameRound = roomData.game_round || 0;
      if (currentGameRound !== lastGameRound.current) {
        console.log("Nouvelle partie détectée ! Round:", currentGameRound);
        lastGameRound.current = currentGameRound;
        questionsLoaded.current = false;
        gameStarted.current = false;
        lastQuestionIndex.current = -1;
        podiumShown.current = new Set();
        setRevealMessage("");
        setPhase("intro");
      }

      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", params.roomCode)
        .order("score", { ascending: false });
      if (playersData) setPlayers(playersData);

      const currentIdx = roomData.current_question_index || 0;

      // Charger les questions depuis la DB
      if (!questionsLoaded.current && roomData.question_phase !== "intro" && roomData.question_phase !== "waiting") {
        const { data: gameQuestions } = await supabase
          .from("game_questions")
          .select("*")
          .eq("room_id", params.roomCode)
          .order("question_index", { ascending: true });

        if (gameQuestions && gameQuestions.length > 0) {
          console.log("Questions chargées:", gameQuestions.length);
          setQuestions(gameQuestions);
          questionsLoaded.current = true;
        }
      }

      // Détecter le démarrage du jeu
      if (questionsLoaded.current && !gameStarted.current && roomData.question_phase === "question") {
        gameStarted.current = true;
        lastQuestionIndex.current = currentIdx;
        
        const { data: gameQuestions } = await supabase
          .from("game_questions")
          .select("*")
          .eq("room_id", params.roomCode)
          .order("question_index", { ascending: true });
        
        if (gameQuestions && gameQuestions[currentIdx]) {
          console.log("Jeu démarré - Question:", currentIdx);
          setQuestions(gameQuestions);
          setCurrentQ(gameQuestions[currentIdx]);
          setQIndex(currentIdx);
          setTimeLeft(15);
          setSelectedAnswer(null);
          setMyResult(null);
          setRevealMessage("");
          setAnsweredCount(0);
          setPhase("question");
        }
      }

      // Détecter le changement de question
      if (gameStarted.current && roomData.question_phase === "question" && currentIdx !== lastQuestionIndex.current) {
        lastQuestionIndex.current = currentIdx;
        
        if (questions[currentIdx]) {
          console.log("Nouvelle question:", currentIdx);
          setCurrentQ(questions[currentIdx]);
          setQIndex(currentIdx);
          setTimeLeft(15);
          setSelectedAnswer(null);
          setMyResult(null);
          setRevealMessage("");
          setAnsweredCount(0);
          setPhase("question");
        }
      }

      // Compter les réponses
      if (roomData.current_question_index !== undefined) {
        const { count } = await supabase
          .from("answers")
          .select("*", { count: "exact", head: true })
          .eq("room_id", params.roomCode)
          .eq("question_index", roomData.current_question_index);
        if (count !== null) setAnsweredCount(count);
      }

      // Transitions de phase
      if (roomData.question_phase === "reveal" && phase !== "reveal" && phase !== "scores" && phase !== "podium" && phase !== "end") {
        const { data: myAnswer } = await supabase
          .from("answers")
          .select("*")
          .eq("room_id", params.roomCode)
          .eq("question_index", roomData.current_question_index)
          .eq("player_id", playerId)
          .single();
        setMyResult(myAnswer);
        playSound("reveal");
        
        // Choisir le message UNE SEULE FOIS
        const isCorrect = myAnswer?.is_correct;
        const randomGood = GOOD_MESSAGES[Math.floor(Math.random() * GOOD_MESSAGES.length)];
        const randomBad = BAD_MESSAGES[Math.floor(Math.random() * BAD_MESSAGES.length)];
        setRevealMessage(isCorrect ? randomGood : randomBad);
        
        setPhase("reveal");
        setRevealTimer(5);
      }

      if (roomData.question_phase === "scores" && phase === "reveal") {
        setPhase("scores");
      }

      if (roomData.question_phase === "podium" && phase !== "podium" && phase !== "end") {
        setPhase("podium");
      }

      if (roomData.question_phase === "end") {
        setPhase("end");
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [params.roomCode, playerId, phase, questions, router]);

  // ============ TIMER QUI ACCÉLÈRE ============
  useEffect(() => {
    if (phase === "question" && timeLeft > 0) {
      if (timeLeft <= 10 && timeLeft > 5) {
        playSound("tick");
      } else if (timeLeft <= 5 && timeLeft > 2) {
        playSound("tick-fast");
      } else if (timeLeft <= 2) {
        playSound("tick-fast");
      }

      let delay = 1000;
      if (timeLeft <= 5) delay = 500;
      if (timeLeft <= 2) delay = 250;

      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), delay);
    } else if (phase === "question" && timeLeft === 0 && selectedAnswer === null) {
      submitAnswer(-1);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, phase]);

  // ============ TIMER DE RÉVÉLATION (5 sec) ============
  useEffect(() => {
    if (phase === "reveal") {
      setRevealTimer(5);
      revealTimerRef.current = setInterval(() => {
        setRevealTimer(prev => {
          if (prev <= 1) {
            if (revealTimerRef.current) clearInterval(revealTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const timeout = setTimeout(() => {
        if (isHost) {
          supabase.from("rooms").update({ question_phase: "scores" }).eq("id", params.roomCode);
        }
        setPhase("scores");
      }, 5000);

      return () => {
        if (revealTimerRef.current) clearInterval(revealTimerRef.current);
        clearTimeout(timeout);
      };
    }
  }, [phase, isHost, params.roomCode]);

  // ============ GÉNÉRER LES QUESTIONS (HOST) ============
  const generateQuestions = async () => {
    const { data: allQuestions } = await supabase
      .from("questions")
      .select("*")
      .limit(200);
    
    if (!allQuestions || allQuestions.length === 0) return [];

    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    const gameQuestions = shuffled.slice(0, totalQ).map((q, idx) => ({
      room_id: params.roomCode,
      question_index: idx,
      question_id: q.id,
      question_text: q.question,
      answer1: q.answer1,
      answer2: q.answer2,
      answer3: q.answer3,
      answer4: q.answer4,
      correct_answer: Number(q.correct_answer),
    }));

    const { error } = await supabase.from("game_questions").insert(gameQuestions);
    if (error) { console.error("Erreur:", error); return []; }
    return gameQuestions;
  };

  // ============ DÉMARRER LE JEU (HOST) ============
  const startGame = async () => {
    playSound("start");
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 🧹 NETTOYER l'ancienne partie
    await supabase.from("game_questions").delete().eq("room_id", params.roomCode);
    await supabase.from("answers").delete().eq("room_id", params.roomCode);
    await supabase.from("players").update({ score: 0 }).eq("room_id", params.roomCode);

    // 🔄 Incrémenter le game_round
    const { data: roomData } = await supabase.from("rooms").select("game_round").eq("id", params.roomCode).single();
    const newGameRound = (roomData?.game_round || 0) + 1;

    const gameQuestions = await generateQuestions();
    if (gameQuestions.length === 0) { alert("Erreur : pas de questions"); return; }

    await supabase.from("rooms").update({
      current_question_index: 0,
      question_phase: "question",
      game_round: newGameRound,
      status: "playing"
    }).eq("id", params.roomCode);

    questionsLoaded.current = false;
    gameStarted.current = false;
    lastQuestionIndex.current = -1;
    podiumShown.current = new Set();
    lastGameRound.current = newGameRound;

    setQuestions(gameQuestions);
    setCurrentQ(gameQuestions[0]);
    setQIndex(0);
    setTimeLeft(15);
    setSelectedAnswer(null);
    setMyResult(null);
    setRevealMessage("");
    setAnsweredCount(0);
    setPhase("question");
  };

  // ============ SOUMETTRE UNE RÉPONSE ============
  const submitAnswer = async (answerIndex: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSelectedAnswer(answerIndex);

    const isCorrect = answerIndex === Number(currentQ.correct_answer);
    const points = isCorrect ? Math.max(10, Math.floor((timeLeft / 15) * 100)) : 0;

    await supabase.from("answers").upsert({
      room_id: params.roomCode,
      question_index: qIndex,
      player_id: playerId,
      answer_index: answerIndex,
      is_correct: isCorrect,
      points: points,
      time_left: timeLeft,
    });

    const currentPlayer = players.find(p => p.id === playerId);
    const newScore = (currentPlayer?.score || 0) + points;
    
    await supabase.from("players").update({
      score: newScore,
      last_answer_correct: isCorrect,
      last_points: points,
    }).eq("id", playerId);

    setPhase("answered");

    if (isHost) {
      const checkInterval = setInterval(async () => {
        const { count: answered } = await supabase
          .from("answers")
          .select("*", { count: "exact", head: true })
          .eq("room_id", params.roomCode)
          .eq("question_index", qIndex);

        if (answered !== null && answered >= totalPlayers) {
          clearInterval(checkInterval);
          await supabase.from("rooms").update({ question_phase: "reveal" }).eq("id", params.roomCode);
        }
      }, 500);
    }
  };

  // ============ QUESTION SUIVANTE (HOST) ============
  const goToNextQuestion = async () => {
    const nextIdx = qIndex + 1;

    //  FIN DE PARTIE - Mise à jour des stats
    if (nextIdx >= questions.length) {
      await supabase.from("rooms").update({ question_phase: "end" }).eq("id", params.roomCode);
      
      // 📊 Mettre à jour les stats de l'utilisateur connecté
      const userId = localStorage.getItem("userId");
      if (userId) {
        // Trouver le score final du joueur actuel
        const currentPlayer = players.find(p => p.id === playerId);
        const finalScore = currentPlayer?.score || 0;
        
        // Le gagnant est celui qui a le plus de points (premier du classement trié)
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        const isWinner = sortedPlayers.length > 0 && sortedPlayers[0]?.id === playerId;
        
        const { data: currentStats } = await supabase
          .from("user_stats")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (currentStats) {
          await supabase
            .from("user_stats")
            .update({
              games_played: currentStats.games_played + 1,
              games_won: isWinner ? currentStats.games_won + 1 : currentStats.games_won,
              games_lost: !isWinner ? currentStats.games_lost + 1 : currentStats.games_lost,
              total_score: currentStats.total_score + finalScore,
              best_score: Math.max(currentStats.best_score, finalScore),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
      }
      
      setPhase("end");
      return;
    }

    // Si on vient du podium, on passe directement à la question suivante
    if (phase === "podium") {
      await supabase.from("rooms").update({
        current_question_index: nextIdx,
        question_phase: "question"
      }).eq("id", params.roomCode);

      lastQuestionIndex.current = nextIdx;
      setCurrentQ(questions[nextIdx]);
      setQIndex(nextIdx);
      setTimeLeft(15);
      setSelectedAnswer(null);
      setMyResult(null);
      setRevealMessage("");
      setAnsweredCount(0);
      setPhase("question");
      return;
    }

    // Sinon, vérifier si on doit afficher un podium (toutes les 5 questions)
    const questionNumber = nextIdx;
    if (questionNumber % 5 === 0 && !podiumShown.current.has(nextIdx - 1)) {
      podiumShown.current.add(nextIdx - 1);
      await supabase.from("rooms").update({ question_phase: "podium" }).eq("id", params.roomCode);
      setPhase("podium");
    } else {
      await supabase.from("rooms").update({
        current_question_index: nextIdx,
        question_phase: "question"
      }).eq("id", params.roomCode);

      lastQuestionIndex.current = nextIdx;
      setCurrentQ(questions[nextIdx]);
      setQIndex(nextIdx);
      setTimeLeft(15);
      setSelectedAnswer(null);
      setMyResult(null);
      setRevealMessage("");
      setAnsweredCount(0);
      setPhase("question");
    }
  };

  // ============ RETOUR AU SALON (HOST) ============
  const returnToLobby = async () => {
    await supabase
      .from("rooms")
      .update({ status: "waiting", question_phase: "waiting", current_question_index: 0 })
      .eq("id", params.roomCode);
    
    router.push(`/room/${params.roomCode}?playerId=${playerId}`);
  };

  // ============ QUITTER (TOUS LES JOUEURS) ============
  const quitGame = () => {
    router.push("/");
  };

  // ============ RENDU ============

  if (phase === "intro") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
        <div className="text-6xl mb-6 animate-bounce"></div>
        <h1 className="text-4xl md:text-6xl font-black mb-4 text-green-400 text-center">MASTER BLAST!</h1>
        <p className="text-xl text-green-300 mb-4 text-center">{totalQ} questions • 15 secondes chacune • Max 100 pts</p>
        <p className="text-lg text-green-300 mb-8 text-center">{totalPlayers} joueur{totalPlayers > 1 ? "s" : ""} prêt{totalPlayers > 1 ? "s" : ""}</p>

        {(room?.host_id === playerId || localStorage.getItem("userId") === room?.host_id) ? (
          <button onClick={startGame} className="bg-green-400 text-black hover:bg-green-300 font-black py-4 px-12 rounded-xl text-2xl shadow-[0_0_20px_rgba(74,222,128,0.5)] border-b-4 border-green-600 animate-pulse">
            COMMENCER ! 🚀
          </button>
        ) : (
          <div className="text-yellow-400 text-xl font-bold animate-pulse"> En attente que le host commence...</div>
        )}
      </div>
    );
  }

  if (phase === "question" && currentQ) {
    const progress = ((qIndex + 1) / totalQ) * 100;
    const timerPercent = (timeLeft / 15) * 100;
    const timerColor = timeLeft > 10 ? "bg-green-400" : timeLeft > 5 ? "bg-yellow-400" : "bg-red-500";

    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
        <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
          <div className="bg-green-400 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="text-center text-green-300 font-bold mb-2">Question {qIndex + 1} / {totalQ}</div>

        <div className="w-full bg-gray-800 rounded-full h-4 mb-4">
          <div className={`${timerColor} h-4 rounded-full transition-all`} style={{ width: `${timerPercent}%` }}></div>
        </div>
        <div className={`text-center text-5xl font-black mb-6 ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-green-400"}`}>
          ⏱️ {timeLeft}s
        </div>

        <div className="bg-black border-2 border-green-400 rounded-2xl p-6 mb-6 text-center">
          <p className="text-xl md:text-2xl font-bold text-white">{currentQ.question_text}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto w-full">
          {[currentQ.answer1, currentQ.answer2, currentQ.answer3, currentQ.answer4].map((answer, idx) => (
            <button
              key={idx}
              onClick={() => submitAnswer(idx + 1)}
              disabled={selectedAnswer !== null}
              className={`${COLORS[idx].bg} ${COLORS[idx].hover} ${COLORS[idx].border} border-b-4 text-white font-black py-4 px-6 rounded-xl text-lg md:text-xl transition-all active:scale-95 disabled:opacity-50`}
            >
              <span className="mr-2 bg-black/30 rounded-full w-8 h-8 inline-flex items-center justify-center">{COLORS[idx].label}</span>
              {answer}
            </button>
          ))}
        </div>

        <div className="text-center mt-4 text-yellow-400 font-bold">
          {answeredCount} / {totalPlayers} joueurs ont répondu
        </div>
      </div>
    );
  }

  if (phase === "answered") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
        <div className="text-6xl mb-6 animate-pulse">⏳</div>
        <h2 className="text-3xl font-black text-yellow-400 mb-4">Réponse envoyée !</h2>
        <p className="text-xl text-green-300 text-center mb-4">En attente des autres joueurs...</p>
        <p className="text-yellow-400 font-bold text-2xl">{answeredCount} / {totalPlayers} ont répondu</p>
      </div>
    );
  }

  if (phase === "reveal" && currentQ) {
    const isCorrect = myResult?.is_correct;
    const points = myResult?.points || 0;
    const correctAnswerIndex = Number(currentQ.correct_answer);
    const myAnswerIndex = myResult?.answer_index;
    const message = revealMessage;

    const getAnswerStyle = (idx: number) => {
      const answerNum = idx + 1;
      const isCorrectAnswer = answerNum === correctAnswerIndex;
      const isMyAnswer = answerNum === myAnswerIndex;

      if (isCorrectAnswer) return "bg-green-500 border-green-300 scale-105 shadow-[0_0_20px_rgba(74,222,128,0.6)]";
      if (isMyAnswer && !isCorrectAnswer) return "bg-red-600 border-red-400 opacity-90";
      return "bg-gray-700 border-gray-600 opacity-50";
    };

    const getAnswerLabel = (idx: number) => {
      const answerNum = idx + 1;
      const isCorrectAnswer = answerNum === correctAnswerIndex;
      const isMyAnswer = answerNum === myAnswerIndex;

      if (isCorrectAnswer) return "✅";
      if (isMyAnswer && !isCorrectAnswer) return "❌";
      return COLORS[idx].label;
    };

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
        <div className={`text-3xl md:text-4xl font-black mb-4 text-center ${isCorrect ? "text-green-400" : "text-red-400"}`}>
          {message}
        </div>

        {isCorrect && <div className="text-5xl font-black text-yellow-400 mb-6">+{points} pts</div>}

        <div className="bg-black border-2 border-green-400 rounded-2xl p-4 mb-6 text-center max-w-2xl w-full">
          <p className="text-lg md:text-xl font-bold text-white">{currentQ.question_text}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto w-full mb-6">
          {[currentQ.answer1, currentQ.answer2, currentQ.answer3, currentQ.answer4].map((answer, idx) => (
            <div
              key={idx}
              className={`${getAnswerStyle(idx)} border-2 rounded-xl py-4 px-6 text-lg md:text-xl font-black flex items-center justify-between transition-all`}
            >
              <span className="mr-2 bg-black/30 rounded-full w-8 h-8 inline-flex items-center justify-center text-sm">
                {getAnswerLabel(idx)}
              </span>
              <span className="flex-1">{answer}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-4 text-sm text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span> Bonne réponse
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-600 rounded-full"></span> Ta réponse
          </span>
        </div>

        <div className="text-2xl font-black text-yellow-400 animate-pulse">
          Scores dans {revealTimer}s...
        </div>
      </div>
    );
  }

  if (phase === "scores") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
        <h2 className="text-4xl font-black mb-8 text-green-400">📊 CLASSEMENT</h2>
        <div className="w-full max-w-md mb-8">
          <div className="space-y-3">
            {players.slice(0, 5).map((p, idx) => (
              <div key={p.id} className={`bg-black border-2 rounded-xl py-3 px-5 flex justify-between items-center ${p.id === playerId ? "border-yellow-400 scale-105" : "border-green-400"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-gray-400">{idx + 1}</span>
                  <span className="font-bold text-white text-xl">{p.name}</span>
                  {p.id === playerId && <span className="text-yellow-400">👈</span>}
                </div>
                <span className="font-black text-yellow-400 text-xl">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
        {isHost && (
          <button onClick={goToNextQuestion} className="bg-green-400 text-black hover:bg-green-300 font-black py-4 px-12 rounded-xl text-xl border-b-4 border-green-600">
            QUESTION SUIVANTE ➡️
          </button>
        )}
        {!isHost && <p className="text-yellow-400 text-lg font-bold animate-pulse">⏳ En attente du host...</p>}
      </div>
    );
  }

  if (phase === "podium") {
    const top3 = players.slice(0, 3);
    const bottom3 = [...players].sort((a, b) => a.score - b.score).slice(0, 3);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-4xl md:text-5xl font-black mb-8 text-yellow-400 text-center">CLASSEMENT INTERMÉDIAIRE</h1>

        <div className="w-full max-w-md mb-8">
          <h2 className="text-2xl font-black text-green-400 mb-4 text-center">🥇 LES MEILLEURS</h2>
          <div className="space-y-3">
            {top3.map((p, idx) => {
              const medals = ["🥇", "🥈", ""];
              const colors = ["text-yellow-400", "text-gray-300", "text-orange-400"];
              return (
                <div key={p.id} className={`bg-black border-2 border-green-400 rounded-xl py-4 px-5 flex items-center justify-between ${idx === 0 ? "scale-105 shadow-[0_0_20px_rgba(250,204,21,0.3)]" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{medals[idx]}</span>
                    <span className={`font-black text-xl ${colors[idx]}`}>{p.name}</span>
                  </div>
                  <span className="font-black text-yellow-400 text-xl">{p.score} pts</span>
                </div>
              );
            })}
          </div>
        </div>

        {players.length >= 3 && (
          <div className="w-full max-w-md mb-8">
            <h2 className="text-2xl font-black text-red-400 mb-4 text-center">🗑️ LES MOINS BONS</h2>
            <div className="space-y-3">
              {bottom3.map((p, idx) => {
                const emojis = ["💀", "🤡", "😢"];
                const msg = BOTTOM_MESSAGES[idx % BOTTOM_MESSAGES.length];
                return (
                  <div key={p.id} className="bg-black border-2 border-red-400 rounded-xl py-3 px-5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{emojis[idx]}</span>
                        <span className="font-black text-red-400">{p.name}</span>
                      </div>
                      <span className="font-black text-red-300">{p.score} pts</span>
                    </div>
                    <p className="text-sm text-gray-400 italic text-center">{msg}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isHost && (
          <button onClick={goToNextQuestion} className="bg-green-400 text-black hover:bg-green-300 font-black py-4 px-12 rounded-xl text-xl border-b-4 border-green-600">
            CONTINUER ➡️
          </button>
        )}
        {!isHost && <p className="text-yellow-400 text-lg font-bold animate-pulse">⏳ En attente du host...</p>}
      </div>
    );
  }

  if (phase === "end") {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    const bottom3 = [...players].sort((a, b) => a.score - b.score).slice(0, 3);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-black text-white p-4">
        <div className="text-8xl mb-4 animate-bounce">🏆</div>
        <h1 className="text-4xl md:text-6xl font-black mb-4 text-yellow-400 text-center">PARTIE TERMINÉE !</h1>
        {winner && <div className="text-2xl md:text-3xl font-black text-green-400 mb-8 text-center">🎉 {winner.name} remporte la partie avec {winner.score} pts ! 🎉</div>}

        <div className="w-full max-w-md mb-8">
          <h2 className="text-2xl font-black text-green-400 mb-4 text-center"> PODIUM FINAL</h2>
          <div className="space-y-3">
            {sortedPlayers.slice(0, 3).map((p, idx) => {
              const medals = ["", "🥈", "🥉"];
              return (
                <div key={p.id} className={`bg-black border-2 border-green-400 rounded-xl py-4 px-5 flex items-center justify-between ${idx === 0 ? "scale-105 shadow-[0_0_20px_rgba(250,204,21,0.5)]" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{medals[idx]}</span>
                    <span className="font-black text-xl text-white">{p.name}</span>
                  </div>
                  <span className="font-black text-yellow-400 text-xl">{p.score} pts</span>
                </div>
              );
            })}
          </div>
        </div>

        {players.length >= 3 && (
          <div className="w-full max-w-md mb-8">
            <h2 className="text-2xl font-black text-red-400 mb-4 text-center">🗑️ LES NULS</h2>
            <div className="space-y-3">
              {bottom3.map((p, idx) => {
                const emojis = ["💀", "🤡", "😢"];
                const msg = BOTTOM_MESSAGES[idx % BOTTOM_MESSAGES.length];
                return (
                  <div key={p.id} className="bg-black border-2 border-red-400 rounded-xl py-3 px-5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{emojis[idx]}</span>
                        <span className="font-black text-red-400">{p.name}</span>
                      </div>
                      <span className="font-black text-red-300">{p.score} pts</span>
                    </div>
                    <p className="text-sm text-gray-400 italic text-center">{msg}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isHost ? (
          <button onClick={returnToLobby} className="bg-green-400 text-black hover:bg-green-300 font-black py-4 px-12 rounded-xl text-xl border-b-4 border-green-600">
            RETOUR AU SALON 🏠
          </button>
        ) : (
          <div className="space-y-4">
            {waitingForHost ? (
              <div className="text-center">
                <p className="text-yellow-400 text-lg font-bold animate-pulse mb-4">⏳ En attente que le host retourne au salon...</p>
                <button onClick={quitGame} className="bg-red-500 text-white hover:bg-red-400 font-black py-3 px-8 rounded-xl text-lg border-b-4 border-red-700">
                  QUITTER LE SALON 🚪
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-green-300 mb-4">Que veux-tu faire ?</p>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => setWaitingForHost(true)} 
                    className="bg-blue-500 text-white hover:bg-blue-400 font-black py-3 px-6 rounded-xl text-lg border-b-4 border-blue-700"
                  >
                    ATTENDRE ⏳
                  </button>
                  <button 
                    onClick={quitGame} 
                    className="bg-red-500 text-white hover:bg-red-400 font-black py-3 px-6 rounded-xl text-lg border-b-4 border-red-700"
                  >
                    QUITTER 🚪
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}