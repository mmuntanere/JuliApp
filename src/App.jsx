import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './components/Menu';
import TestGame from './components/TestGame';
import Results from './components/Results';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminImport from './pages/AdminImport';
import AdminManager from './pages/AdminManager';
import PrivateRoute from './components/PrivateRoute';
import './index.css';

function MainApp() {
  const [view, setView] = useState('menu'); // menu, game, results
  const [currentTest, setCurrentTest] = useState(null);
  const [testResults, setTestResults] = useState({ score: 0, failedQuestions: [] });

  const handleSelectTest = (test) => {
    setCurrentTest(test);
    setView('game');
  };

  const handleFinishTest = (score, failedQuestions) => {
    setTestResults({ score, failedQuestions });
    setView('results');

    // Save score logic could go here
    if (currentTest && currentTest.id) {
      const percentage = Math.round((score / currentTest.questions.length) * 100);
      localStorage.setItem(`score_${currentTest.id}`, percentage);
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

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <img src="/logo.png" alt="JuliAPP Logo" style={{ maxHeight: '150px', width: 'auto' }} />
      </div>

      {view === 'menu' && (
        <Menu onSelectTest={handleSelectTest} />
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
      </Routes>
    </Router>
  );
}

export default App;
