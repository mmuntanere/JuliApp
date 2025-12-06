import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function AdminManager() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' or 'edit'
    const [currentExam, setCurrentExam] = useState(null);
    const [filterText, setFilterText] = useState('');
    const [selectedExams, setSelectedExams] = useState(new Set()); // Store IDs of selected exams

    // --- Data Fetching ---

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'questions'));
            const snapshot = await getDocs(q);
            const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Group by Name + Category + Subcategory + Type
            const grouped = {};
            questions.forEach(q => {
                // strict grouping: if name differs, it's a different exam
                const key = `${q.name || ''}|${q.category || 'Uncategorized'}|${q.subcategory || 'General'}|${q.type || 'Test'}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        id: key,
                        uniqueKey: key, // Store key for updates
                        metadata: {
                            name: q.name || '',
                            category: q.category || 'Uncategorized',
                            subcategory: q.subcategory || 'General',
                            type: q.type || 'Test'
                        },
                        questions: []
                    };
                }
                grouped[key].questions.push(q);
            });

            setExams(Object.values(grouped));
        } catch (error) {
            console.error("Error fetching exams:", error);
            alert("Error loading exams: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- List View Handlers ---

    const handleEdit = (exam) => {
        // Deep copy to avoid mutating state directly
        setCurrentExam(JSON.parse(JSON.stringify(exam)));
        setView('edit');
    };

    const handleDeleteExam = async (exam) => {
        if (!window.confirm(`Are you sure you want to delete this exam and its ${exam.questions.length} questions?`)) return;

        try {
            setLoading(true);
            const batch = writeBatch(db);
            exam.questions.forEach(q => {
                const ref = doc(db, 'questions', q.id);
                batch.delete(ref);
            });
            await batch.commit();
            await fetchExams(); // Refresh
        } catch (error) {
            console.error("Error deleting exam:", error);
            alert("Error deleting: " + error.message);
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedExams.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedExams.size} exams? This action cannot be undone.`)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            let operationCount = 0; // Firestore limits batches to 500

            // Helper to commit and reset batch if needed
            // NOTE: For simplicity, if we have > 500 ops, we should use loop.
            // But here we are iterating exams -> questions. 
            // Better strategy: Collect all Question IDs first.
            let allQuestionIds = [];

            // Find exams in state that are selected
            const examsToDelete = exams.filter(e => selectedExams.has(e.id));

            examsToDelete.forEach(e => {
                e.questions.forEach(q => allQuestionIds.push(q.id));
            });

            // Perform deletions in chunks of 500
            for (let i = 0; i < allQuestionIds.length; i += 500) {
                const chunk = allQuestionIds.slice(i, i + 500);
                const currentBatch = writeBatch(db);
                chunk.forEach(id => {
                    const ref = doc(db, 'questions', id);
                    currentBatch.delete(ref);
                });
                await currentBatch.commit();
            }

            await fetchExams();
            setSelectedExams(new Set());
        } catch (error) {
            console.error("Error bulk deleting:", error);
            alert("Error deleting: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = (filteredExams) => {
        if (selectedExams.size === filteredExams.length && filteredExams.length > 0) {
            setSelectedExams(new Set());
        } else {
            setSelectedExams(new Set(filteredExams.map(e => e.id)));
        }
    };

    const toggleSelectExam = (id) => {
        const newSelected = new Set(selectedExams);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedExams(newSelected);
    };

    // --- Edit View Handlers ---

    const handleSave = async () => {
        if (!currentExam) return;
        setLoading(true);

        try {
            const batch = writeBatch(db);

            // 1. Identify questions to delete (present in DB but not in current form)
            // Ideally we tracked deletions, but simpler: 
            // We know the IDs of the original questions. 
            // If they are not in currentExam.questions provided they had an ID, we delete them?
            // Wait, this is getting complex. 
            // EASIER STRATEGY: Update all existing, Create new ones. 
            // For Deletions: We need to know which IDs were removed.

            // Let's find the original exam from state to compare
            const originalExam = exams.find(e => e.id === currentExam.id);
            const originalIds = new Set(originalExam ? originalExam.questions.map(q => q.id) : []);
            const currentIds = new Set(currentExam.questions.filter(q => q.id).map(q => q.id));

            // Delete removed questions
            for (const id of originalIds) {
                if (!currentIds.has(id)) {
                    batch.delete(doc(db, 'questions', id));
                }
            }

            // Update or Create
            const { name, category, subcategory, type } = currentExam.metadata;

            currentExam.questions.forEach(q => {
                const questionData = {
                    question: q.question,
                    options: q.options,
                    correctAnswer: parseInt(q.correct_answer || q.correctAnswer), // Ensure number
                    explanation: q.explanation || '',
                    image: q.image || null,
                    name: name || '', // Save name
                    category,
                    subcategory,
                    type, // Note: Schema might not have 'type' on question level in some versions, but useful to keep
                    updatedAt: new Date().toISOString()
                };

                if (q.id && originalIds.has(q.id)) {
                    // Update
                    const ref = doc(db, 'questions', q.id);
                    batch.update(ref, questionData);
                } else {
                    // Create
                    const ref = doc(collection(db, 'questions'));
                    batch.set(ref, { ...questionData, createdAt: new Date().toISOString() });
                }
            });

            await batch.commit();
            await fetchExams();
            setView('list');
            setCurrentExam(null);
        } catch (error) {
            console.error("Error saving:", error);
            alert("Error saving changes: " + error.message);
            setLoading(false);
        }
    };

    const handleBack = () => {
        // Confirm if dirty? For now just back.
        setView('list');
        setCurrentExam(null);
    };

    // --- Sub-components ---

    const renderList = () => {
        const filtered = exams.filter(e => {
            const search = filterText.toLowerCase();
            return (
                (e.metadata.name && e.metadata.name.toLowerCase().includes(search)) ||
                e.metadata.category.toLowerCase().includes(search) ||
                e.metadata.subcategory.toLowerCase().includes(search) ||
                e.metadata.type.toLowerCase().includes(search)
            );
        });

        return (
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <button
                        onClick={() => navigate('/admin')}
                        className="btn"
                        style={{ background: 'transparent', border: '1px solid var(--color-border)', marginBottom: '1rem' }}
                    >
                        ← Back to Dashboard
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ color: 'var(--color-primary)', margin: 0 }}>Content Management</h2>
                        <div>
                            {selectedExams.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="btn danger"
                                    style={{ marginRight: '1rem', padding: '0.4rem 1rem' }}
                                >
                                    Delete Selected ({selectedExams.size})
                                </button>
                            )}
                            <input
                                type="text"
                                placeholder="Filter by category, subcategory..."
                                value={filterText}
                                onChange={e => setFilterText(e.target.value)}
                                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '300px' }}
                            />
                        </div>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text)' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-primary)' }}>
                            <th style={{ textAlign: 'center', padding: '1rem', width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={filtered.length > 0 && selectedExams.size === filtered.length}
                                    onChange={() => toggleSelectAll(filtered)}
                                    style={{ cursor: 'pointer' }}
                                />
                            </th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Name</th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Category</th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Subcategory</th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Type</th>
                            <th style={{ textAlign: 'center', padding: '1rem' }}>Questions</th>
                            <th style={{ textAlign: 'center', padding: '1rem' }}>Success Rate</th>
                            <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(exam => (
                            <tr key={exam.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: selectedExams.has(exam.id) ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent' }}>
                                <td style={{ textAlign: 'center', padding: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedExams.has(exam.id)}
                                        onChange={() => toggleSelectExam(exam.id)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </td>
                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{exam.metadata.name || <em style={{ opacity: 0.5 }}>(Untitled)</em>}</td>
                                <td style={{ padding: '1rem' }}>{exam.metadata.category}</td>
                                <td style={{ padding: '1rem' }}>{exam.metadata.subcategory}</td>
                                <td style={{ padding: '1rem' }}>{exam.metadata.type}</td>
                                <td style={{ textAlign: 'center', padding: '1rem' }}>{exam.questions.length}</td>
                                <td style={{ textAlign: 'center', padding: '1rem' }}>
                                    {(() => {
                                        let correct = 0;
                                        let total = 0;
                                        exam.questions.forEach(q => {
                                            correct += (q.stats_correct || 0);
                                            total += (q.stats_correct || 0) + (q.stats_incorrect || 0);
                                        });
                                        if (total === 0) return <span style={{ opacity: 0.5 }}>-</span>;
                                        const pct = Math.round((correct / total) * 100);
                                        return (
                                            <span style={{
                                                color: pct < 50 ? 'var(--color-error)' : pct > 80 ? 'var(--color-success)' : 'var(--color-warning)',
                                                fontWeight: 'bold'
                                            }}>
                                                {pct}% <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>({total})</span>
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td style={{ textAlign: 'right', padding: '1rem' }}>
                                    <button
                                        onClick={() => handleEdit(exam)}
                                        className="btn"
                                        style={{ marginRight: '0.5rem', padding: '0.3rem 0.8rem', fontSize: '0.9rem' }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteExam(exam)}
                                        className="btn danger"
                                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.9rem' }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
                                    No exams found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderEditForm = () => {
        if (!currentExam) return null;

        const updateMetadata = (field, value) => {
            setCurrentExam(prev => ({
                ...prev,
                metadata: { ...prev.metadata, [field]: value }
            }));
        };

        const updateQuestion = (index, field, value) => {
            const newQuestions = [...currentExam.questions];
            newQuestions[index] = { ...newQuestions[index], [field]: value };
            setCurrentExam(prev => ({ ...prev, questions: newQuestions }));
        };

        const updateOption = (qIndex, oIndex, value) => {
            const newQuestions = [...currentExam.questions];
            const newOptions = [...newQuestions[qIndex].options];
            newOptions[oIndex] = value;
            newQuestions[qIndex].options = newOptions;
            setCurrentExam(prev => ({ ...prev, questions: newQuestions }));
        };

        const addQuestion = () => {
            setCurrentExam(prev => ({
                ...prev,
                questions: [...prev.questions, {
                    question: 'New Question',
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correct_answer: 0, // Store as index internally
                    correctAnswer: 0, // Compatibility
                    explanation: ''
                }]
            }));
        };

        const removeQuestion = (index) => {
            if (!window.confirm("Delete this question?")) return;
            setCurrentExam(prev => ({
                ...prev,
                questions: prev.questions.filter((_, i) => i !== index)
            }));
        };

        return (
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <button onClick={handleBack} className="btn" style={{ background: 'transparent', border: '1px solid var(--color-border)' }}>
                        ← Back
                    </button>
                    <h2 style={{ margin: 0 }}>Editing Exam</h2>
                    <button onClick={handleSave} className="btn btn-primary">
                        Save Changes
                    </button>
                </div>

                {/* Section A: Metadata */}
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--color-primary)' }}>Metadata</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Name (Optional)</label>
                            <input
                                type="text"
                                value={currentExam.metadata.name || ''}
                                onChange={e => updateMetadata('name', e.target.value)}
                                placeholder="Exam Name"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Category</label>
                            <input
                                type="text"
                                value={currentExam.metadata.category}
                                onChange={e => updateMetadata('category', e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Subcategory</label>
                            <input
                                type="text"
                                value={currentExam.metadata.subcategory}
                                onChange={e => updateMetadata('subcategory', e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Type</label>
                            <input
                                type="text"
                                value={currentExam.metadata.type}
                                onChange={e => updateMetadata('type', e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: 'white' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Section B: Questions */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Questions ({currentExam.questions.length})</h3>
                        <button onClick={addQuestion} className="btn" style={{ fontSize: '0.9rem' }}>+ Add Question</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {currentExam.questions.map((q, qIndex) => {
                            // Normalize correct answer
                            const currentCorrect = q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer;

                            return (
                                <div key={qIndex} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ fontWeight: 'bold', opacity: 0.5 }}>#{qIndex + 1}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {(() => {
                                                const correct = q.stats_correct || 0;
                                                const total = correct + (q.stats_incorrect || 0);
                                                if (total > 0) {
                                                    const pct = Math.round((correct / total) * 100);
                                                    return (
                                                        <span style={{ fontSize: '0.9rem', color: pct < 50 ? 'var(--color-error)' : 'var(--color-success)' }}>
                                                            Global Success: <b>{pct}%</b> ({total} attempts)
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            <button onClick={() => removeQuestion(qIndex)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Question Text</label>
                                        <textarea
                                            value={q.question}
                                            onChange={e => updateQuestion(qIndex, 'question', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: 'white', minHeight: '60px' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Options (Mark the correct one)</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            {q.options.map((opt, oIndex) => (
                                                <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="radio"
                                                        name={`correct_${qIndex}`}
                                                        checked={currentCorrect === oIndex}
                                                        onChange={() => updateQuestion(qIndex, 'correct_answer', oIndex)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                                                        style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: 'white', fontSize: '0.9rem' }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Explanation (Optional)</label>
                                        <input
                                            type="text"
                                            value={q.explanation || ''}
                                            onChange={e => updateQuestion(qIndex, 'explanation', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: 'white', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleSave} className="btn btn-primary" style={{ minWidth: '200px' }}>
                        Save Changes
                    </button>
                </div>
            </div>
        );
    };

    if (!currentUser) return <div className="fade-in" style={{ padding: '2rem', textAlign: 'center' }}>Access Denied.</div>;
    if (loading && !exams.length === 0) return <div className="fade-in" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
            {view === 'list' && renderList()}
            {view === 'edit' && renderEditForm()}
        </div>
    );
}
