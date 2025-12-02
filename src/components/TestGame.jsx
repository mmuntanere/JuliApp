import React, { useState } from 'react';

const TestGame = ({ test, onFinish, onExit }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [failedQuestions, setFailedQuestions] = useState([]);

    const currentQuestion = test.preguntes[currentQuestionIndex];
    const totalQuestions = test.preguntes.length;

    const handleOptionClick = (option) => {
        if (isAnswered) return;

        setSelectedOption(option);
        setIsAnswered(true);

        const isCorrect = option === currentQuestion.resposta_correcta;
        if (isCorrect) {
            setScore(score + 1);
        } else {
            setFailedQuestions([...failedQuestions, currentQuestion]);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            onFinish(score, failedQuestions);
        }
    };

    const getOptionClass = (option) => {
        if (!isAnswered) return 'btn glass-panel option-btn';

        if (option === currentQuestion.resposta_correcta) {
            return 'btn glass-panel option-btn correct';
        }

        if (option === selectedOption && option !== currentQuestion.resposta_correcta) {
            return 'btn glass-panel option-btn incorrect';
        }

        return 'btn glass-panel option-btn disabled';
    };

    return (
        <div className="test-container fade-in">
            <div className="test-header">
                <button className="btn glass-panel" onClick={onExit} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    ← Menú
                </button>
                <h2>{test.examen}</h2>
                <div className="progress-indicator">
                    Pregunta {currentQuestionIndex + 1} de {totalQuestions}
                </div>
            </div>

            <div className="question-card glass-panel">
                <h3 className="question-text">{currentQuestion.pregunta}</h3>

                <div className="options-grid">
                    {currentQuestion.opcions.map((option, index) => (
                        <button
                            key={index}
                            className={getOptionClass(option)}
                            onClick={() => handleOptionClick(option)}
                            disabled={isAnswered}
                        >
                            {option}
                        </button>
                    ))}
                </div>

                {isAnswered && (
                    <div className="feedback-section fade-in">
                        <p className="explanation">
                            <strong>{selectedOption === currentQuestion.resposta_correcta ? '¡Correcto!' : 'Incorrecto'}</strong>
                            <br />
                            {currentQuestion.explicacio}
                        </p>
                        <button className="btn btn-primary next-btn" onClick={handleNext}>
                            {currentQuestionIndex < totalQuestions - 1 ? 'Siguiente Pregunta' : 'Finalizar Test'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestGame;
