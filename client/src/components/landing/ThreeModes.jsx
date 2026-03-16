import { motion } from 'framer-motion';
import { MessageSquare, Mic, Video } from 'lucide-react';

const modes = [
  {
    icon: MessageSquare,
    title: 'Text Chat',
    description: 'Natural conversational interviews through an AI chatbot. Respondents type at their own pace while the AI adapts questions in real-time.',
  },
  {
    icon: Mic,
    title: 'Voice',
    description: 'Real-time voice conversations with AI. Speak naturally and let the AI interviewer listen, understand, and respond with follow-up questions.',
  },
  {
    icon: Video,
    title: 'Video Avatar',
    description: 'Face-to-face interviews with an AI video avatar. The most human-like experience for sensitive or in-depth qualitative research.',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ThreeModes() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-text-primary">
            One platform.
            <br />
            <span className="italic">Three ways to interview.</span>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid md:grid-cols-3 gap-6"
        >
          {modes.map((mode) => (
            <motion.div
              key={mode.title}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="card hover:shadow-lg transition-all duration-200 text-center"
            >
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <mode.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-serif text-xl text-text-primary mb-3">{mode.title}</h3>
              <p className="text-sm text-text-muted font-sans leading-relaxed">{mode.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
