import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center section-padding pt-28 overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-[10%] w-3 h-3 rounded-full bg-accent/20 animate-float" />
      <div className="absolute top-40 right-[15%] w-5 h-5 rounded-full border border-accent/20 animate-float-delayed" />
      <div className="absolute bottom-32 left-[20%] w-4 h-4 rounded-full bg-accent/10 animate-float-slow" />
      <div className="absolute top-60 right-[8%] w-2 h-2 rounded-full bg-accent/30 animate-float" />
      <div className="absolute bottom-40 right-[25%] w-6 h-6 rounded-full border border-accent/10 animate-float-delayed" />

      <div className="container-max text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-text-primary leading-[1.1] mb-6"
          >
            The survey is <span className="text-red-500 line-through decoration-red-500/70">dead</span>.
            <br />
            <span className="italic">Long live the interview.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="text-lg sm:text-xl text-text-muted font-sans max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            SurveyAgent is an open-source AI platform that replaces static forms
            with real conversations. Your AI interviewer listens, adapts, and digs
            deeper — on your servers, with your LLM, under your control.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register" className="btn-primary flex items-center gap-2 text-base">
              Try It Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#self-host" className="btn-secondary flex items-center gap-2 text-base font-mono">
              <span className="text-accent mr-1">$</span> docker compose up -d
            </a>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-text-muted/60 font-sans mt-6"
          >
            MIT licensed · No credit card · No vendor lock-in
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
