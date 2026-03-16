import { motion } from 'framer-motion';
import { Scale, Users, EyeOff, Github, BookOpen, MessageCircle } from 'lucide-react';

const badges = [
  { icon: Scale, label: 'MIT Licensed', description: 'Use it anywhere — commercial or personal. No strings attached.' },
  { icon: Users, label: 'Community Driven', description: 'Built in the open. Contributions, issues, and ideas welcome.' },
  { icon: EyeOff, label: 'No Telemetry', description: 'Zero tracking, zero analytics, zero phone-home. Your data is yours.' },
];

const links = [
  { icon: Github, label: 'Star on GitHub', href: '#' },
  { icon: BookOpen, label: 'Read the Docs', href: '#' },
  { icon: MessageCircle, label: 'Join Discord', href: '#' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function OpenSource() {
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
            Open source. <span className="italic">Open book.</span>
          </h2>
          <p className="text-text-muted font-sans text-lg max-w-2xl mx-auto">
            We believe survey tools should be transparent, auditable, and community-owned.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          {badges.map((badge) => (
            <motion.div
              key={badge.label}
              variants={itemVariants}
              className="card text-center"
            >
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <badge.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-serif text-lg text-text-primary mb-2">{badge.label}</h3>
              <p className="text-sm text-text-muted font-sans leading-relaxed">{badge.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
