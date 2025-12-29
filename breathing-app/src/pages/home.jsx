import BreathingCircle from "../components/BreathingCircle.jsx";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-10">
      <h1 className="text-3xl font-bold">Breathing App</h1>
      <BreathingCircle />
    </div>
  );
}
