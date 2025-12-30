import { useEffect, useRef } from "react";

const DEFAULT_SETTINGS = {
  maxLoops: 7,
  loopSpacing: 14,
  lineWidth: 6,
  strokeColor: "#0f7f92",
  glowColor: "rgba(37,135,158,0.45)",
};

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

// Fixed orientation so the spiral never “flips”
const BASE_ANGLE = Math.PI / 2;

// Map (phase, phaseProgress) -> progress in [0..1]
// inhale: 0 -> 1
// hold:  either 1 (normal) or 0 (if holdFollowsExhale)
// exhale: 1 -> 0
function getDesiredProgress(phase, phaseProgress, holdFollowsExhale) {
  const p = typeof phaseProgress === "number" ? phaseProgress : 0;
  const t = clamp01(p);
  const ph = phase ?? "inhale";

  if (ph === "inhale") return t;
  if (ph === "exhale") return 1 - t;
  // hold
  return holdFollowsExhale ? 0 : 1;
}

export default function SpiralRibbon({
  phase = "inhale",
  phaseProgress = 0,
  holdFollowsExhale = false,
  settings = {},
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const optsRef = useRef({ ...DEFAULT_SETTINGS, ...settings });

  // Render state owned ONLY by the render loop
  const renderedProgressRef = useRef(0);
  const prevPhaseRef = useRef(phase ?? "inhale");
  const prevDesiredRef = useRef(0);

  // Keep options updated
  useEffect(() => {
    optsRef.current = { ...DEFAULT_SETTINGS, ...settings };
  }, [settings]);

  // Resize canvas to match parent bounds and DPR
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      sizeRef.current = { width: rect.width, height: rect.height, dpr };
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const obs = new ResizeObserver(updateSize);
      obs.observe(canvas.parentElement || canvas);
      return () => obs.disconnect();
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const render = () => {
      const { width, height, dpr } = sizeRef.current;
      if (!width || !height) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Compute desired progress deterministically from props
      const currentPhase = phase ?? "inhale";
      const desired = getDesiredProgress(currentPhase, phaseProgress, holdFollowsExhale);

      // Boundary detection:
      // - if phase changed, snap (prevents flicker + rotation jumps)
      // - if we’re at the exact start/end of a phase (phaseProgress 0 or 1), snap
      const prevPhase = prevPhaseRef.current;
      const phaseChanged = prevPhase !== currentPhase;

      const pp = clamp01(typeof phaseProgress === "number" ? phaseProgress : 0);
      const atBoundary = pp === 0 || pp === 1;

      // Decide snap vs ease
      if (phaseChanged || atBoundary) {
        renderedProgressRef.current = desired;
      } else if (currentPhase === "hold") {
        // Hold must be perfectly still
        renderedProgressRef.current = desired;
      } else {
        // Gentle easing only within inhale/exhale (never at boundaries)
        const cur = renderedProgressRef.current;
        const next = cur + (desired - cur) * 0.18;
        renderedProgressRef.current = Math.abs(next - desired) < 0.0002 ? desired : clamp01(next);
      }

      prevPhaseRef.current = currentPhase;
      prevDesiredRef.current = desired;

      // Clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { maxLoops, loopSpacing, lineWidth, strokeColor, glowColor } = optsRef.current;

      const maxTheta = Math.PI * 2 * Math.max(0, maxLoops);
      const progress = renderedProgressRef.current;

      // If progress is 0, draw nothing (prevents tiny “pre-inhale” segment)
      if (maxTheta <= 0 || progress <= 0) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const visibleTheta = maxTheta * progress;

      const cx = width / 2;
      const cy = height / 2;

      const availableRadius = Math.min(width, height) * 0.5 - lineWidth;

      const spacingB = loopSpacing / (2 * Math.PI);
      const spacingRadius = spacingB * maxTheta;
      const spiralRadius = Math.min(availableRadius, spacingRadius);

      const spiralScale = spiralRadius / maxTheta;

      // Constant step count makes motion consistent across devices
      const steps = 900;
      const thetaStep = visibleTheta / steps;

      ctx.beginPath();
      ctx.moveTo(cx, cy);

      for (let i = 0; i <= steps; i++) {
        const theta = i * thetaStep;
        const r = spiralScale * theta;
        const a = theta + BASE_ANGLE;
        ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }

      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = lineWidth * 1.5;
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = 0.95;
      ctx.stroke();

      // Reset
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, phaseProgress, holdFollowsExhale]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
