import { useEffect, useRef } from "react";

const DEFAULT_SETTINGS = {
  maxLoops: 7,
  loopSpacing: 14,
  lineWidth: 6,
  strokeColor: "#0f7f92",
  glowColor: "rgba(37,135,158,0.45)",
};

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

export default function SpiralRibbon({
  phase = "inhale",
  phaseProgress = 0,
  settings = {},
}) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const targetProgressRef = useRef(0);
  const renderedProgressRef = useRef(0);
  const optionsRef = useRef({ ...DEFAULT_SETTINGS, ...settings });

  // Keep drawing options in a ref so the render loop can read updated values
  useEffect(() => {
    optionsRef.current = { ...DEFAULT_SETTINGS, ...settings };
  }, [settings]);

  // Convert the breathing phase progress into spiral progress targets.
  useEffect(() => {
    const normalizedPhase = phase ?? "inhale";
    const normalizedProgress = typeof phaseProgress === "number" ? phaseProgress : 0;

    let spiralProgress = 0;
    if (normalizedPhase === "inhale") {
      spiralProgress = normalizedProgress;
    } else if (normalizedPhase === "hold") {
      spiralProgress = 1;
    } else if (normalizedPhase === "exhale") {
      spiralProgress = 1 - normalizedProgress;
    }

    targetProgressRef.current = clamp01(spiralProgress);
  }, [phase, phaseProgress]);

  // Resize canvas to match parent bounds and devicePixelRatio.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      sizeRef.current = { width: rect.width, height: rect.height, dpr };
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateSize);
      observer.observe(canvas.parentElement || canvas);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Core drawing loop (requestAnimationFrame) for the spiral ribbon.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const render = () => {
      const { width, height, dpr } = sizeRef.current;
      if (!width || !height) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Ease toward the target progress to avoid snapping between phases.
      const target = targetProgressRef.current;
      const current = renderedProgressRef.current;
      const easedProgress = current + (target - current) * 0.15;
      renderedProgressRef.current =
        Math.abs(easedProgress - target) < 0.001 ? target : easedProgress;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const {
        maxLoops,
        loopSpacing,
        lineWidth,
        strokeColor,
        glowColor,
      } = optionsRef.current;

      const maxTheta = Math.PI * 2 * maxLoops;
      const visibleTheta = maxTheta * renderedProgressRef.current;
      const centerX = width / 2;
      const centerY = height / 2;
      const availableRadius = Math.min(width, height) * 0.5 - lineWidth;

      // Loop spacing defines how tight the spiral is (distance between arms ≈ 2πb).
      const spacingB = loopSpacing / (2 * Math.PI);
      const spacingRadius = spacingB * maxTheta;
      const spiralRadius = Math.min(availableRadius, spacingRadius);
      const spiralScale = maxTheta > 0 ? spiralRadius / maxTheta : 0;
      const thetaStep = Math.max(maxTheta / 900, 0.01);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);

      for (let theta = 0; theta <= visibleTheta; theta += thetaStep) {
        const r = spiralScale * theta;
        const x = centerX + r * Math.cos(theta);
        const y = centerY + r * Math.sin(theta);
        ctx.lineTo(x, y);
      }

      // Ensure the spiral reaches the exact end of the visible arc.
      const finalR = spiralScale * visibleTheta;
      const finalX = centerX + finalR * Math.cos(visibleTheta);
      const finalY = centerY + finalR * Math.sin(visibleTheta);
      ctx.lineTo(finalX, finalY);

      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = lineWidth * 1.5;
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = 0.95;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
