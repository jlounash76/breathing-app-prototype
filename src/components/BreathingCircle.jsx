import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import SpiralRibbon from "./SpiralRibbon";

// Preset definitions (ratio units)
const PRESETS = {
  "1:1 Balance": [1, 0, 1],
  "1:2 Relax": [1, 0, 2],
  "1:1:1 Triangle 1": [1, 1, 1],
  "1:1:1 Triangle 2": [1, 1, 1],
  "1:1:1:1 Box": [1, 1, 1, 1],
  "2:5 Perform": [1, 2.5],
  "1:4:2 Calm": [1, 4, 2],
  "1:4:2:2 Unwind": [1, 4, 2, 2],
  "4:7:8 Dream": [1, 1.75, 2],
};
const PHASE_MAP = {
  inhale: "inhale",
  hold: "hold",
  exhale: "exhale",
};

const PHASE_NAMES = ["inhale", "hold", "exhale", "hold"];
const PHASE_LABELS = {
  inhale: "Breathe in",
  exhale: "Breathe out",
  hold: "Hold",
};
const PHASE_SEQUENCE_OVERRIDES = {
  "1:1:1 Triangle 2": ["inhale", "exhale", "hold"],
};
const getPhaseNameForPreset = (presetName, phaseIdx) => {
  const override = PHASE_SEQUENCE_OVERRIDES[presetName];
  if (override && override[phaseIdx]) return override[phaseIdx];
  return PHASE_NAMES[phaseIdx];
};
const COUNTDOWN_SEQUENCE = ["Ready", "Set", "Go!"];
const SCALE_SMALL = 0.2;
const SCALE_BIG = 1;

const CORE_PRESETS = [
  "1:1 Balance",
  "1:2 Relax",
  "1:1:1 Triangle 1",
  "1:1:1 Triangle 2",
  "1:1:1:1 Box",
];
const PREMIUM_OPERATIONAL_PRESETS = [
  "1:4:2 Calm",
  "1:4:2:2 Unwind",
  "4:7:8 Dream",
];
const PREMIUM_LOCKED_PRESETS = ["Custom pattern", "Full body relaxation"];
const YOGIC_LOCKED_PRESETS = [
  "Cycle breathing",
  "Kapālabhāti",
  "Śītalī",
  "Sītkārī",
  "Bheda–Abheda",
  "Sūrya Bhedana",
  "Nāḍī Śodhana",
  "Bhastrikā",
  "Bhrāmarī",
];
const PERFORMANCE_OPERATIONAL_PRESETS = ["2:5 Perform"];
const PERFORMANCE_LOCKED_PRESETS = [
  "3:1 Energy",
  "1:1:7 Retention",
  "Buteyko",
  "Tummo",
  "Iceman",
];
const PRESET_KEYS = [
  ...CORE_PRESETS,
  ...PREMIUM_OPERATIONAL_PRESETS,
  ...PERFORMANCE_OPERATIONAL_PRESETS,
];
const PREMIUM_LABEL_SET = new Set([
  ...PREMIUM_OPERATIONAL_PRESETS,
  ...PREMIUM_LOCKED_PRESETS,
]);
const YOGIC_LABEL_SET = new Set(YOGIC_LOCKED_PRESETS);
const PERFORMANCE_LABEL_SET = new Set([
  ...PERFORMANCE_OPERATIONAL_PRESETS,
  ...PERFORMANCE_LOCKED_PRESETS,
]);
const PREMIUM_LABEL_SUFFIX = " — UNLOCK WITH PREMIUM";
const YOGIC_LABEL_SUFFIX = " — UNLOCK WITH YOGIC PACK";
const PERFORMANCE_LABEL_SUFFIX = " — UNLOCK WITH PERFORMANCE PACK";
const getPresetDisplayLabel = (name) => {
  if (PREMIUM_LABEL_SET.has(name)) return `${name}${PREMIUM_LABEL_SUFFIX}`;
  if (YOGIC_LABEL_SET.has(name)) return `${name}${YOGIC_LABEL_SUFFIX}`;
  if (PERFORMANCE_LABEL_SET.has(name)) return `${name}${PERFORMANCE_LABEL_SUFFIX}`;
  return name;
};
const SPIRAL_VISUAL_SETTINGS = {
  maxLoops: 7,
  loopSpacing: 14,
  lineWidth: 4,
  strokeColor: "#0f7f92",
  glowColor: "rgba(37,135,158,0.45)",
};
const MUSIC_NOTE_ON = "♪";
const MUSIC_NOTE_OFF = "♪";
const PRESET_DESCRIPTIONS = {
  "1:1 Balance": "Inhale - Exhale. Recommended tempo: 5.5 seconds.",
  "1:1:1 Triangle 1": "Inhale - Hold - Exhale.",
  "1:1:1 Triangle 2": "Inhale - Exhale - Hold.",
  "1:1:1:1 Box": "Inhale - Hold - Exhale - Hold.",
  "1:2 Relax": "Inhale - Extended exhale.",
  "2:5 Perform": "Inhale - Extended exhale. Ideal for exercise.",
  "1:4:2 Calm": "Inhale - Extra long hold - Extended exhale.",
  "1:4:2:2 Unwind": "Inhale - Extra long hold - Extended exhale - Extended hold.",
  "4:7:8 Dream": "Inhale - Extended hold - Extended exhale. Recommended for falling asleep.",
};

