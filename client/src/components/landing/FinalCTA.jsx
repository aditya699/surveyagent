import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Github } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="section-padding bg-dark">
      <div className="container-max max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white mb-6">
            Your surveys.
            <br />
            Your infrastructure.
            <br />
            <span className="italic">Your rules.</span>
          </h2>
          <p className="text-white/60 font-sans text-lg mb-10 max-w-xl mx-auto">
            Start free on our cloud, or self-host on your own servers.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="btn-primary inline-flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#"
              className="btn-outline-light inline-flex items-center gap-2"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
