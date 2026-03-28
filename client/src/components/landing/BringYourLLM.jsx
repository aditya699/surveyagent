import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';

const providers = [
  'OpenAI',
  'Anthropic',
  'Google',
  'Ollama',
  'Azure',
  'Mistral',
  'Groq',
  'Any OpenAI-compatible endpoint',
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
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
            Plug in any provider. Switch anytime.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {providers.map((provider) => (
            <motion.span
              key={provider}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-card-border
                         bg-white font-sans text-sm text-text-primary hover:border-accent/40
                         hover:shadow-sm transition-all duration-200 cursor-default"
            >
              <Cpu className="w-4 h-4 text-accent" />
              {provider}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
