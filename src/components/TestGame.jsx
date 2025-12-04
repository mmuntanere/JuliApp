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
        if (test && test.preguntes) {
            const newQuestions = test.preguntes.map(q => {
                // 1. Parse options to extract text
                const parsedOptions = q.opcions.map(opt => {
                    // Match "(a) ", "a) ", etc.
                    const match = opt.match(/^(\([a-d]\)|[a-d]\))\s+(.*)/);
                    return match ? match[2] : opt;
                });

                // 2. Parse correct answer to extract text
                const correctMatch = q.resposta_correcta.match(/^(\([a-d]\)|[a-d]\))\s+(.*)/);
                const correctText = correctMatch ? correctMatch[2] : q.resposta_correcta;

                // 3. Shuffle options text
                const shuffledOptionsText = [...parsedOptions].sort(() => Math.random() - 0.5);

                // 4. Re-assign prefixes
                const prefixes = ['(a)', '(b)', '(c)', '(d)'];
                const newOptions = shuffledOptionsText.map((text, index) => `${prefixes[index]} ${text}`);

                // 5. Find new correct answer
                const newCorrectIndex = shuffledOptionsText.findIndex(text => text === correctText);
                const newCorrectAnswer = newCorrectIndex !== -1 ? newOptions[newCorrectIndex] : q.resposta_correcta;

                return {
                    ...q,
                    opcions: newOptions,
                    resposta_correcta: newCorrectAnswer
                };
            });

            // 6. Shuffle questions
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

    const handleOptionClick = (option) => {
        if (isAnswered) return;

        setSelectedOption(option);
        setIsAnswered(true);

        // Save answer
        setUserAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: option
        }));

        const isCorrect = option === currentQuestion.resposta_correcta;
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
            if (userAnswers[nextIndex]) {
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
            if (userAnswers[prevIndex]) {
                setSelectedOption(userAnswers[prevIndex]);
                setIsAnswered(true);
            } else {
                setSelectedOption(null);
                setIsAnswered(false);
            }
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
                                <strong>{selectedOption === currentQuestion.resposta_correcta ? '¡Correcto!' : 'Incorrecto'}</strong>
                                <br />
                                {currentQuestion.explicacio}
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
