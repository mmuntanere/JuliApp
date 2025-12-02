import React, { useState } from 'react';
import Menu from './components/Menu';
import TestGame from './components/TestGame';
import Results from './components/Results';
import './index.css';

function App() {
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
      const percentage = Math.round((score / currentTest.preguntes.length) * 100);
      localStorage.setItem(`score_${currentTest.id}`, percentage);
    }
  };

  const handleRetryFailed = (failedQuestions) => {
    const retryTest = {
      id: `retry_${Date.now()}`,
      name: 'Repaso de Fallos',
      examen: `Repaso: ${currentTest.examen}`,
      preguntes: failedQuestions
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
          totalQuestions={currentTest.preguntes.length}
          failedQuestions={testResults.failedQuestions}
          onRetry={handleRetryFailed}
          onMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}

export default App;
