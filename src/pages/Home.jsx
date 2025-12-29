import BreathingCircle from "../components/BreathingCircle.jsx";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full pt-30">
      <BreathingCircle />

      {/* Optional footer spacing */}
      <div className="h-10"></div>
    </div>
  );
}
