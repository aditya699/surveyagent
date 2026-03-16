import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Github } from 'lucide-react';

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
          {/* Coming Soon floating badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wide uppercase text-white bg-accent rounded-full px-4 py-1.5 mb-4 shadow-lg shadow-accent/25"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            Coming Soon
          </motion.div>

          {/* Badge */}
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 text-sm font-sans text-accent border border-accent/30 rounded-full px-4 py-1.5 mb-8 bg-accent/5"
          >
            Open-Source AI Research Platform
          </motion.span>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-text-primary leading-[1.1] mb-6"
          >
            The Open-Source
            <br />
            <span className="italic">Outset.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-lg sm:text-xl text-text-muted font-sans max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            AI that interviews your respondents via chat, voice, or video avatar.
            Self-host it. Plug in any LLM. Own your research data.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register" className="btn-primary flex items-center gap-2 text-base">
              Try It Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#self-host" className="btn-secondary flex items-center gap-2 text-base">
              Self-Host
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Small text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-sm text-text-muted/60 font-sans mt-6"
          >
            No credit card. No vendor lock-in. MIT licensed.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
