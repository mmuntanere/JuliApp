import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserStats, getUserHistory } from '../services/statsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Statistics = ({ onBack }) => {
    const { currentUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (currentUser) {
                const [summaryData, historyData] = await Promise.all([
                    getUserStats(currentUser.uid),
                    getUserHistory(currentUser.uid)
                ]);
                setStats(summaryData);
                setHistory(historyData);
            }
            setLoading(false);
        };
        loadData();
    }, [currentUser]);

    // Calculate Daily Stats and Chart Data
    const { dailyStats, chartData } = useMemo(() => {
        const today = new Date().toDateString();
        let todayExams = 0;
        let todayQuestions = 0;
        let todayCorrect = 0;

        // Map for Chart: "YYYY-MM-DD" -> { totalPct: 0, count: 0 }
        const dateMap = {};

        history.forEach(item => {
            const itemDate = item.date; // Already a Date object from service
            const dateKey = itemDate.toISOString().split('T')[0]; // YYYY-MM-DD

            // Daily Stats (Today)
            if (itemDate.toDateString() === today) {
                todayExams++;
                todayQuestions += (item.totalQuestions || 0);
                // Calculate correct answers from percentage if score missing (legacy) or use score
                // Using score is better.
                todayCorrect += (item.score || 0);
            }

            // Chart Data
            if (!dateMap[dateKey]) {
                dateMap[dateKey] = { totalPct: 0, count: 0 };
            }
            dateMap[dateKey].totalPct += (item.percentage || 0);
            dateMap[dateKey].count++;
        });

        const daily = {
            exams: todayExams,
            questions: todayQuestions,
            // Calculate percentage for today
            percentage: todayQuestions > 0 ? Math.round((todayCorrect / todayQuestions) * 100) : 0
        };

        const chart = Object.keys(dateMap).sort().map(date => ({
            date: date, // X-Axis
            score: Math.round(dateMap[date].totalPct / dateMap[date].count) // Y-Axis
        }));

        return { dailyStats: daily, chartData: chart };
    }, [history]);

    if (loading) {
        return <div className="glass-panel fade-in" style={{ padding: '2rem', textAlign: 'center' }}>Cargando estadísticas...</div>;
    }

    if (!stats) {
        return (
            <div className="glass-panel fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
                <h3>No hay datos disponibles</h3>
                <p>Realiza algún test para ver tus estadísticas.</p>
                <button className="btn btn-primary" onClick={onBack} style={{ marginTop: '1rem' }}>Volver</button>
            </div>
        );
    }

    const calcPct = (correct, total) => {
        if (!total || total === 0) return 0;
        return Math.round((correct / total) * 100);
    };

    const globalPct = calcPct(stats.totalCorrect, stats.totalQuestionsAnswered);

    return (
        <div className="stats-container fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
            <div className="stats-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                <button className="btn glass-panel" onClick={onBack} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', marginRight: '1rem' }}>
                    ← Menú
                </button>
                <h2 style={{ margin: 0 }}>Mis Estadísticas</h2>
            </div>

            {/* Daily Stats Section */}
            <h3 style={{ marginBottom: '1rem', paddingLeft: '0.5rem', borderLeft: '4px solid var(--color-accent)' }}>Hoy</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: dailyStats.percentage >= 50 ? 'var(--color-success)' : 'var(--color-text)' }}>
                        {dailyStats.percentage}%
                    </div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Acierto Hoy</div>
                </div>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{dailyStats.exams}</div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Tests Hoy</div>
                </div>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{dailyStats.questions}</div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Preguntas Hoy</div>
                </div>
            </div>

            {/* Global Stats Section */}
            <h3 style={{ marginBottom: '1rem', paddingLeft: '0.5rem', borderLeft: '4px solid var(--color-primary)' }}>Global</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{globalPct}%</div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Acierto Histórico</div>
                </div>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalExamsTaken || 0}</div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Tests Totales</div>
                </div>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalQuestionsAnswered || 0}</div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Preguntas Totales</div>
                </div>
            </div>

            {/* Chart Section */}
            <h3 style={{ marginBottom: '1rem', paddingLeft: '0.5rem', borderLeft: '4px solid #8884d8' }}>Evolución</h3>
            <div className="glass-panel" style={{ padding: '1.5rem', height: '300px', marginBottom: '2rem' }}>
                {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="date" stroke="#888" style={{ fontSize: '0.8rem' }} />
                            <YAxis domain={[0, 100]} stroke="#888" style={{ fontSize: '0.8rem' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#222', border: '1px solid #444', color: '#fff' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#82ca9d"
                                strokeWidth={3}
                                activeDot={{ r: 8 }}
                                name="Acierto Medio"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', opacity: 0.5 }}>
                        Necesitas realizar exámenes en diferentes días para ver la evolución.
                    </div>
                )}
            </div>

            {/* Breakdown by Type */}
            <h3 style={{ marginBottom: '1rem', paddingLeft: '0.5rem', borderLeft: '4px solid var(--color-warning)' }}>Progreso por Tema</h3>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {!stats.byType || Object.keys(stats.byType).length === 0 ? (
                    <p style={{ opacity: 0.7 }}>Completa tests para ver el desglose por tema.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {Object.entries(stats.byType).sort().map(([type, data]) => {
                            const pct = calcPct(data.totalCorrect, data.totalQuestions);
                            return (
                                <div key={type}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold' }}>{type}</span>
                                        <span>{pct}% ({data.totalCorrect}/{data.totalQuestions})</span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '10px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '5px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${pct}%`,
                                            height: '100%',
                                            background: pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-error)',
                                            transition: 'width 1s ease-in-out'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Statistics;
