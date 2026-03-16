import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, FileText, BarChart3, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user, logout } = useAuth();

  const cards = [
    {
      title: 'Create Survey',
      description: 'Design a new AI-powered conversational survey',
      icon: PlusCircle,
    },
    {
      title: 'My Surveys',
      description: 'View and manage your existing surveys',
      icon: FileText,
    },
    {
      title: 'Analytics',
      description: 'Insights and reports from survey responses',
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-white border-b border-card-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-serif text-text-primary">SurveyAgent</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted font-sans">{user?.name}</span>
          <Link
            to="/settings"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="container-max section-padding">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl lg:text-4xl font-serif text-text-primary">
            Welcome back, {user?.name}
          </h2>
          <p className="text-text-muted font-sans mt-2">{user?.org_name}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card hover:shadow-lg transition-all duration-200 cursor-pointer group"
            >
              <card.icon className="w-8 h-8 text-accent mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-serif text-lg text-text-primary">{card.title}</h3>
              <p className="text-sm text-text-muted font-sans mt-1">{card.description}</p>
              <span className="inline-block mt-4 text-xs bg-accent/10 text-accent px-3 py-1 rounded-full font-sans font-medium">
                Coming soon
              </span>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
