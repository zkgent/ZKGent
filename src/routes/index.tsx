import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/zkgent/Navbar";
import { Hero } from "@/components/zkgent/Hero";
import { ProblemSection } from "@/components/zkgent/ProblemSection";
import { SolutionSection } from "@/components/zkgent/SolutionSection";
import { UseCases } from "@/components/zkgent/UseCases";
import { HowItWorks } from "@/components/zkgent/HowItWorks";
import { Architecture } from "@/components/zkgent/Architecture";
import { WhyNow } from "@/components/zkgent/WhyNow";
import { Manifesto } from "@/components/zkgent/Manifesto";
import { Waitlist } from "@/components/zkgent/Waitlist";
import { Footer } from "@/components/zkgent/Footer";
import { Divider } from "@/components/zkgent/Section";

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
