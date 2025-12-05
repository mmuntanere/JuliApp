import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const { loginWithGoogle } = useAuth();
    const [error, setError] = useState('');
    const navigate = useNavigate();

    async function handleLogin() {
        try {
            setError('');
            await loginWithGoogle();
            navigate('/');
        } catch (err) {
            setError('Error al iniciar sesión: ' + err.message);
        }
    }

    return (
        <div className="glass-panel" style={{
            maxWidth: '400px',
            margin: '0 auto',
            padding: '2rem',
            textAlign: 'center',
            marginTop: '10vh'
        }}>
            <h1 style={{ marginBottom: '2rem', color: 'var(--color-primary)' }}>
                Oposicions Subalterns
            </h1>

            <button
                className="btn btn-primary"
                onClick={handleLogin}
                style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}
            >
                Entrar amb Google
            </button>

            {error && (
                <div style={{
                    marginTop: '1rem',
                    color: 'var(--color-error)',
                    fontSize: '0.9rem'
                }}>
                    {error}
                </div>
            )}
        </div>
    );
}
