import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import LandingAuthGate from "@/components/auth/LandingAuthGate";

export default function HomePage() {
  return (
    <LandingAuthGate>
      <main className="min-h-screen overflow-hidden bg-[#090b14] text-white">
        <Navbar />
        <Hero />
      </main>
    </LandingAuthGate>
  );
}