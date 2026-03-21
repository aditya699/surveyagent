import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import SurveyForm from './pages/SurveyForm';
import SurveyDetail from './pages/SurveyDetail';
import InterviewPage from './pages/InterviewPage';
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
      </Route>
    </Routes>
  );
}
