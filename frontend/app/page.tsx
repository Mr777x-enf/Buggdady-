import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#090b14] text-white">
      <Navbar />
      <Hero />
    </main>
  );
}