import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const Menu = ({ onSelectTest }) => {
    const [menuData, setMenuData] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('main'); // 'main' or specific type key
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch ALL questions to allow client-side case-insensitive filtering
                const q = collection(db, 'questions');
                const snapshot = await getDocs(q);
                const allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Determine target category
                const targetCategory = (import.meta.env.VITE_CATEGORY || 'Subaltern').toLowerCase();

                // Client-side filter
                const filteredQuestions = allQuestions.filter(q =>
                    (q.category || '').toLowerCase() === targetCategory
                );

                // Group by Type -> Name
                const grouped = {};
                filteredQuestions.forEach(question => {
                    const type = question.type || 'General';
                    const name = question.name || 'Untitled Exam';

                    if (!grouped[type]) {
                        grouped[type] = {};
                    }
                    if (!grouped[type][name]) {
                        grouped[type][name] = [];
                    }
                    grouped[type][name].push(question);
                });

                if (filteredQuestions.length === 0) {
                    const availableCategories = [...new Set(allQuestions.map(q => q.category))];
                    if (allQuestions.length === 0) {
                        setError("Database is empty. Please import exams in the Admin Panel.");
                    } else {
                        // Fallback: If target not found, try to correct or show error
                        // If env says 'Subalter' but DB has 'Subaltern', we might want to be lenient?
                        // For now, let's just error but maybe suggest available.
                        setError(`No exams found for category '${import.meta.env.VITE_CATEGORY}'. Available: ${availableCategories.join(', ')}`);
                    }
                }

                setMenuData(grouped);
            } catch (err) {
                console.error("Error loading menu data:", err);
                setError("Error loading exams. Please check console.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleTypeSelect = (type) => {
        setCurrentView(type);
    };

    const handleExamSelect = (name, type) => {
        const questions = menuData[type][name];
        // Construct exam object compatible with TestGame
        const exam = {
            id: `${type}-${name}`,
            name: name,
            examen: name, // Legacy field support
            questions: questions
        };
        onSelectTest(exam);
    };

    if (loading) {
        return <div className="menu-container"><div className="glass-panel" style={{ padding: '2rem' }}>Cargando exámenes...</div></div>;
    }

    if (error) {
        return <div className="menu-container"><div className="glass-panel" style={{ padding: '2rem', color: 'var(--color-error)' }}>{error}</div></div>;
    }

    const renderMainMenu = () => {
        const types = Object.keys(menuData).sort();
        /*
          The user requested: 
          "Al inicio, aparezcan tantos botones como type tenga esta categoría, y con el nombre del type en el botón."
        */
        if (types.length === 0) {
            return <div className="glass-panel" style={{ padding: '2rem' }}>No hay exámenes disponibles en esta categoría.</div>
        }

        return (
            <div className="menu-list fade-in">
                {types.map(type => (
                    <button
                        key={type}
                        className="btn glass-panel menu-item"
                        onClick={() => handleTypeSelect(type)}
                    >
                        {type.toUpperCase()}
                    </button>
                ))}
                <button className="btn glass-panel menu-item danger" onClick={() => window.location.reload()}>
                    SALIR
                </button>
            </div>
        );
    };

    const renderSubMenu = () => {
        /*
          The user requested:
          "Al entrar dentro del type, quiero que salgan tantos botones como exámenes haya dentro del type. El botón tendrá el nombre que aparece en Nombre."
        */
        const examNames = Object.keys(menuData[currentView] || {}).sort();

        return (
            <div className="menu-list fade-in">
                <h2 className="submenu-title" style={{ textTransform: 'uppercase' }}>{currentView}</h2>
                <div className="submenu-grid">
                    {examNames.map(name => (
                        <button
                            key={name}
                            className="btn glass-panel menu-item"
                            onClick={() => handleExamSelect(name, currentView)}
                        >
                            {name}
                        </button>
                    ))}
                </div>
                <button className="btn glass-panel menu-item back-btn" onClick={() => setCurrentView('main')}>
                    Volver
                </button>
            </div>
        );
    };

    return (
        <div className="menu-container">
            {currentView === 'main' ? renderMainMenu() : renderSubMenu()}
        </div>
    );
};

export default Menu;
