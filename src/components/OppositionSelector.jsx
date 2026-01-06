import React from 'react';
import { OPPOSITIONS } from '../data/mockData';

const OppositionSelector = ({ onSelect }) => {
    const options = [
        {
            id: OPPOSITIONS.ADMIN,
            title: 'Oposiciones Administración',
            description: 'Subalterno, Administrativo...',
            icon: '🏛️'
        },
        {
            id: OPPOSITIONS.MADRID,
            title: 'Técnico Ayto. Madrid',
            description: 'Temario específico Ayuntamiento',
            icon: '🐻'
        }
    ];

    return (
        <div className="glass-panel" style={{
            maxWidth: '800px',
            margin: '2rem auto',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h2 style={{ marginBottom: '2rem', fontSize: '1.8rem' }}>Selecciona tu Oposición</h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem'
            }}>
                {options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => onSelect(option.id)}
                        className="glass-panel"
                        style={{
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 255, 255, 0.05)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                    >
                        <div style={{ fontSize: '3rem' }}>{option.icon}</div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{option.title}</h3>
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>{option.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default OppositionSelector;
