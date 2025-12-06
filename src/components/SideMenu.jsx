import React from 'react';

const SideMenu = ({ isOpen, onClose, onLogout, onStats }) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 1001,
                    backdropFilter: 'blur(2px)'
                }}
            />

            {/* Menu Panel */}
            <div className="glass-panel" style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '280px',
                zIndex: 1002,
                borderRadius: '16px 0 0 16px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transform: isOpen ? 'translateX(0)' : 'translateX(100%)', // For animation if we added it
                transition: 'transform 0.3s ease'
            }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button onClick={onClose} className="btn glass-panel" style={{ padding: '0.5rem' }}>
                        ✕
                    </button>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button className="btn glass-panel" style={{ textAlign: 'left', opacity: 0.5, cursor: 'not-allowed' }}>
                        ⚙️ Configuración
                    </button>
                    <button className="btn glass-panel" onClick={onStats} style={{ textAlign: 'left' }}>
                        📊 Estadísticas
                    </button>
                    <button className="btn glass-panel danger" onClick={onLogout} style={{ textAlign: 'left', marginTop: 'auto' }}>
                        🚪 Cerrar Sesión
                    </button>
                </div>
            </div>
        </>
    );
};

export default SideMenu;
