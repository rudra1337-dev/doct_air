import Navbar          from "../../components/Navbar/Navbar";
import Hero            from "../../components/Hero/Hero";
import TrustSection    from "../../components/TrustSection/TrustSection";
import HowItWorks      from "../../components/HowItWorks/HowItWorks";
import Features        from "../../components/Features/Features";
import ForTeams        from "../../components/ForTeams/ForTeams";
import ResponsibleAI   from "../../components/ResponsibleAI/ResponsibleAI";
import CTA             from "../../components/CTA/CTA";
import Footer          from "../../components/Footer/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <TrustSection />
        <HowItWorks />
        <Features />
        <ForTeams />
        <ResponsibleAI />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
