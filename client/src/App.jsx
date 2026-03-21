import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import SurveyForm from './pages/SurveyForm';
import SurveyDetail from './pages/SurveyDetail';
import InterviewPage from './pages/InterviewPage';
import AnalyticsOverview from './pages/AnalyticsOverview';
import SurveyAnalytics from './pages/SurveyAnalytics';
import InterviewDetail from './pages/InterviewDetail';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/interview/test/:surveyId" element={<InterviewPage />} />
      <Route path="/interview/:token" element={<InterviewPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/surveys/create" element={<SurveyForm />} />
        <Route path="/surveys/:id/edit" element={<SurveyForm />} />
        <Route path="/surveys/:id" element={<SurveyDetail />} />
        <Route path="/analytics" element={<AnalyticsOverview />} />
        <Route path="/surveys/:id/analytics" element={<SurveyAnalytics />} />
        <Route path="/analytics/interviews/:interviewId" element={<InterviewDetail />} />
      </Route>
    </Routes>
  );
}
