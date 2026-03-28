import { motion } from 'framer-motion';
import { Shield, Database, KeyRound, Wifi, ClipboardCheck, FileSearch } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Data Sovereignty',
    description: 'Stays on your servers. Period.',
  },
  {
    icon: Database,
    title: 'Your Database',
    description: 'Connect your own MongoDB. You control backups and retention.',
  },
  {
    icon: KeyRound,
    title: 'Enterprise Auth',
    description: 'Role-based access control with org-level isolation and team permissions.',
  },
  {
    icon: Wifi,
    title: 'Air-Gap Ready',
    description: 'Deploy fully offline. No external calls required.',
  },
  {
    icon: ClipboardCheck,
    title: 'Compliance Supportable',
    description: 'GDPR, HIPAA, SOC 2 — self-host to meet any framework.',
  },
  {
    icon: FileSearch,
    title: 'Fully Auditable',
    description: 'Open source. Read every line that touches your data.',
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

export default function Security() {
  return (
    <section className="section-padding bg-dark">
      <div className="container-max">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white">
            Security isn't a feature.
            <br />
            <span className="italic">It's the architecture.</span>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="glass-card p-6 hover:border-white/20 transition-all duration-200"
            >
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-serif text-lg text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/60 font-sans leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
