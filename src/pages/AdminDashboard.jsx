import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    if (!currentUser) return <div className="fade-in" style={{ padding: '2rem' }}>Access Denied</div>;

    return (
        <div className="fade-in" style={{
            maxWidth: '1000px',
            margin: '4rem auto',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h1 style={{
                color: 'var(--color-primary)',
                fontSize: '2.5rem',
                marginBottom: '3rem'
            }}>
                Administration Dashboard
            </h1>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem'
            }}>
                <div
                    onClick={() => navigate('/admin/manager')}
                    className="glass-panel"
                    style={{
                        padding: '3rem',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, background 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '250px'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Manage Content</h2>
                    <p style={{ opacity: 0.7 }}>Edit, delete, and organize existing questions</p>
                </div>

                <div
                    onClick={() => navigate('/admin/import')}
                    className="glass-panel"
                    style={{
                        padding: '3rem',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, background 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '250px'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📤</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Import Questions</h2>
                    <p style={{ opacity: 0.7 }}>Upload new JSON or JS files</p>
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
