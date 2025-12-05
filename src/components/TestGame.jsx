import React, { useState, useEffect } from 'react';

const TestGame = ({ test, onFinish, onExit }) => {
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [failedQuestions, setFailedQuestions] = useState([]);
    const [userAnswers, setUserAnswers] = useState({});

    useEffect(() => {
        if (test && test.questions) {
            const newQuestions = test.questions.map(q => {
                // Shuffle options
                const originalOptions = q.options;
                // Create an array of indices [0, 1, 2, 3]
                const indices = originalOptions.map((_, i) => i);
                // Shuffle indices
                const shuffledIndices = [...indices].sort(() => Math.random() - 0.5);

                // Map new options based on shuffled indices
                const newOptions = shuffledIndices.map(i => originalOptions[i]);

                // Find new correct answer index
                // The original correct answer index is q.correct_answer
                // We need to find where that index moved to in shuffledIndices
                // shuffledIndices[newIndex] = originalIndex
                // So if shuffledIndices[2] == q.correct_answer, then new correct answer is 2.
                const newCorrectAnswerIndex = shuffledIndices.indexOf(q.correct_answer);

                return {
                    ...q,
                    options: newOptions,
                    correct_answer: newCorrectAnswerIndex
                };
            });

            // Shuffle questions order
            newQuestions.sort(() => Math.random() - 0.5);

            setShuffledQuestions(newQuestions);
            setCurrentQuestionIndex(0);
            setScore(0);
            setFailedQuestions([]);
            setIsAnswered(false);
            setSelectedOption(null);
            setUserAnswers({});
        }
    }, [test]);

    if (shuffledQuestions.length === 0) {
        return <div className="test-container fade-in"><div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>Cargando test...</div></div>;
    }

    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    const totalQuestions = shuffledQuestions.length;

    const handleOptionClick = (index) => {
        if (isAnswered) return;

        setSelectedOption(index);
        setIsAnswered(true);

        // Save answer
        setUserAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: index
        }));

        const isCorrect = index === currentQuestion.correct_answer;
        if (isCorrect) {
            setScore(score + 1);
        } else {
            setFailedQuestions([...failedQuestions, currentQuestion]);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);

            // Check if next question was already answered
            if (userAnswers[nextIndex] !== undefined) {
                setSelectedOption(userAnswers[nextIndex]);
                setIsAnswered(true);
            } else {
                setSelectedOption(null);
                setIsAnswered(false);
            }
        } else {
            onFinish(score, failedQuestions);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            const prevIndex = currentQuestionIndex - 1;
            setCurrentQuestionIndex(prevIndex);

            // Restore previous answer
            if (userAnswers[prevIndex] !== undefined) {
                setSelectedOption(userAnswers[prevIndex]);
                setIsAnswered(true);
            } else {
                setSelectedOption(null);
                setIsAnswered(false);
            }
        }
    };

    const getOptionClass = (index) => {
        if (!isAnswered) return 'btn glass-panel option-btn';

        if (index === currentQuestion.correct_answer) {
            return 'btn glass-panel option-btn correct';
        }

        if (index === selectedOption && index !== currentQuestion.correct_answer) {
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
                <h3 className="question-text">{currentQuestion.question}</h3>

                {currentQuestion.image && (
                    <div className="question-image" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                        <img src={currentQuestion.image} alt="Pregunta" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                    </div>
                )}

                <div className="options-grid">
                    {currentQuestion.options.map((option, index) => (
                        <button
                            key={index}
                            className={getOptionClass(index)}
                            onClick={() => handleOptionClick(index)}
                            disabled={isAnswered}
                        >
                            {option}
                        </button>
                    ))}
                </div>

                <div className="navigation-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        className="btn glass-panel"
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1 }}
                    >
                        ← Anterior
                    </button>

                    {isAnswered && (
                        <div className="feedback-section fade-in" style={{ flex: 1, marginLeft: '1rem' }}>
                            <p className="explanation" style={{ marginBottom: '1rem' }}>
                                <strong>{selectedOption === currentQuestion.correct_answer ? '¡Correcto!' : 'Incorrecto'}</strong>
                                <br />
                                {currentQuestion.explanation}
                            </p>
                            <button className="btn btn-primary next-btn" onClick={handleNext} style={{ width: '100%' }}>
                                {currentQuestionIndex < totalQuestions - 1 ? 'Siguiente Pregunta' : 'Finalizar Test'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestGame;
