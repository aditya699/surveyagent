import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, Github } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Self-Host', href: '#self-host' },
  { label: 'Feedback', href: '/feedback', isRoute: true },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-4 inset-x-0 mx-auto z-50 w-[95%] max-w-4xl"
    >
      <div className="bg-white/80 backdrop-blur-lg border border-card-border rounded-full px-6 py-3 flex items-center">
        {/* Logo */}
        <Link to="/" className="font-serif text-xl text-text-primary mr-8">
          SurveyAgent
        </Link>

        {/* Desktop nav — centered */}
        <div className="hidden md:flex items-center gap-6 flex-1">
          {navLinks.map((link) =>
            link.isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm font-sans text-text-muted hover:text-text-primary transition-colors"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-sans text-text-muted hover:text-text-primary transition-colors"
              >
                {link.label}
              </a>
            )
          )}
          <a
            href="https://github.com/aditya699/surveyagent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          <Link to="/login" className="text-sm font-sans text-text-muted hover:text-text-primary transition-colors">
            Log in
          </Link>
          <Link to="/register" className="btn-primary text-sm !px-4 !py-2">
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden ml-auto text-text-primary"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden mt-2 bg-white/95 backdrop-blur-lg border border-card-border rounded-2xl p-4 space-y-3"
        >
          {navLinks.map((link) =>
            link.isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-sans text-text-muted hover:text-text-primary"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-sans text-text-muted hover:text-text-primary"
              >
                {link.label}
              </a>
            )
          )}
          <hr className="border-card-border" />
          <Link to="/login" onClick={() => setMobileOpen(false)} className="block text-sm font-sans text-text-muted">
            Log in
          </Link>
          <Link to="/register" onClick={() => setMobileOpen(false)} className="block btn-primary text-sm text-center">
            Get Started
          </Link>
        </motion.div>
      )}
    </motion.nav>
  );
}
