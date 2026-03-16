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
            Surveys that talk.
            <br />
            <span className="italic">Infrastructure you own.</span>
          </h2>
          <p className="text-lg text-text-muted font-sans leading-relaxed max-w-3xl mx-auto">
            SurveyAgent is an open-source AI survey platform that replaces static
            forms with dynamic conversations. Your AI interviewer adapts in real-time,
            asks follow-up questions, and extracts deeper insights — through text chat,
            real-time voice, or a video avatar. Deploy it on your servers, connect your
            preferred LLM, and keep full control of your research data.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
