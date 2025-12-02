import React from 'react';

const Results = ({ score, totalQuestions, failedQuestions, onRetry, onMenu }) => {
    const percentage = Math.round((score / totalQuestions) * 100);

    // Determine color based on score
    const getScoreColor = () => {
        if (percentage >= 90) return 'var(--color-success)';
        if (percentage >= 50) return 'var(--color-primary)';
        return 'var(--color-error)';
    };

    return (
        <div className="results-container fade-in">
            <div className="glass-panel results-card">
                <h2>Resultados</h2>

                <div className="score-circle" style={{ borderColor: getScoreColor(), color: getScoreColor() }}>
                    <span className="score-number">{percentage}%</span>
                    <span className="score-label">Aciertos</span>
                </div>

                <p className="score-details">
                    Has acertado {score} de {totalQuestions} preguntas.
                </p>

                <div className="actions">
                    {failedQuestions.length > 0 && (
                        <button className="btn btn-primary action-btn" onClick={() => onRetry(failedQuestions)}>
                            Repetir Fallos ({failedQuestions.length})
                        </button>
                    )}
                    <button className="btn action-btn" onClick={onMenu}>
                        Volver al Menú
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Results;
