import React from 'react';

const TopBar = ({ user, onMenuClick }) => {
    return (
        <div className="glass-panel" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 1rem',
            zIndex: 1000,
            borderRadius: 0,
            marginBottom: '1rem',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-text)' }}>
                JuliAPP
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    {user?.displayName || user?.email}
                </span>
                <button
                    onClick={onMenuClick}
                    className="btn glass-panel"
                    style={{
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 'auto',
                        aspectRatio: '1/1'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default TopBar;
