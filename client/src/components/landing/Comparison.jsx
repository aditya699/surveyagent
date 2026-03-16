import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';

const rows = [
  { feature: 'AI-driven interviews', us: true, closedAI: true, traditional: false, basic: false },
  { feature: 'Text, voice & video', us: true, closedAI: 'partial', traditional: false, basic: false },
  { feature: 'Self-hostable', us: true, closedAI: false, traditional: false, basic: false },
  { feature: 'Open-source', us: true, closedAI: false, traditional: false, basic: 'partial' },
  { feature: 'Bring your own LLM', us: true, closedAI: false, traditional: false, basic: false },
  { feature: 'Real-time follow-ups', us: true, closedAI: true, traditional: false, basic: false },
  { feature: 'No vendor lock-in', us: true, closedAI: false, traditional: 'partial', basic: true },
  { feature: 'Free tier', us: true, closedAI: 'partial', traditional: false, basic: true },
];

function Cell({ value, highlight }) {
  const base = highlight ? 'text-accent' : 'text-text-muted';
  if (value === true) return <Check className={`w-5 h-5 ${base} mx-auto`} />;
  if (value === false) return <X className="w-5 h-5 text-text-muted/40 mx-auto" />;
  return <Minus className="w-5 h-5 text-text-muted/60 mx-auto" />;
}

export default function Comparison() {
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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-text-primary">
            How we <span className="italic">compare.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="overflow-x-auto"
        >
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left py-3 pr-4 text-text-muted font-medium">Feature</th>
                <th className="py-3 px-4 text-center">
                  <span className="text-accent font-semibold">SurveyAgent</span>
                </th>
                <th className="py-3 px-4 text-center text-text-muted font-medium">Closed AI</th>
                <th className="py-3 px-4 text-center text-text-muted font-medium">Traditional</th>
                <th className="py-3 px-4 text-center text-text-muted font-medium">Basic Forms</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-card-border/50">
                  <td className="py-3 pr-4 text-text-primary">{row.feature}</td>
                  <td className="py-3 px-4 bg-accent/5">
                    <Cell value={row.us} highlight />
                  </td>
                  <td className="py-3 px-4">
                    <Cell value={row.closedAI} />
                  </td>
                  <td className="py-3 px-4">
                    <Cell value={row.traditional} />
                  </td>
                  <td className="py-3 px-4">
                    <Cell value={row.basic} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
