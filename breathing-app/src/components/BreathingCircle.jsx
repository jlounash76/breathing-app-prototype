import { useState, useEffect } from "react";

export default function BreathingCircle() {
  const [phase, setPhase] = useState("inhale");
  const [size, setSize] = useState(100);  // circle size in px

  // Inhale/Hold/Exhale durations (seconds)
  const inhale = 4;
  const hold = 2;
  const exhale = 4;

  useEffect(() => {
    let timer;

    if (phase === "inhale") {
      setSize(250); // expand
      timer = setTimeout(() => setPhase("hold"), inhale * 1000);
    }

    if (phase === "hold") {
      timer = setTimeout(() => setPhase("exhale"), hold * 1000);
    }

    if (phase === "exhale") {
      setSize(100); // shrink
      timer = setTimeout(() => setPhase("inhale"), exhale * 1000);
    }

    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="rounded-full bg-blue-400 transition-all duration-1000"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      ></div>

      <p className="text-xl capitalize">
        {phase === "inhale" && "🫁 Inhale"}
        {phase === "hold" && "⏸ Hold"}
        {phase === "exhale" && "😮‍💨 Exhale"}
      </p>
    </div>
  );
}
