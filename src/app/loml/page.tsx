"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Heart,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowLeft,
  MessageCircleHeart,
} from "lucide-react";

const ASCII_LINES = [
  "=========-:.     .........::-=+********###**+**+=:.      .:-=====++**#####*+--=*##############%%%%%%",
  "=======-:           .........::-=+***####*+-..:.        ........::-=+****#*=-=+*###########%%%%%%%%@",
  "=====-:                  .....::::=**####*=. ..             .     ..:-=+***=-=*#######%%%%%%%%%%%%%%",
  "====-.                   ..::--====+*##*+=-:                        ...:-==--+*####%%%%%%%%%%%%%%%%%",
  "===-.                    .:-==+*******#*+=-:....                       .::---+##%%%%%%%%%%%%%%%%%%%%",
  "===:                     .:-=+*********+++-..   ...                    .:-=-=*#%%%%%%%%%%%%%%%%%%%%%",
  "===-                     .:=++++*****+=+-:::...........                 .:-=+*%%%%%%%%%%%%%%%%%%%%%#",
  "===-.                   ..:-===++***++=:..::.............               .::=+#%%%%%#%%%%%%%%##*#%%##",
  "===-:                   .::-----===+++==-......:::::::::..              :-=+*##**+++++***+++*#%#####",
  "====-.                 ..:::.:-===:--++*+=-::::::-----:::.            ..:===+++=====++======+*###%##",
  "=====-.              ......::-----:::-=++=:.::::::-----:..           ...::---==--::.:-==++=---===+++",
  "======:.            ..:::::::-=++*+-:---=:. ..:::::----=--:.....    .::::::-----::.   .:::-===-:.-=+",
  "======-:             ..:::::--=++**=--=++-.  ..:::::-----::.....    .:-==-----::..   ..   ...:..:---",
  "-::::::..    ..... .....:::::--=+++--=+**+-.......:::::.::::..      .:=+*##*+=:..            .....",
  ".........     ............:::::-=+=----=+*=:.........:...          .:-=+*####*=:.   .        ...",
  "    .   .....      ...  ....:::-===---=++-:...............        .=**++*****+=--:--:.      ..",
  "      ........        .    ...::-=-::-----:.         ...:.        .:=++*=-::::---------:.  .:-:.",
  "..    ..:::..             ....:-=++====-.       ..    ...           ...::......::------===---:.....:",
  "...... ..:..           ......::-===-:.                                 ..........:::-=========:.  .-",
  "....     .:..         .......:::-----:.                                      ......:---==+**##*=:-+*",
  ".....    ....        ...........:::::::::::---:.                                 ...:=+***#####***##",
  "......    ....      ....................:--====-:.                                   ..:--=+********",
  "::......:-----.     ....................:::----==-.                                         .-+*****",
  ":::....:--==--.    .......................:::---=--.                                       .....:-++",
  ".......:-===-:     ........................:::------.",
  "......:-====:.     ...........................::----:.",
  "......:-===-.       ...........................::----:.",
  "......:-==-.        .........     ... ...........::---:.                   ..::.",
  "......:-==:.        ......        ...           ..::::::.                 .:-+*+-.",
  "......:-=-::. ..... .....          .             ...:::....               .:=+*#*+-.",
  "......:-====--:::........                          .........              .:+***#***+=-::.",
  "......:-==--==--:.......                               ...::               .=+*#*****####*+-.",
  ".....::--------::.......                                ..:-=:             .-+****+*##**####*=.",
  "......:-------::...                                    ..:=++++=--:.      ..-=+*++*##########**+=.",
];

type ColorTheme = "rose" | "candlelight" | "aurora" | "cyber" | "monochrome";
type AnimationMode = "breathe" | "heartbeat" | "shimmer" | "static";

