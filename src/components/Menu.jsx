import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getUserStats, getFailedQuestionsCount, getFailedQuestionsExam } from '../services/statsService';
import { useAuth } from '../contexts/AuthContext';

const Menu = ({ onSelectTest, category }) => {
    const { currentUser } = useAuth();
    const [menuData, setMenuData] = useState({});
    const [userStats, setUserStats] = useState(null);
    const [failedCount, setFailedCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Navigation State
    const [currentType, setCurrentType] = useState(null); // 'Exam', 'Theme', etc.
    const [selectedGroup, setSelectedGroup] = useState(null); // 'Group 1', etc.
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (currentUser) {
                    const stats = await getUserStats(currentUser.uid);
                    setUserStats(stats);
                    const count = await getFailedQuestionsCount(currentUser.uid);
                    setFailedCount(count);
                }

                const q = collection(db, 'questions');
                const snapshot = await getDocs(q);
                const allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const targetCategory = (category || import.meta.env.VITE_CATEGORY || 'Subaltern').toLowerCase();

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
                        setError(`No exams found for category '${targetCategory}'. Available: ${availableCategories.join(', ')}`);
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
    }, [currentUser, category]);

    const handleTypeSelect = (type) => {
        setCurrentType(type);
        setSelectedGroup(null); // Reset group when changing type
    };

    const handleGroupSelect = (groupName) => {
        setSelectedGroup(groupName);
    };

    const handleExamSelect = (name, type) => {
        const questions = menuData[type][name];
        const exam = {
            id: `${type}-${name}`,
            name: name,
            examen: name,
            type: type,
            questions: questions
        };
        onSelectTest(exam);
    };

    const handleBack = () => {
        if (selectedGroup) {
            setSelectedGroup(null);
        } else {
            setCurrentType(null);
        }
    };

    if (loading) {
        return <div className="menu-container"><div className="glass-panel" style={{ padding: '2rem' }}>Cargando exámenes...</div></div>;
    }

    if (error) {
        return <div className="menu-container"><div className="glass-panel" style={{ padding: '2rem', color: 'var(--color-error)' }}>{error}</div></div>;
    }

    // --- RENDERERS ---

    // 1. Level 1: Select Type (Themes, Exams...)
    const renderTypeSelection = () => {
        const types = Object.keys(menuData).sort();

        if (types.length === 0) {
            return <div className="glass-panel" style={{ padding: '2rem' }}>No hay exámenes disponibles en esta categoría.</div>
        }

        return (
            <div className="menu-list fade-in">
                {failedCount > 0 && (
                    <button
                        className="btn glass-panel menu-item"
                        style={{ background: 'rgba(220, 53, 69, 0.2)', borderColor: 'var(--color-error)' }}
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const reviewExam = await getFailedQuestionsExam(currentUser.uid);
                                setLoading(false);
                                if (reviewExam) {
                                    onSelectTest(reviewExam);
                                }
                            } catch (e) {
                                setLoading(false);
                                console.error(e);
                                alert(`Error generando repaso: ${e.message}`);
                            }
                        }}
                    >
                        🚨 REPASO DE FALLOS ({failedCount})
                    </button>
                )}
                {types.map(type => (
                    <button
                        key={type}
                        className="btn glass-panel menu-item"
                        onClick={() => handleTypeSelect(type)}
                    >
                        {(() => {
                            const t = type.toLowerCase();
                            if (t.includes('exam')) return 'EXÁMENES';
                            if (t.includes('them') || t.includes('tema')) return 'TEMAS';
                            return type.toUpperCase();
                        })()}
                    </button>
                ))}
                <button className="btn glass-panel menu-item danger" onClick={() => window.location.reload()}>
                    SALIR
                </button>
            </div>
        );
    };

    // 2. Level 2: Group Selection (Only for Themes) OR Exam List directly
    const renderSecondLevel = () => {
        // Check if this type has groups
        // We iterate through all exams in this type and collect their groups
        const examsMap = menuData[currentType] || {};
        const examNames = Object.keys(examsMap);

        // Find if any exam has a group defined
        const groups = new Set();
        let hasGroups = false;

        examNames.forEach(name => {
            const questions = examsMap[name];
            const group = questions[0]?.group; // Look at first question for metadata
            if (group) {
                groups.add(group);
                hasGroups = true;
            } else {
                groups.add('General'); // Default group
            }
        });

        const sortedGroups = [...groups].sort();

        // If it's "Themes" (Temas) AND we have multiple groups (or at least one explicit group), show Group Selector.
        // Or if the user explicitly requested "En el menú, cuando se elija Temas, saldrá otro submenú"
        const isTheme = currentType.toLowerCase().includes('tema') || currentType.toLowerCase().includes('them');

        if (isTheme && hasGroups && !selectedGroup) {
            return (
                <div className="menu-list fade-in">
                    <h2 className="submenu-title">SELECCIONA GRUPO</h2>
                    <div className="submenu-grid">
                        {sortedGroups.map(group => (
                            <button
                                key={group}
                                className="btn glass-panel menu-item"
                                onClick={() => handleGroupSelect(group)}
                            >
                                {group}
                            </button>
                        ))}
                    </div>
                    <button className="btn glass-panel menu-item back-btn" onClick={handleBack}>
                        Volver
                    </button>
                </div>
            );
        }

        // Otherwise (Exams, or Theme with Group Selected, or No Groups), show the List of Exams
        // Filter by group if selected
        let displayNames = examNames;
        if (selectedGroup) {
            displayNames = examNames.filter(name => {
                const questions = examsMap[name];
                const g = questions[0]?.group || 'General';
                return g === selectedGroup;
            });
        }

        displayNames.sort();

        return (
            <div className="menu-list fade-in">
                <h2 className="submenu-title" style={{ textTransform: 'uppercase' }}>
                    {selectedGroup ? selectedGroup : (
                        (() => {
                            const t = currentType.toLowerCase();
                            if (t.includes('exam')) return 'EXÁMENES';
                            if (t.includes('them') || t.includes('tema')) return 'TEMAS';
                            return currentType;
                        })()
                    )}
                </h2>
                <div className="submenu-grid">
                    {displayNames.map(name => {
                        const examId = `${currentType}-${name}`;
                        const bestScore = userStats?.bestScores?.[examId];

                        return (
                            <button
                                key={name}
                                className="btn glass-panel menu-item"
                                onClick={() => handleExamSelect(name, currentType)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <span>{name}</span>
                                {bestScore !== undefined && (
                                    <span className="badge" style={{
                                        fontSize: '0.8rem',
                                        background: 'var(--color-primary)',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        marginLeft: '8px'
                                    }}>
                                        🏆 {bestScore}%
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <button className="btn glass-panel menu-item back-btn" onClick={handleBack}>
                    Volver
                </button>
            </div>
        );
    };

    return (
        <div className="menu-container">
            {!currentType ? renderTypeSelection() : renderSecondLevel()}
        </div>
    );
};

export default Menu;
