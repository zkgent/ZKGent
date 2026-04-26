import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/obsidian/Navbar";
import { Hero } from "@/components/obsidian/Hero";
import { ProblemSection } from "@/components/obsidian/ProblemSection";
import { SolutionSection } from "@/components/obsidian/SolutionSection";
import { UseCases } from "@/components/obsidian/UseCases";
import { HowItWorks } from "@/components/obsidian/HowItWorks";
import { Architecture } from "@/components/obsidian/Architecture";
import { WhyNow } from "@/components/obsidian/WhyNow";
import { Manifesto } from "@/components/obsidian/Manifesto";
import { Waitlist } from "@/components/obsidian/Waitlist";
import { Footer } from "@/components/obsidian/Footer";
import { Divider } from "@/components/obsidian/Section";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <Divider />
      <ProblemSection />
      <Divider />
      <SolutionSection />
      <Divider />
      <UseCases />
      <Divider />
      <HowItWorks />
      <Divider />
      <Architecture />
      <Divider />
      <WhyNow />
      <Manifesto />
      <Waitlist />
      <Footer />
    </main>
  );
}
