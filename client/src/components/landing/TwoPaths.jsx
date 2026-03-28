import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cloud, Server, ArrowRight } from 'lucide-react';

export default function TwoPaths() {
  return (
    <section id="self-host" className="section-padding">
      <div className="container-max">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-text-primary">
            Use ours. <span className="italic">Or run your own.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Cloud */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="card hover:shadow-lg transition-all duration-200"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-5">
              <Cloud className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-serif text-2xl text-text-primary mb-3">Cloud</h3>
            <p className="text-text-muted font-sans text-sm leading-relaxed mb-6">
              Start in seconds. We handle the infrastructure.
            </p>
            <ul className="space-y-2 text-sm text-text-muted font-sans mb-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Zero setup
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Automatic updates
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Managed scaling
              </li>
            </ul>
            <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-sm">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Self-Host */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="card hover:shadow-lg transition-all duration-200 border-accent/30"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-5">
              <Server className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-serif text-2xl text-text-primary mb-3">Self-Host</h3>
            <p className="text-text-muted font-sans text-sm leading-relaxed mb-6">
              Full control. Your servers, your rules.
            </p>
            <ul className="space-y-2 text-sm text-text-muted font-sans mb-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Complete data ownership
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Air-gap ready
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Your infrastructure
              </li>
            </ul>
            <div className="bg-dark rounded-lg p-3 font-mono text-sm text-white/80">
              <span className="text-accent">$</span> docker compose up -d
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
