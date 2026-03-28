import { motion } from 'framer-motion';

export default function Solution() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-text-primary mb-6">
            Surveys that actually <span className="italic">listen</span>
          </h2>
          <p className="text-lg text-text-muted font-sans leading-relaxed max-w-3xl mx-auto">
            SurveyAgent replaces the form with a conversation. An AI interviewer
            follows your questions but adapts in real time — probing deeper when
            something interesting comes up, moving on when it's time, and wrapping
            up gracefully. Every respondent gets a one-on-one. You get structured
            insights across all of them.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
