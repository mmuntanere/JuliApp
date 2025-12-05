import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function AdminImport() {
    const [jsonInput, setJsonInput] = useState('');
    const [status, setStatus] = useState('');
    const { currentUser } = useAuth();

    const handleImport = async () => {
        if (!jsonInput.trim()) {
            setStatus('Per favor, enganxa un JSON vàlid.');
            return;
        }

        try {
            setStatus('Processant...');
            const data = JSON.parse(jsonInput);

            let questionsToImport = [];
            let importMetadata = {};

            // Handle new structure { metadata: {...}, questions: [...] }
            if (data.questions && Array.isArray(data.questions)) {
                questionsToImport = data.questions;
                importMetadata = data.metadata || {};
            } else if (Array.isArray(data)) {
                // Handle old structure (array of objects)
                questionsToImport = data;
            } else {
                questionsToImport = [data];
            }

            const batch = writeBatch(db);
            const collectionRef = collection(db, 'questions');

            // Use metadata category if available, otherwise fallback to env var or default
            const category = importMetadata.category || import.meta.env.VITE_CATEGORY || 'subalter';
            const subcategory = importMetadata.subcategory || null;

            questionsToImport.forEach((item) => {
                const newDocRef = doc(collectionRef);

                // Map fields, supporting both new (English) and old (Catalan) keys
                const questionData = {
                    question: item.question || item.pregunta,
                    options: item.options || item.opcions,
                    correctAnswer: item.correct_answer !== undefined ? item.correct_answer : item.resposta_correcta,
                    explanation: item.explanation || item.explicacio,
                    image: item.image || null,
                    category: category,
                    subcategory: subcategory,
                    createdAt: serverTimestamp()
                };

                batch.set(newDocRef, questionData);
            });

            await batch.commit();
            setStatus(`Èxit! S'han importat ${questionsToImport.length} preguntes.`);
            setJsonInput(''); // Clear input on success
        } catch (error) {
            console.error("Error importing data: ", error);
            setStatus(`Error: ${error.message}`);
        }
    };

    if (!currentUser) return <div>Accés denegat</div>;

    return (
        <div className="glass-panel" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
            <h1 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>
                Importar Preguntes (Subalterns)
            </h1>

            <div style={{ marginBottom: '1.5rem' }}>
                <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='Enganxa aquí el JSON: [{"pregunta": "...", "opcions": [...], ...}]'
                    style={{
                        width: '100%',
                        height: '300px',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                        fontFamily: 'monospace'
                    }}
                />
            </div>

            <button
                className="btn btn-primary"
                onClick={handleImport}
                style={{ width: '100%', fontSize: '1.1rem' }}
            >
                Pujar a Firestore
            </button>

            {status && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: status.startsWith('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: status.startsWith('Error') ? 'var(--color-error)' : 'var(--color-success)',
                    border: '1px solid currentColor'
                }}>
                    {status}
                </div>
            )}
        </div>
    );
}
