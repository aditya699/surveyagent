import { motion } from 'framer-motion';
import { DollarSign, Cloud, Lock, Server } from 'lucide-react';

const problems = [
  {
    icon: DollarSign,
    title: '$2,000+/month',
    description: 'AI research tools price out anyone who isn\'t enterprise.',
  },
  {
    icon: Cloud,
    title: 'Your data, their cloud',
    description: 'Sensitive responses live on servers you don\'t control.',
  },
  {
    icon: Lock,
    title: 'One LLM, forever',
    description: 'Locked into whatever model the vendor chose. No switching.',
  },
  {
    icon: Server,
    title: 'SaaS or nothing',
    description: 'No self-hosting. No air-gap. No compliance flexibility.',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Problem() {
  return (
    <section id="features" className="section-padding">
      <div className="container-max">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-text-primary">
            Why surveys <span className="italic">fail you</span>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {problems.map((item) => (
            <motion.div
              key={item.title}
              variants={itemVariants}
              className="card hover:shadow-md transition-all duration-200"
            >
              <item.icon className="w-8 h-8 text-accent mb-4" />
              <h3 className="font-serif text-lg text-text-primary mb-2">{item.title}</h3>
              <p className="text-sm text-text-muted font-sans leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
