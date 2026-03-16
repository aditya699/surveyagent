import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Problem from '../components/landing/Problem';
import Solution from '../components/landing/Solution';
import ThreeModes from '../components/landing/ThreeModes';
import HowItWorks from '../components/landing/HowItWorks';
import TwoPaths from '../components/landing/TwoPaths';
import BringYourLLM from '../components/landing/BringYourLLM';
import Security from '../components/landing/Security';
import Comparison from '../components/landing/Comparison';
import OpenSource from '../components/landing/OpenSource';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/landing/Footer';

export default function Landing() {
  return (
    <>
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <ThreeModes />
      <HowItWorks />
      <TwoPaths />
      <BringYourLLM />
      <Security />
      <Comparison />
      <OpenSource />
      <FinalCTA />
      <Footer />
    </>
  );
}
