
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getGlobalStats, getAllUsersMetadata, getGlobalSummary, getTotalUsersCount } from '../services/statsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [globalStats, setGlobalStats] = useState([]);
    const [users, setUsers] = useState([]);
    const [globalSummary, setGlobalSummary] = useState(null);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (currentUser) {
                const stats = await getGlobalStats();
                setGlobalStats(stats);

                // For growth chart we still need list
                const userList = await getAllUsersMetadata();
                setUsers(userList);

                // For counters
                const summary = await getGlobalSummary();
                setGlobalSummary(summary);

                const count = await getTotalUsersCount();
                setTotalUsers(count);
            }
            setLoading(false);
        };
        fetchData();
    }, [currentUser]);

    // --- Calculations ---

    const todayStr = new Date().toISOString().split('T')[0];

    // KPI: Today's Stats
    const todayStats = globalStats.find(s => s.date === todayStr);
    const activeUsersToday = todayStats?.activeUsers?.length || 0;
    const testsToday = todayStats?.totalTests || 0;
    const totalQsToday = todayStats?.totalQuestions || 0;
    const totalCorrectToday = todayStats?.totalCorrect || 0;
    const successRateToday = totalQsToday > 0 ? Math.round((totalCorrectToday / totalQsToday) * 100) : 0;

    // KPI: All Time
    const totalTestsAllTime = globalSummary?.totalTests || 0;

    // Charts Data

    // 1. User Growth (Cumulative)
    const userGrowthData = useMemo(() => {
        // Group users by creation date (YYYY-MM-DD). 
        // Note: We need a reliable 'date' field. If 'createdAt' is missing in DB, we skip? 
        // For now assuming getAllUsersMetadata returns valid dates or we handle it.
        const counts = {};
        users.forEach(u => {
            // Fallback: if no createdAt in DB, maybe logic is missing, but let's try
            if (u.createdAt) {
                const d = u.createdAt.toISOString().split('T')[0];
                counts[d] = (counts[d] || 0) + 1;
            }
        });

        const sortedDates = Object.keys(counts).sort();
        let cumulative = 0;
        return sortedDates.map(date => {
            cumulative += counts[date];
            return { date, count: cumulative };
        });
    }, [users]);

    // 2. Activity Last 30 Days (Tests & Active Users)
    const activityData = useMemo(() => {
        // globalStats is sorted ascending (from service? No, let's ensure sort)
        return [...globalStats].sort((a, b) => a.date.localeCompare(b.date)).map(s => ({
            date: s.date,
            tests: s.totalTests || 0,
            active: s.activeUsers?.length || 0,
            success: s.totalQuestions > 0 ? Math.round((s.totalCorrect / s.totalQuestions) * 100) : 0
        }));
    }, [globalStats]);


    if (!currentUser) return <div className="fade-in" style={{ padding: '2rem' }}>Access Denied</div>;

    return (
        <div className="fade-in" style={{
            maxWidth: '1200px',
            margin: '4rem auto',
            padding: '2rem',
        }}>
            <h1 style={{
                color: 'var(--color-primary)',
                fontSize: '2.5rem',
                marginBottom: '2rem',
                textAlign: 'center'
            }}>
                Administration Dashboard
            </h1>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {/* Row 1: Today */}
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{activeUsersToday}</div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Users Online (Today)</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{testsToday}</div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Tests (Today)</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: successRateToday > 80 ? 'var(--color-success)' : successRateToday < 50 ? 'var(--color-error)' : 'var(--color-warning)' }}>
                        {successRateToday}%
                    </div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Success Rate (Today)</div>
                </div>

                {/* Row 2: Totals */}
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ccc' }}>{totalUsers}</div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Total Users</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ccc' }}>{totalTestsAllTime}</div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Total Tests (All Time)</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                <div
                    onClick={() => navigate('/admin/manager')}
                    className="glass-panel"
                    style={{
                        padding: '2rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        transition: 'transform 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ fontSize: '2.5rem' }}>📝</div>
                    <div style={{ textAlign: 'left' }}>
                        <h2 style={{ marginBottom: '0.2rem', margin: 0 }}>Manage Content</h2>
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Edit questions & exams</p>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/admin/import')}
                    className="glass-panel"
                    style={{
                        padding: '2rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        transition: 'transform 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ fontSize: '2.5rem' }}>📤</div>
                    <div style={{ textAlign: 'left' }}>
                        <h2 style={{ marginBottom: '0.2rem', margin: 0 }}>Import Questions</h2>
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Upload JSON/JS files</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Platform Analytics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* User Growth Chart */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', opacity: 0.8 }}>Total User Growth</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={userGrowthData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="date" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Daily Activity Chart */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', opacity: 0.8 }}>Daily Tests & Active Users</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={activityData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="date" stroke="#888" />
                                <YAxis yAxisId="left" stroke="#888" />
                                <YAxis yAxisId="right" orientation="right" stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line yAxisId="left" type="monotone" dataKey="tests" stroke="#82ca9d" name="Tests" strokeWidth={2} />
                                <Line yAxisId="right" type="monotone" dataKey="active" stroke="#8884d8" name="Active Users" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <button
                onClick={() => navigate('/')}
                className="btn"
                style={{ marginTop: '3rem', background: 'transparent', border: '1px solid var(--color-border)' }}
            >
                ← Back to Home
            </button>
        </div>
    );
}
