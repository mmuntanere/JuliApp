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
            <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'center' }}>
                <img
                    src="/logo.png"
                    alt="JuliAPP"
                    style={{
                        height: '180px',
                        width: 'auto',
                        filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.2))'
                    }}
                />
            </div>

            <button
                onClick={handleLogin}
                className="google-btn"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    color: '#1f1f1f',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    fontSize: '16px',
                    fontWeight: '500',
                    fontFamily: 'Roboto, sans-serif',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '300px',
                    margin: '0 auto',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'background-color 0.2s, box-shadow 0.2s',
                    height: '48px'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f7f8f8';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
            >
                <div style={{ marginRight: '12px', display: 'flex', alignItems: 'center' }}>
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.95-2.09 15.81-5.65l-7.73-6c-2.15 1.45-4.92 2.3-8.08 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                </div>
                <span>Continuar amb Google</span>
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
