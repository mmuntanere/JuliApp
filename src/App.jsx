import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './components/Menu';
import TestGame from './components/TestGame';
import Results from './components/Results';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminImport from './pages/AdminImport';
import AdminManager from './pages/AdminManager';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetails from './pages/AdminUserDetails';
import PrivateRoute from './components/PrivateRoute';
import TopBar from './components/TopBar';
import SideMenu from './components/SideMenu';
import OppositionSelector from './components/OppositionSelector';
import { useAuth } from './contexts/AuthContext';
import { saveExamResult, processReviewResults } from './services/statsService';
import { getOppositionConfig } from './data/mockData';
import Statistics from './components/Statistics';
import './index.css';

function MainApp() {
  const { currentUser, logout } = useAuth();
  const [view, setView] = useState('selector'); // selector, menu, game, results, stats
  const [selectedOpposition, setSelectedOpposition] = useState(null);
  const [currentTest, setCurrentTest] = useState(null);
  const [testResults, setTestResults] = useState({ score: 0, failedQuestions: [] });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu and handle logout
  const handleLogout = async () => {
    try {
      await logout();
      // PrivateRoute will handle redirect to login
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };



  const handleSelectOpposition = (oppositionId) => {
    setSelectedOpposition(oppositionId);
    setView('menu');
  };

  const handleOpenStats = () => {
    setView('stats');
    setIsMenuOpen(false); // Close side menu
  };

  const handleSelectTest = (test) => {
    setCurrentTest(test);
    setView('game');
  };

  const handleFinishTest = async (score, failedQuestions) => {
    setTestResults({ score, failedQuestions });
    setView('results');

    if (currentTest && currentUser) {
      if (currentTest.type === 'Repaso') {
        // It's a review exam. We need to process streaks.
        // We need to know which questions were answered correctly in THIS session.
        // 'failedQuestions' only tells us what was WRONG.
        // We can infer correct ones: All questions in currentTest - failedQuestions.

        const failedIds = new Set(failedQuestions.map(q => q.id));
        const results = currentTest.questions.map(q => ({
          ...q, // contains _reviewId
          correct: !failedIds.has(q.id)
        }));

        await processReviewResults(currentUser.uid, results);
      } else {
        // Normal exam
        await saveExamResult(
          currentUser.uid,
          currentTest,
          score,
          currentTest.questions.length,
          failedQuestions
        );
      }
    }
  };

  const handleRetryFailed = (failedQuestions) => {
    const retryTest = {
      id: `retry_${Date.now()}`,
      name: 'Repaso de Fallos',
      examen: `Repaso: ${currentTest.examen}`,
      questions: failedQuestions
    };
    setCurrentTest(retryTest);
    setView('game');
  };

  const handleBackToMenu = () => {
    setView('menu');
    setCurrentTest(null);
    setTestResults({ score: 0, failedQuestions: [] });
  };

  const handleBackToSelector = () => {
    setSelectedOpposition(null);
    setView('selector');
  };

  // Get data based on selection
  const oppositionConfig = selectedOpposition ? getOppositionConfig(selectedOpposition) : null;

  return (
    <div className="app-container" style={{ paddingTop: '80px' }}> {/* Padding for TopBar */}
      <TopBar
        user={currentUser}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onLogout={handleLogout}
        onStats={handleOpenStats}
      />

      {view !== 'game' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Logo" className="logo" style={{ maxWidth: '300px', width: '100%', height: 'auto' }} />
        </div>
      )}

      <div className="main-content">
        {view === 'selector' && (
          <OppositionSelector onSelect={handleSelectOpposition} />
        )}

        {view === 'menu' && oppositionConfig && (
          <div>
            <button onClick={handleBackToSelector} className="btn" style={{ marginBottom: '1rem' }}>
              ← Cambiar Oposición
            </button>
            <Menu onSelectTest={handleSelectTest} category={oppositionConfig?.category} />
          </div>
        )}

        {view === 'game' && currentTest && (
          <TestGame
            test={currentTest}
            onFinish={handleFinishTest}
            onExit={handleBackToMenu}
          />
        )}

        {view === 'results' && (
          <Results
            score={testResults.score}
            totalQuestions={currentTest.questions.length}
            failedQuestions={testResults.failedQuestions}
            onRetry={handleRetryFailed}
            onMenu={handleBackToMenu}
          />
        )}

        {view === 'stats' && (
          <Statistics onBack={() => setView('menu')} />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainApp />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/import"
          element={
            <PrivateRoute>
              <AdminImport />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/manager"
          element={
            <PrivateRoute>
              <AdminManager />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute>
              <AdminUsers />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <PrivateRoute>
              <AdminUserDetails />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
