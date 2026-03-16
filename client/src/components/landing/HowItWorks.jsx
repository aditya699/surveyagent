import { motion } from 'framer-motion';
import { PenLine, Share2, BotMessageSquare, BarChart3 } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: PenLine,
    title: 'Create your survey',
    description: 'Define your survey goals and questions. The AI structures the conversation flow automatically.',
  },
  {
    number: '02',
    icon: Share2,
    title: 'Share the link',
    description: 'Send respondents a single link. They choose text, voice, or video — no app download needed.',
  },
  {
    number: '03',
    icon: BotMessageSquare,
    title: 'AI conducts interviews',
    description: 'The AI adapts in real-time, asks follow-ups, and probes deeper based on responses.',
  },
  {
    number: '04',
    icon: BarChart3,
    title: 'Analyze insights',
    description: 'Get AI-generated summaries, themes, and sentiment analysis across all responses.',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding">
      <div className="container-max">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-text-primary">
            Survey to insights.
            <br />
            <span className="italic">Minutes, not months.</span>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {steps.map((step, i) => (
            <motion.div key={step.number} variants={itemVariants} className="relative text-center">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px bg-card-border" />
              )}
              <div className="relative z-10">
                <span className="text-4xl font-serif text-accent/20 block mb-3">{step.number}</span>
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-serif text-lg text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-muted font-sans leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
