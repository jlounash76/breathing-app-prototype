// ✅ Full fixed code
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import SpiralRibbon from "./SpiralRibbon";

// [Constants and helpers would go here, assuming you have them in the file already]

export default function BreathingCircle() {
  const [preset, setPreset] = useState(PRESET_KEYS[0]);
  const [unitSeconds, setUnitSeconds] = useState(4);
  const [rounds, setRounds] = useState(20);
  const [phaseIndex, setPhaseIndex] = useState(null);
  const [scale, setScale] = useState(1);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [useBeep, setUseBeep] = useState(false);
  const [voiceType, setVoiceType] = useState("male");
  const [visualMode, setVisualMode] = useState("circle");
  const [musicOn, setMusicOn] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [countdownPausedStep, setCountdownPausedStep] = useState(null);
  const [showPremiumPage, setShowPremiumPage] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [bgVolume, setBgVolume] = useState(0);
  const [fxVolume, setFxVolume] = useState(1);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [modalReturnTarget, setModalReturnTarget] = useState(null);
  const [roundCounter, setRoundCounter] = useState(0);
  const [countdownStep, setCountdownStep] = useState(null);
  const [configStep, setConfigStep] = useState(0);
  const [phaseSecond, setPhaseSecond] = useState(0);
  const [unitPreviewScale, setUnitPreviewScale] = useState(SCALE_SMALL);

  const phaseStartRef = useRef(null);
  const phaseDurationRef = useRef(1);
  const pauseElapsedRef = useRef(0);
  const resumeFromPauseRef = useRef(false);
  const prevPhaseIndexRef = useRef(null);
  const previewInitializedRef = useRef(false);
  const settingsPauseRef = useRef({
    pausedCountdown: false,
    pausedBreathing: false,
  });

  const audioRefs = {
    male: {
      inhale: useRef(null),
      hold: useRef(null),
      exhale: useRef(null),
    },
    female: {
      inhale: useRef(null),
      hold: useRef(null),
      exhale: useRef(null),
    },
  };

  const beepRefs = {
    inhale: useRef(null),
    hold: useRef(null),
    exhale: useRef(null),
  };

  const backgroundMusicRef = useRef(null);
  const currentAudioRef = useRef(null);
  const audioReadyRef = useRef(false);

  const isCountdownActive =
    (countdownStep !== null && countdownStep < COUNTDOWN_SEQUENCE.length) ||
    countdownPausedStep !== null;

  const unlockAudioOnce = async () => {
    const sample =
      (useBeep
        ? beepRefs.inhale?.current
        : audioRefs[voiceType]?.inhale?.current) ??
      audioRefs.male?.inhale?.current;

    if (!sample) return;

    try {
      sample.preload = "auto";
      sample.load?.();
      const prevVolume = sample.volume;
      sample.volume = 0;
      await sample.play();
      sample.pause();
      sample.currentTime = 0;
      sample.volume = prevVolume;
    } catch {}
  };

  const primeVoiceAudio = async () => {
    const voiceSet = audioRefs[voiceType] ?? audioRefs.male;
    const toPrime = [voiceSet.inhale?.current, voiceSet.hold?.current, voiceSet.exhale?.current].filter(Boolean);
    for (const el of toPrime) {
      try {
        el.preload = "auto";
        el.load?.();
        const prevVolume = el.volume;
        el.volume = 0;
        await el.play();
        el.pause();
        el.currentTime = 0;
        el.volume = prevVolume;
      } catch {}
    }
  };

  const unlockAndPreloadAudio = async () => {
    const all = [];

    for (const set of Object.values(audioRefs)) {
      for (const ref of Object.values(set)) {
        if (ref?.current) all.push(ref.current);
      }
    }

    for (const ref of Object.values(beepRefs)) {
      if (ref?.current) all.push(ref.current);
    }

    if (backgroundMusicRef?.current) {
      all.push(backgroundMusicRef.current);
    }

    await Promise.allSettled(
      all.map(async (el) => {
        try {
          el.preload = "auto";
          el.load?.();
          const prevVolume = el.volume;
          el.volume = 0;
          await el.play();
          el.pause();
          el.currentTime = 0;
          el.volume = prevVolume;
        } catch {}
      })
    );
  };

  const startExercise = async () => {
    await unlockAudioOnce();
    if (!useBeep) {
      await primeVoiceAudio();
    }
    await unlockAndPreloadAudio(); // ✅ Ensures preload before phase

    resetPauseState();
    setRoundCounter(0);
    setPhaseIndex(null);
    setPhaseSecond(0);
    setPhaseProgress(0);
    setScale(SCALE_SMALL);
    setCountdownStep(0);
    setConfigStep(null);
  };

  // ... All your breathing logic and rendering code here ...

  useEffect(() => {
    if (
      !running ||
      phaseIndex === null ||
      !soundOn ||
      isPaused ||
      !audioReadyRef.current ||
      isCountdownActive
    ) {
      return;
    }

    const prev = prevPhaseIndexRef.current;
    prevPhaseIndexRef.current = phaseIndex;
    if (prev === phaseIndex) return;

    const phaseName = getPhaseNameForPreset(preset, phaseIndex);
    if (!phaseName) return;

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }

    let el = null;
    if (useBeep) {
      el = beepRefs[phaseName]?.current ?? null;
    } else {
      const voiceSet = audioRefs[voiceType] ?? audioRefs.male;
      el = voiceSet?.[phaseName]?.current ?? null;
    }

    if (!el) return;
    currentAudioRef.current = el;

    setTimeout(() => {
      try {
        el.currentTime = 0;
        const p = el.play();
        if (p?.catch) p.catch(() => {});
      } catch {}
    }, 0);
  }, [running, phaseIndex, soundOn, isPaused, preset, voiceType, useBeep, isCountdownActive]);

  return (
    <div className="flex flex-col items-center w-full text-slate-900 px-4 gap-8 min-h-[85vh]">
      {/* Render logic and breathing animation components... */}
      {/* Audio elements with preload="auto" */}
      <audio ref={audioRefs.male.inhale} preload="auto" src="/sounds/Breathe in M.mp3" />
      <audio ref={audioRefs.male.hold} preload="auto" src="/sounds/Hold M.mp3" />
      <audio ref={audioRefs.male.exhale} preload="auto" src="/sounds/Breathe out M.mp3" />

      <audio ref={audioRefs.female.inhale} preload="auto" src="/sounds/Breathe in F.mp3" />
      <audio ref={audioRefs.female.hold} preload="auto" src="/sounds/Hold F.mp3" />
      <audio ref={audioRefs.female.exhale} preload="auto" src="/sounds/Breathe out F.mp3" />

      <audio ref={beepRefs.inhale} preload="auto" src="/sounds/Vibraphone IN.mp3" />
      <audio ref={beepRefs.hold} preload="auto" src="/sounds/Vibraphone HOLD.mp3" />
      <audio ref={beepRefs.exhale} preload="auto" src="/sounds/Vibraphone OUT.mp3" />

      <audio ref={backgroundMusicRef} preload="auto" src="/sounds/BG music 1.mp3" />
    </div>
  );
}
