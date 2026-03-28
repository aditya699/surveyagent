import { motion } from 'framer-motion';
import { Cpu, ArrowRight } from 'lucide-react';

const steps = [
  { letter: 'A', label: 'Add your API key' },
  { letter: 'B', label: 'Pick your model' },
  { letter: 'C', label: 'Start interviewing' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function BringYourLLM() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-text-primary mb-4">
            Your AI. <span className="italic">Your choice.</span>
          </h2>
          <p className="text-text-muted font-sans text-lg max-w-2xl mx-auto">
            Bring any LLM provider. Follow three simple steps and you're live.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
        >
          {steps.map((step, i) => (
            <motion.div key={step.letter} variants={itemVariants} className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-card-border
                              bg-white font-sans text-text-primary hover:border-accent/40
                              hover:shadow-sm transition-all duration-200">
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent/10
                                 text-accent font-semibold text-lg">
                  {step.letter}
                </span>
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-5 h-5 text-text-muted hidden sm:block" />
              )}
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center text-text-muted/70 font-sans text-sm mt-8"
        >
          Works with any OpenAI-compatible endpoint. Switch providers anytime — zero lock-in.
        </motion.p>
      </div>
    </section>
  );
}