export default function LomlPage() {
  const [theme, setTheme] = useState<ColorTheme>("rose");
  const [animMode, setAnimMode] = useState<AnimationMode>("breathe");
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [revealedLines, setRevealedLines] = useState<number>(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const asciiContainerRef = useRef<HTMLDivElement | null>(null);

  // Progressive line reveal on page entrance
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setRevealedLines(current);
      if (current >= ASCII_LINES.length) {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Ambient floating hearts & starlight particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      type: "heart" | "star";
    }

    const particles: Particle[] = Array.from({ length: 36 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 12 + 6,
      speedY: -Math.random() * 0.7 - 0.2,
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.6 + 0.2,
      type: Math.random() > 0.4 ? "heart" : "star",
    }));

    const drawHeart = (x: number, y: number, size: number, color: string) => {
      ctx.save();
      ctx.beginPath();
      ctx.translate(x, y);
      const topCurveHeight = size * 0.3;
      ctx.moveTo(0, topCurveHeight);
      ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
      ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, size, 0, size);
      ctx.bezierCurveTo(0, size, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
      ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    };

    const drawStar = (x: number, y: number, size: number, color: string) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        let baseColor = "rgba(251, 113, 133, ";
        if (theme === "candlelight") baseColor = "rgba(251, 191, 36, ";
        if (theme === "aurora") baseColor = "rgba(52, 211, 153, ";
        if (theme === "cyber") baseColor = "rgba(217, 70, 239, ";
        if (theme === "monochrome") baseColor = "rgba(229, 231, 235, ";

        const color = `${baseColor}${p.opacity * 0.5})`;

        if (p.type === "heart") {
          drawHeart(p.x, p.y, p.size, color);
        } else {
          drawStar(p.x, p.y, p.size, color);
        }
      });

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrame);
    };
  }, [theme]);

  // Ambient Web Audio Chime Generator (Zero External Dependency)
  const toggleSound = () => {
    if (isPlayingSound) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsPlayingSound(false);
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Pentatonic warm frequencies (C-major / A-minor celestial notes)
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
      let noteIndex = 0;

      const playChime = () => {
        if (!audioContextRef.current || audioContextRef.current.state === "closed") return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const freq = notes[noteIndex % notes.length];
        noteIndex = (noteIndex + 1) % notes.length;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 3.3);

        setTimeout(playChime, 1800 + Math.random() * 800);
      };

      playChime();
      setIsPlayingSound(true);
    } catch (e) {
      console.warn("Audio unavailable:", e);
    }
  };

  const copyToClipboard = () => {
    const fullText = ASCII_LINES.join("\n");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Color Palette Definitions
  const palette = useMemo(() => {
    switch (theme) {
      case "candlelight":
        return {
          name: "Candlelight",
          highDensity: "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-bold",
          midDensity: "text-amber-400/90",
          lowDensity: "text-amber-600/50",
          border: "border-amber-500/30",
          glow: "rgba(251, 191, 36, 0.15)",
          badge: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        };
      case "aurora":
        return {
          name: "Aurora",
          highDensity: "text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] font-bold",
          midDensity: "text-teal-400/90",
          lowDensity: "text-emerald-700/50",
          border: "border-emerald-500/30",
          glow: "rgba(52, 211, 153, 0.15)",
          badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        };
      case "cyber":
        return {
          name: "Neon Cyber",
          highDensity: "text-fuchsia-300 drop-shadow-[0_0_10px_rgba(217,70,239,0.7)] font-bold",
          midDensity: "text-cyan-400/90",
          lowDensity: "text-purple-700/50",
          border: "border-fuchsia-500/30",
          glow: "rgba(217, 70, 239, 0.15)",
          badge: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30",
        };
      case "monochrome":
        return {
          name: "Pure Silver",
          highDensity: "text-zinc-100 drop-shadow-[0_0_6px_rgba(255,255,255,0.4)] font-bold",
          midDensity: "text-zinc-300/80",
          lowDensity: "text-zinc-600/40",
          border: "border-zinc-700/40",
          glow: "rgba(255, 255, 255, 0.08)",
          badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
        };
      case "rose":
      default:
        return {
          name: "Rose Romance",
          highDensity: "text-rose-300 drop-shadow-[0_0_9px_rgba(251,113,133,0.7)] font-bold",
          midDensity: "text-pink-400/90",
          lowDensity: "text-rose-700/50",
          border: "border-rose-500/30",
          glow: "rgba(244, 63, 94, 0.15)",
          badge: "bg-rose-500/10 text-rose-300 border-rose-500/30",
        };
    }
  }, [theme]);

  // Animation class based on chosen mode
  const animClass = useMemo(() => {
    switch (animMode) {
      case "heartbeat":
        return "animate-[pulse_1.2s_ease-in-out_infinite]";
      case "shimmer":
        return "animate-[pulse_3s_ease-in-out_infinite]";
      case "breathe":
        return "animate-[pulse_4s_ease-in-out_infinite]";
      case "static":
      default:
        return "";
    }
  }, [animMode]);

  return (
    <div className="relative min-h-screen bg-[#07090D] text-zinc-200 overflow-x-hidden selection:bg-rose-500 selection:text-white flex flex-col justify-between font-sans">
      {/* Background Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* Ambient Gradient Glows */}
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[140px] pointer-events-none transition-colors duration-1000 z-0"
        style={{ backgroundColor: palette.glow }}
      />

      {/* Top Header Navigation */}
      <header className="relative z-10 border-b border-zinc-900/80 bg-[#07090D]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-bounce" />
            <span className="font-semibold text-sm tracking-wide text-white">
              Love of My Life
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${palette.badge}`}>
              ASCII Portrait
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Button */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
              isPlayingSound
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
            title={isPlayingSound ? "Mute ambient chimes" : "Play ambient music box"}
          >
            {isPlayingSound ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="hidden sm:inline text-[11px]">Music Box</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Sound Off</span>
              </>
            )}
          </button>

          {/* Love Note Toggle */}
          <button
            onClick={() => setShowNote(!showNote)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
              showNote
                ? "bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20"
                : "border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <MessageCircleHeart className="w-3.5 h-3.5" />
            <span>{showNote ? "Hide Note" : "Read Note 💌"}</span>
          </button>

          {/* Copy ASCII */}
          <button
            onClick={copyToClipboard}
            className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
            title="Copy ASCII to Clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-6xl mx-auto w-full">
        {/* Floating Custom Love Note Card */}
        {showNote && (
          <div className="w-full max-w-xl mb-6 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-rose-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-2xl shadow-rose-950/40 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="w-4 h-4" />
                <span>A Letter To You</span>
              </div>
              <button
                onClick={() => setShowNote(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-sm sm:text-base text-zinc-200 leading-relaxed font-serif italic mb-4">
              &ldquo;In thousands of lines of code, infinite logic, and endless quiet hours,
              every heartbeat leads back to you. You are my favorite thought, my safest home,
              and the love of my life.&rdquo;
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs text-zinc-400">
              <span>Forever & Always</span>
              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                <Heart className="w-3.5 h-3.5 fill-rose-400" /> Us
              </span>
            </div>
          </div>
        )}

        {/* Floating Controls Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 p-2 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-md">
          {/* Themes */}
          <div className="flex items-center gap-1 bg-zinc-950/70 p-1 rounded-xl border border-zinc-800/50">
            {(["rose", "candlelight", "aurora", "cyber", "monochrome"] as ColorTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg capitalize transition-all ${
                  theme === t
                    ? "bg-zinc-800 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Animation Modes */}
          <div className="flex items-center gap-1 bg-zinc-950/70 p-1 rounded-xl border border-zinc-800/50">
            {(["breathe", "heartbeat", "shimmer", "static"] as AnimationMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setAnimMode(m)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg capitalize transition-all ${
                  animMode === m
                    ? "bg-zinc-800 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Animated ASCII Canvas Card */}
        <div
          ref={asciiContainerRef}
          onMouseMove={(e) => {
            const rect = asciiContainerRef.current?.getBoundingClientRect();
            if (rect) {
              setMousePos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }
          }}
          onMouseLeave={() => setMousePos(null)}
          className={`relative p-4 sm:p-8 rounded-3xl bg-black/60 border ${palette.border} backdrop-blur-2xl shadow-2xl transition-all duration-700 overflow-hidden flex flex-col items-center justify-center max-w-full`}
        >
          {/* Interactive Mouse Halo */}
          {mousePos && (
            <div
              className="pointer-events-none absolute w-56 h-56 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 opacity-30"
              style={{
                left: mousePos.x,
                top: mousePos.y,
                background: `radial-gradient(circle, ${palette.glow} 0%, transparent 70%)`,
              }}
            />
          )}

          {/* CRT Scanline overlay effect */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-25" />

          {/* ASCII Text Container */}
          <pre
            className={`font-mono select-none tracking-tight leading-[1.08] text-[7.5px] xs:text-[9px] sm:text-[11px] md:text-[13px] lg:text-[14px] transition-all duration-300 ${animClass}`}
            style={{ textShadow: `0 0 12px ${palette.glow}` }}
          >
            {ASCII_LINES.map((line, rowIndex) => {
              if (rowIndex >= revealedLines) return null;

              return (
                <div key={rowIndex} className="whitespace-pre flex justify-center">
                  {line.split("").map((char, colIndex) => {
                    // Density-based aesthetic coloring
                    let charColor = palette.lowDensity;
                    if (["#", "%", "@"].includes(char)) {
                      charColor = palette.highDensity;
                    } else if (["*", "+"].includes(char)) {
                      charColor = palette.midDensity;
                    }

                    return (
                      <span
                        key={colIndex}
                        className={`transition-colors duration-150 inline-block hover:scale-125 hover:text-white ${charColor}`}
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </pre>

          {/* Progress bar during initial reveal */}
          {revealedLines < ASCII_LINES.length && (
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Rendering memories... ({Math.round((revealedLines / ASCII_LINES.length) * 100)}%)</span>
            </div>
          )}
        </div>

        {/* Bottom Subtitle / Captions */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-xs sm:text-sm font-medium text-zinc-400 flex items-center justify-center gap-1.5">
            <span>Rendered in pure ASCII</span>
            <span>·</span>
            <span className="text-zinc-200">You & Me</span>
            <span>·</span>
            <span className="text-rose-400 font-semibold">Together Always</span>
          </p>
          <p className="text-[11px] text-zinc-600">
            Hover over the portrait to interact · Click &quot;Music Box&quot; for ambient chimes
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 border-t border-zinc-900/60 text-center text-xs text-zinc-600">
        Made with ❤️ for the love of my life
      </footer>
    </div>
  );
}