export default function BreathingCircle() {
  const [preset, setPreset] = useState(PRESET_KEYS[0]);
  const [unitSeconds, setUnitSeconds] = useState(4);
  const [rounds, setRounds] = useState(20);

  const [phaseIndex, setPhaseIndex] = useState(null); // null = idle state
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
  const [bgVolume, setBgVolume] = useState(0.8);
  const [fxVolume, setFxVolume] = useState(1);

  const [roundCounter, setRoundCounter] = useState(0);
  const [countdownStep, setCountdownStep] = useState(null);
  const [configStep, setConfigStep] = useState(0);

  const [phaseSecond, setPhaseSecond] = useState(0);
  const [unitPreviewScale, setUnitPreviewScale] = useState(SCALE_SMALL);
  const phaseStartRef = useRef(null);
  const phaseDurationRef = useRef(1);
  const pauseElapsedRef = useRef(0);
  const resumeFromPauseRef = useRef(false);
  const lastAudioPhaseRef = useRef(null);
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
  const backgroundMusicRef = useRef(null);
const beepRefs = {
    inhale: useRef(null),
    hold: useRef(null),
    exhale: useRef(null),
  };

  const phases = PRESETS[preset];
  const currentPhase =
    phaseIndex !== null ? getPhaseNameForPreset(preset, phaseIndex) : null;
  const currentPhaseLabel =
    currentPhase !== null ? PHASE_LABELS[currentPhase] ?? currentPhase : null;
  const phaseDuration = phaseIndex !== null ? phases[phaseIndex] * unitSeconds : 0;

  const totalSeconds =
    rounds * phases.reduce((sum, x) => sum + x * unitSeconds, 0);
  const handleUpgradeClick = () => {
    if (running) {
      setRunning(false);
      setPhaseIndex(null);
      setScale(1);
      setRoundCounter(0);
      setPhaseProgress(0);
      resetPauseState();
      lastAudioPhaseRef.current = null;
    }

    if (isCountdownActive) {
      setCountdownStep(null);
      setCountdownPausedStep(null);
      setIsPaused(false);
    }

    setConfigStep(1);
    setShowPremiumPage(true);
  };
  const toggleBackgroundMusic = () => {
    const audio = backgroundMusicRef.current;
    if (!audio) return;

    if (musicOn) {
      audio.pause();
      audio.currentTime = 0;
      setMusicOn(false);
      return;
    }

    audio.loop = true;
    const playPromise = audio.play();

    if (playPromise && typeof playPromise.then === "function") {
      setMusicOn(true);
      playPromise.catch(() => {
        audio.pause();
        audio.currentTime = 0;
        setMusicOn(false);
      });
    } else {
      setMusicOn(true);
    }
  };

  // Countdown before starting
  useEffect(() => {
    if (countdownStep === null) return;

    if (countdownStep >= COUNTDOWN_SEQUENCE.length) {
      setCountdownStep(null);
      setRunning(true);
      setPhaseIndex(0);
      setRoundCounter(1);
      return;
    }

    const t = setTimeout(() => setCountdownStep((step) => step + 1), 1000);
    return () => clearTimeout(t);
  }, [countdownStep]);

  // Phase timing & transitions
  useEffect(() => {
    if (!running || phaseIndex === null) return;
    if (isPaused) return;

    const presetPhases = PRESETS[preset];
    const currentPhaseName = getPhaseNameForPreset(preset, phaseIndex);
    const phaseLengthSeconds = presetPhases[phaseIndex] * unitSeconds;
    const phaseLengthMs = Math.max(phaseLengthSeconds * 1000, 1);

    const resumingFromPause = resumeFromPauseRef.current;
    const initialElapsed = resumingFromPause ? pauseElapsedRef.current : 0;

    if (!resumingFromPause) {
      setPhaseSecond(0);
      setPhaseProgress(0);
    }

    resumeFromPauseRef.current = false;
    pauseElapsedRef.current = 0;

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    phaseStartRef.current = now - initialElapsed;
    phaseDurationRef.current = phaseLengthMs;

    const interval = setInterval(() => {
      setPhaseSecond((s) => {
        if (s + 1 >= phaseLengthSeconds) return phaseLengthSeconds;
        return s + 1;
      });
    }, 1000);

    // Scaling animation by phase
    if (currentPhaseName === "inhale") {
      setScale(SCALE_BIG);
    } else if (currentPhaseName === "exhale") {
      setScale(SCALE_SMALL);
    }

    const proceedToNextPhase = () => {
      const next = (phaseIndex + 1) % presetPhases.length;

      if (next === 0) {
        // Completed a round
        setRoundCounter((r) => {
          if (r + 1 > rounds) {
            setRunning(false);
            setPhaseIndex(null);
            setScale(1);
            setCountdownStep(null);
            setConfigStep(0);
            resetPauseState();
            return r;
          }
          return r + 1;
        });
      }

      if (running) setPhaseIndex(next);
    };

    const remainingMs = Math.max(phaseLengthMs - initialElapsed, 0);
    let timeout;
    if (remainingMs <= 0) {
      proceedToNextPhase();
    } else {
      timeout = setTimeout(proceedToNextPhase, remainingMs);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [running, phaseIndex, preset, unitSeconds, rounds, isPaused]);

  useEffect(() => {
    if (!running) {
      resetPauseState();
    }
  }, [running]);

  // Smooth progress tracking within the current phase for visualizations
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!running || phaseIndex === null) {
      setPhaseProgress(0);
      return;
    }

    if (isPaused) return;

    let rafId;

    const updateProgress = () => {
      const duration = phaseDurationRef.current || 1;
      const start =
        phaseStartRef.current ??
        (typeof performance !== "undefined" ? performance.now() : Date.now());
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = Math.max(0, now - start);
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);
      setPhaseProgress(progress);
      rafId = requestAnimationFrame(updateProgress);
    };

    rafId = requestAnimationFrame(updateProgress);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [running, phaseIndex, isPaused]);

  // Sync music state with audio element events & cleanup on unmount
  useEffect(() => {
    const bgAudio = backgroundMusicRef.current;
    if (!bgAudio) return;

    const handlePlay = () => setMusicOn(true);
    const handlePause = () => setMusicOn(false);

    bgAudio.addEventListener("play", handlePlay);
    bgAudio.addEventListener("pause", handlePause);

    return () => {
      bgAudio.removeEventListener("play", handlePlay);
      bgAudio.removeEventListener("pause", handlePause);
      bgAudio.pause();
      bgAudio.currentTime = 0;
    };
  }, []);
  useEffect(() => {
    const bgAudio = backgroundMusicRef.current;
    if (bgAudio) {
      bgAudio.volume = Math.min(Math.max(bgVolume, 0), 1);
    }
  }, [bgVolume]);
  useEffect(() => {
    const volume = Math.min(Math.max(fxVolume, 0), 1);
    const applyVolume = (refs) => {
      Object.values(refs).forEach((ref) => {
        const node = ref?.current;
        if (node) node.volume = volume;
      });
    };
    applyVolume(audioRefs.male);
    applyVolume(audioRefs.female);
    applyVolume(beepRefs);
  }, [fxVolume]);

  // Phase audio cues
  useEffect(() => {
    if (!running || phaseIndex === null || !soundOn || isPaused) return;
    if (lastAudioPhaseRef.current === phaseIndex) return;

    const presetPhases = PRESETS[preset];
    const phaseRatio = presetPhases?.[phaseIndex];
    if (!presetPhases || phaseRatio <= 0) return;

    const phaseName = getPhaseNameForPreset(preset, phaseIndex);
    if (!phaseName) return;

    if (useBeep) {
      const beepKey = PHASE_MAP[phaseName];
      const beepAudio = beepRefs[beepKey]?.current;
      if (!beepAudio) return;
      lastAudioPhaseRef.current = phaseIndex;
      beepAudio.currentTime = 0;
      beepAudio.play().catch(() => {});
      return;
    }

    const voiceSet = audioRefs[voiceType] ?? audioRefs.male;
    const audio = voiceSet?.[phaseName]?.current;
    if (!audio) return;

    lastAudioPhaseRef.current = phaseIndex;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [running, phaseIndex, soundOn, useBeep, preset, voiceType, isPaused]);

  // Preview animation for unit duration selection
  useEffect(() => {
    if (configStep !== 2) {
      previewInitializedRef.current = false;
      return;
    }
    if (showSettingsPage) return;

    if (!previewInitializedRef.current) {
      setUnitPreviewScale(SCALE_SMALL);
      previewInitializedRef.current = true;
    }

    const initialTimeout = setTimeout(() => setUnitPreviewScale(SCALE_BIG), 100);
    const interval = setInterval(() => {
      setUnitPreviewScale((scale) =>
        scale === SCALE_SMALL ? SCALE_BIG : SCALE_SMALL
      );
    }, unitSeconds * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [configStep, unitSeconds, showSettingsPage]);

  const resetPauseState = () => {
    setIsPaused(false);
    pauseElapsedRef.current = 0;
    resumeFromPauseRef.current = false;
    setCountdownPausedStep(null);
  };

  const startExercise = () => {
    resetPauseState();
    lastAudioPhaseRef.current = null;
    setRoundCounter(0);
    setPhaseIndex(null);
    setPhaseSecond(0);
    setPhaseProgress(0);
    setScale(SCALE_SMALL);
    setCountdownStep(0);
    setConfigStep(null);
  };

  const togglePause = () => {
    if (isCountdownActive) {
      if (countdownStep !== null) {
        setCountdownPausedStep(countdownStep);
        setCountdownStep(null);
        setIsPaused(true);
      } else if (countdownPausedStep !== null) {
        setCountdownStep(countdownPausedStep);
        setCountdownPausedStep(null);
        setIsPaused(false);
      }
      return;
    }

    if (phaseIndex === null) return;

    if (isPaused) {
      setIsPaused(false);
      return;
    }

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const start = phaseStartRef.current ?? now;
    pauseElapsedRef.current = Math.max(now - start, 0);
    resumeFromPauseRef.current = true;
    setIsPaused(true);
  };
  const openSettings = () => {
    const pauseInfo = { pausedCountdown: false, pausedBreathing: false };

    if (isCountdownActive && countdownStep !== null) {
      togglePause();
      pauseInfo.pausedCountdown = true;
    } else if (running && phaseIndex !== null && !isPaused) {
      togglePause();
      pauseInfo.pausedBreathing = true;
    }

    settingsPauseRef.current = pauseInfo;
    setShowSettingsPage(true);
  };

  const closeSettings = () => {
    const { pausedCountdown, pausedBreathing } = settingsPauseRef.current;

    if (pausedCountdown && countdownPausedStep !== null) {
      togglePause();
    } else if (pausedBreathing && isPaused) {
      togglePause();
    }

    settingsPauseRef.current = {
      pausedCountdown: false,
      pausedBreathing: false,
    };
    setShowSettingsPage(false);
  };

  const isCountdownActive =
    (countdownStep !== null && countdownStep < COUNTDOWN_SEQUENCE.length) ||
    countdownPausedStep !== null;
  const buttonBaseClasses =
    "px-4 py-2 rounded-lg shadow-md bg-[#00b4c7] text-white hover:bg-[#00a0b2] transition";
  const accentButtonClasses =
    "px-4 py-2 rounded-lg shadow-md bg-[#106f87] text-white hover:bg-[#0d5c6f] transition";
  const cardWrapperBase = "w-full max-w-md min-h-[480px]";
  const configCardClasses = `${cardWrapperBase} bg-white/80 p-6 rounded-xl shadow-xl flex flex-col space-y-4`;
  const configCardWithFooter = `${configCardClasses} justify-between`;
  const transparentCardClasses = `${cardWrapperBase} rounded-xl flex flex-col items-center justify-between gap-4 border border-transparent p-6`;
  const resetUnitPreview = () => setUnitPreviewScale(SCALE_SMALL);
  const handleUnitSecondsChange = (value) => {
    setUnitSeconds(value);
    resetUnitPreview();
  };
  const renderSoundControls = () => {
    const soundMode = !soundOn
      ? "off"
      : useBeep
      ? "beep"
      : voiceType === "female"
      ? "voice-female"
      : "voice-male";
    return (
      <select
        value={soundMode}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "off") {
            setSoundOn(false);
            setUseBeep(false);
          } else if (value === "beep") {
            setSoundOn(true);
            setUseBeep(true);
          } else if (value === "voice-female") {
            setSoundOn(true);
            setUseBeep(false);
            setVoiceType("female");
          } else {
            setSoundOn(true);
            setUseBeep(false);
            setVoiceType("male");
          }
        }}
        className="w-full p-3 rounded bg-white text-base text-slate-900 border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="voice-male">Male voice</option>
        <option value="voice-female">Female voice</option>
        <option value="beep">Vibraphone</option>
        <option value="off">Sounds off</option>
      </select>
    );
  };
  const renderUpgradeButton = (className = accentButtonClasses) => (
    <button onClick={handleUpgradeClick} className={className}>
      Upgrade
    </button>
  );
  const renderSettingsButton = (className = buttonBaseClasses) => (
    <button
      onClick={openSettings}
      className={`${className} flex items-center justify-center`}
    >
      <span className="text-sm font-semibold">Settings</span>
    </button>
  );
  const renderVisualControls = () => (
    <select
      value={visualMode}
      onChange={(e) => setVisualMode(e.target.value)}
      className="w-full p-3 rounded bg-white text-base text-slate-900 border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      <option value="circle">Circle</option>
      <option value="spiral">Serpent</option>
    </select>
  );
  const computeCircleScale = () => {
    if (!running || phaseIndex === null || !currentPhase) {
      return scale;
    }
    if (currentPhase === "inhale") {
      return SCALE_SMALL + (SCALE_BIG - SCALE_SMALL) * phaseProgress;
    }
    if (currentPhase === "exhale") {
      return SCALE_BIG - (SCALE_BIG - SCALE_SMALL) * phaseProgress;
    }
    return scale;
  };
  const circleScale = computeCircleScale();
  const renderCircleVisual = () => (
    <>
      <div
        className="absolute inset-0 rounded-full shadow-lg transition-none"
        style={{
          background: "radial-gradient(circle, #106f87, #0a3c4b)",
          boxShadow: "0 0 40px rgba(37,135,158,0.6)",
          transform: `scale(${circleScale})`,
          transformOrigin: "center",
        }}
      />
      {phaseIndex !== null && (
        <div className="absolute inset-0 flex items-center justify-center text-2xl text-white">
          {phaseSecond + 1}
        </div>
      )}
    </>
  );
  const renderSpiralVisual = () => (
    <>
      <div className="absolute inset-0">
        <SpiralRibbon
          phase={currentPhase ?? "inhale"}
          phaseProgress={phaseProgress}
          settings={SPIRAL_VISUAL_SETTINGS}
        />
      </div>
      {phaseIndex !== null && (
        <div className="absolute inset-0 flex items-center justify-center text-2xl text-white drop-shadow-lg">
          {phaseSecond + 1}
        </div>
      )}
    </>
  );
  const renderVisualDisplay = () => {
    if (!running) {
      return (
        <div className="absolute inset-0 rounded-full border-4 border-[#106f87] flex items-center justify-center text-3xl text-[#106f87] uppercase tracking-wide">
          {currentCountdownLabel}
        </div>
      );
    }

    if (visualMode === "spiral") {
      return renderSpiralVisual();
    }

    return renderCircleVisual();
  };
  const previewPhaseLabel =
    unitPreviewScale === SCALE_BIG ? "Inhale" : "Exhale";
  const showConfig =
    !running && countdownStep === null && configStep !== null;
  const showRunControls =
    configStep === null && (running || isCountdownActive);
  const currentCountdownIndex = countdownStep ?? countdownPausedStep;
  const currentCountdownLabel =
    currentCountdownIndex !== null
      ? COUNTDOWN_SEQUENCE[currentCountdownIndex]
      : null;

  const renderConfigContent = () => {
    if (configStep === null) return null;

    if (configStep === 0) {
      return (
        <div
          className="flex flex-col items-center justify-between h-full space-y-4 cursor-pointer select-none"
          onClick={() => setConfigStep(1)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setConfigStep(1);
            }
          }}
        >
          <img
            src="/logo.png"
            alt="Breathing App logo"
            className="w-[24rem] h-[24rem] object-contain"
          />
          <div className="text-sm text-slate-600 text-center leading-relaxed max-w-[23rem]">
            Relieve stress and anxiety. Calm down. Let go. Balance your nervous system. Sleep better.
            Improve concentration. Improve performance. Improve mental clarity. Add focus. Lower blood
            pressure. Lower heart rate. Increase HRV. Increase CO<sub>2</sub> resilience.
            Activate the Vagus nerve. Recover. Reform. Connect. Ground.
            <span className="block font-semibold mt-4">Breathe yourself healthy. Breathe yourself whole.</span>
            
          </div>
        </div>
      );
    }

    if (configStep === 1) {
      return (
        <div className={configCardWithFooter}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select your exercise</h2>
            <p className="text-sm text-slate-600">
              Pick the breathing pattern that feels right today.
            </p>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="w-full p-3 rounded bg-white text-base text-slate-900 border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {[...CORE_PRESETS, ...PREMIUM_OPERATIONAL_PRESETS].map((name) => (
                <option key={name} value={name}>
                  {getPresetDisplayLabel(name)}
                </option>
              ))}
              {PREMIUM_LOCKED_PRESETS.map((name) => (
                <option
                  key={`locked-premium-${name}`}
                  value={`locked-premium-${name}`}
                  disabled
                >
                  {getPresetDisplayLabel(name)}
                </option>
              ))}
              {YOGIC_LOCKED_PRESETS.map((name) => (
                <option
                  key={`locked-yogic-${name}`}
                  value={`locked-yogic-${name}`}
                  disabled
                >
                  {getPresetDisplayLabel(name)}
                </option>
              ))}
              {PERFORMANCE_OPERATIONAL_PRESETS.map((name) => (
                <option key={name} value={name}>
                  {getPresetDisplayLabel(name)}
                </option>
              ))}
              {PERFORMANCE_LOCKED_PRESETS.map((name) => (
                <option
                  key={`locked-performance-${name}`}
                  value={`locked-performance-${name}`}
                  disabled
                >
                  {getPresetDisplayLabel(name)}
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-500 font-semibold">
              {PRESET_DESCRIPTIONS[preset]}
            </p>
            <p className="text-sm text-slate-500">
              <span className="font-semibold">General guidelines for succesful practice:</span><br />
              Sit comfortably or lie on your back. Keep your back straight and head aligned.
              Relax your face. Relax your shoulders. Close your eyes and let your body settle.
              <br />For most exercises, take slow and deep breaths. Let go off unnecessary thoughts, instead
               concentrate for example on your chest and diaphragm movements.{" "}
              <br /><br /><span className="font-semibold">ALWAYS BREATHE THROUGH NOSE.</span>
            </p>
          </div>
          <div className="flex w-full justify-between pt-4 space-x-3">
            <button
              onClick={() => setConfigStep(0)}
              className={`${buttonBaseClasses} flex-1`}
            >
              Back
            </button>
            {renderUpgradeButton(`${accentButtonClasses} flex-1`)}
            {renderSettingsButton(`${buttonBaseClasses} flex-1`)}
            <button
              onClick={() => {
                resetUnitPreview();
                setConfigStep(2);
              }}
              className={`${buttonBaseClasses} flex-1`}
            >
              Next
            </button>
          </div>
        </div>
      );
    }

    if (configStep === 2) {
      return (
        <div className={configCardWithFooter}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select your tempo</h2>
            <p className="text-sm text-slate-600">
              Each step lasts {unitSeconds} seconds.
            </p>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={unitSeconds}
              onChange={(e) => handleUnitSecondsChange(parseFloat(e.target.value))}
              className="w-full accent-[#106f87]"
              style={{ accentColor: "#106f87" }}
            />
            <div className="flex flex-col items-center w-full space-y-3 pt-2">
              <div className="text-sm uppercase tracking-[0.3em] text-slate-500">
                {previewPhaseLabel}
              </div>
              <div className="relative w-36 h-36">
                <motion.div
                  animate={{ scale: unitPreviewScale }}
                  initial={{ scale: SCALE_SMALL }}
                  transition={{ duration: unitSeconds, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full shadow-lg"
                  style={{
                    background: "radial-gradient(circle, #106f87, #0a3c4b)",
                    boxShadow: "0 0 25px rgba(37,135,158,0.4)",
                  }}
                />
              </div>
              <p className="text-xs text-slate-500">
                This preview loops inhale and exhale (1:1) at your selected pace.
              </p>
            </div>
          </div>
          <div className="flex w-full justify-between pt-6 space-x-3">
            <button
              onClick={() => setConfigStep(1)}
              className={`${buttonBaseClasses} flex-1`}
            >
              Back
            </button>
            {renderUpgradeButton(`${accentButtonClasses} flex-1`)}
            {renderSettingsButton(`${buttonBaseClasses} flex-1`)}
            <button
              onClick={() => setConfigStep(3)}
              className={`${buttonBaseClasses} flex-1`}
            >
              Next
            </button>
          </div>
        </div>
      );
    }

    if (configStep === 3) {
      return (
        <div className={configCardWithFooter}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Choose your sounds</h2>
            <p className="text-sm text-slate-600">
              Choose between voice guidance, calm vibraphone sounds, or silent mode. UNLOCK MORE SOUND OPTIONS WITH PREMIUM.
            </p>
            {renderSoundControls()}
            <div className="space-y-2 pt-4">
              <h3 className="text-lg font-semibold">Choose your visuals</h3>
              <p className="text-sm text-slate-600">
                Choose Circle for a classic glow or Serpent for a twirling experience. UNLOCK MORE VISUALS WITH PREMIUM.
              </p>
              {renderVisualControls()}
            </div>
          </div>
          <div className="flex w-full justify-between pt-6 space-x-3">
            <button
              onClick={() => {
                resetUnitPreview();
                setConfigStep(2);
              }}
              className={`${buttonBaseClasses} flex-1`}
            >
              Back
            </button>
            {renderUpgradeButton(`${accentButtonClasses} flex-1`)}
            {renderSettingsButton(`${buttonBaseClasses} flex-1`)}
            <button
              onClick={() => setConfigStep(4)}
              className={`${buttonBaseClasses} flex-1`}
            >
              Next
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={configCardWithFooter}>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Choose the session length</h2>
          <p className="text-sm text-slate-600">
            Pick how many breathing rounds you would like to complete.
          </p>
          <label className="text-sm">
            Current selection: {rounds} breathing cycles.
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={rounds}
            onChange={(e) => setRounds(parseInt(e.target.value))}
            className="w-full accent-[#106f87]"
            style={{ accentColor: "#106f87" }}
          />
          <div className="text-sm text-slate-600">
            Total time ≈ {(totalSeconds / 60).toFixed(1)} minutes.
          </div>
        </div>
        <div className="flex w-full justify-between pt-6 space-x-3">
          <button
            onClick={() => setConfigStep(3)}
            className={`${buttonBaseClasses} flex-1`}
          >
            Back
          </button>
          {renderUpgradeButton(`${accentButtonClasses} flex-1`)}
          {renderSettingsButton(`${buttonBaseClasses} flex-1`)}
          <button onClick={startExercise} className={`${buttonBaseClasses} flex-1`}>
            Start
          </button>
        </div>
      </div>
    );
  };

  const renderActivePanel = () => {
    if (showConfig) {
      return renderConfigContent();
    }

    return (
      <div className={transparentCardClasses}>
        <div className="flex flex-col items-center gap-4 flex-1 justify-center w-full">
          <div className="relative w-48 h-48">{renderVisualDisplay()}</div>

          {running && phaseIndex !== null && (
            <>
              <div className="text-2xl tracking-wide mt-2">
                {currentPhaseLabel}
              </div>
              <div className="text-lg">
                Round {roundCounter} / {rounds}
              </div>
            </>
          )}
        </div>

        {showRunControls && (
          <div className="flex w-full justify-between items-center pt-6 space-x-3">
            <button
              onClick={() => {
                setRunning(false);
                setCountdownStep(null);
                setConfigStep(4);
                resetPauseState();
              }}
              className={`${buttonBaseClasses} flex-1`}
            >
              Back
            </button>
            {renderUpgradeButton(`${accentButtonClasses} flex-1`)}
            {renderSettingsButton(`${buttonBaseClasses} flex-1`)}
            <button
              onClick={togglePause}
              className={`${buttonBaseClasses} flex-1`}
              disabled={!running && !isCountdownActive}
            >
              {isPaused ? "Continue" : "Pause"}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderPremiumPage = () => (
    <div className={configCardWithFooter}>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Whole and Healthy Premium Experience
        </h2>
        <p className="text-sm text-slate-600">
          Upgrade to premium version to enjoy extended features and long term health benefits:
        </p>
        <ul className="list-disc ml-6 text-sm text-slate-600 space-y-1">
          <li>Unlimited practice sessions.</li>
          <li>More breathing patterns and exercises.</li>
          <li>Personalize your experience with a selection of new sounds and visuals.</li>
          <li>Unlock Performance, Yogic and Meditation packs to deepen your practice even more with in-app purchases.</li>
          <li>Save your favourite exercises and themes.</li>
          <li>Toggle Haptic feedback and dark or light mode.</li>
          <li>Wake-up and sleep functions.</li>
          <li>Video tutorials and scientific research updates.</li>
          <li>Commit yourself with access to session history and statistics.</li>
          <li>Turn on notifications, engage in streaks and earn badges.</li>
          <li>Connect to Apple Health and Siri/Google Fit and Google Assistant</li>
          <li>Widgets and smartwatch integration.</li>
        </ul>
      </div>
      <div className="flex w-full justify-between pt-6 space-x-3">
        <button
          className={`${buttonBaseClasses} w-1/2`}
          onClick={() => {
            setShowPremiumPage(false);
            setConfigStep(1);
          }}
        >
          Back
        </button>
        <button className={`${accentButtonClasses} w-1/2`}>
          Get Premium
        </button>
      </div>
    </div>
  );
  const renderSettingsPage = () => (
    <div className={configCardWithFooter}>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Background music
            </span>
            <button
              onClick={toggleBackgroundMusic}
              className={`${buttonBaseClasses} px-3 py-1 text-xs`}
            >
              {musicOn ? "Turn Off" : "Turn On"}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(bgVolume * 100)}
            onChange={(e) => setBgVolume(parseInt(e.target.value, 10) / 100)}
            className="w-full accent-[#106f87]"
            style={{ accentColor: "#106f87" }}
          />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700">
            Sound FX volume
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(fxVolume * 100)}
            onChange={(e) => setFxVolume(parseInt(e.target.value, 10) / 100)}
            className="w-full accent-[#106f87]"
            style={{ accentColor: "#106f87" }}
          />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700">
            Breathing tempo
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={unitSeconds}
            onChange={(e) =>
              handleUnitSecondsChange(parseFloat(e.target.value))
            }
            className="w-full accent-[#106f87]"
            style={{ accentColor: "#106f87" }}
          />
          <div className="text-xs text-slate-500">
            Each step lasts {unitSeconds} seconds.
          </div>
        </div>
      </div>
      <div className="flex w-full justify-between pt-6 space-x-3">
        <button onClick={closeSettings} className={`${buttonBaseClasses} flex-1`}>
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full text-slate-900 px-4 gap-8 min-h-[85vh]">
      <div className="w-full flex justify-center">
        {showPremiumPage
          ? renderPremiumPage()
          : showSettingsPage
          ? renderSettingsPage()
          : renderActivePanel()}
      </div>

      {/* AUDIO FILES */}
      <audio ref={audioRefs.male.inhale} src="/sounds/Breathe in M.mp3" />
      <audio ref={audioRefs.male.hold} src="/sounds/Hold M.mp3" />
      <audio ref={audioRefs.male.exhale} src="/sounds/Breathe out M.mp3" />
      <audio ref={audioRefs.female.inhale} src="/sounds/Breathe in F.mp3" />
      <audio ref={audioRefs.female.hold} src="/sounds/Hold F.mp3" />
      <audio ref={audioRefs.female.exhale} src="/sounds/Breathe out F.mp3" />
      <audio ref={beepRefs.inhale} src="/sounds/Vibraphone IN.mp3" />
      <audio ref={beepRefs.hold} src="/sounds/Vibraphone HOLD.mp3" />
      <audio ref={beepRefs.exhale} src="/sounds/Vibraphone OUT.mp3" />
      <audio ref={backgroundMusicRef} src="/sounds/BG music 1.mp3" />
    </div>
  );
}
