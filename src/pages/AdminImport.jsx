
import React, { useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function AdminImport() {
    const [jsonInput, setJsonInput] = useState('');
    const [status, setStatus] = useState('');
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const { currentUser } = useAuth();

    // --- File Handling & Validation ---

    const validateJSON = (data) => {
        // Must have metadata and questions array
        if (!data.metadata || !data.questions || !Array.isArray(data.questions)) {
            return { valid: false, error: 'Falta "metadata" o "questions" (array)' };
        }
        // Check required metadata fields
        const { category, type, subcategory } = data.metadata;
        if (!category || !type || !subcategory) {
            return { valid: false, error: 'Metadata incompleta (category, type, subcategory)' };
        }
        return { valid: true };
    };

    const parseJSFile = (text) => {
        try {
            // Extract the array part: look for [ ... ]
            // This regex looks for the first [ and captures everything up to the last ]
            const match = text.match(/\[([\s\S]*)\]/);
            if (!match) return null;

            const arrayString = match[0];
            // Parse as JSON. Note: This assumes the JS content is valid JSON (quoted keys).
            // If keys are unquoted, we might need a more loose parser, but for now we assume standard JSON-like JS.
            return JSON.parse(arrayString);
        } catch (e) {
            console.error("Error parsing JS file:", e);
            return null;
        }
    };

    const transformLegacyData = (legacyArray) => {
        if (!Array.isArray(legacyArray) || legacyArray.length === 0) return null;

        // A) Extract metadata from the first element
        const firstItem = legacyArray[0];
        const metadata = {
            category: firstItem.categoria || firstItem.category || 'General',
            subcategory: firstItem.subcategoria || firstItem.subcategory || 'General',
            type: firstItem.tipus || firstItem.type || 'Test',
            createdAt: new Date().toISOString(),
            author: currentUser?.email || 'Admin'
        };

        // B) Map questions
        const questions = legacyArray.map(item => {
            // Map fields
            const questionText = item.enunciat || item.pregunta || item.question;
            let options = item.respostes || item.opcions || item.options || [];
            let correctAnswer = item.correcta || item.resposta_correcta || item.correct_answer;
            const image = item.imatge || item.image || null;
            const explanation = item.explicacio || item.explanation || '';

            // Clean options (remove prefixes like "a) ")
            const cleanOptions = options.map(opt => {
                const match = opt.match(/^(\([a-z]\)|[a-z]\))\s+(.*)/);
                return match ? match[2] : opt;
            });

            // Convert correct_answer to index if it's a string
            let correctIndex = -1;
            if (typeof correctAnswer === 'number') {
                correctIndex = correctAnswer;
            } else if (typeof correctAnswer === 'string') {
                // Try to match text
                const correctMatch = correctAnswer.match(/^(\([a-z]\)|[a-z]\))\s+(.*)/);
                const correctTextClean = correctMatch ? correctMatch[2] : correctAnswer;

                correctIndex = cleanOptions.findIndex(opt => opt === correctTextClean);

                // Fallback: try matching the full string if clean match failed
                if (correctIndex === -1) {
                    correctIndex = options.findIndex(opt => opt === correctAnswer);
                }
            }

            return {
                question: questionText,
                options: cleanOptions,
                correct_answer: correctIndex,
                explanation: explanation,
                image: image
            };
        });

        return { metadata, questions };
    };

    const processFiles = async (fileList) => {
        const newFiles = [];

        for (const file of fileList) {
            const isJSON = file.type === 'application/json' || file.name.endsWith('.json');
            const isJS = file.name.endsWith('.js');

            if (!isJSON && !isJS) {
                newFiles.push({ name: file.name, valid: false, error: 'Format no suportat (.json o .js)' });
                continue;
            }

            try {
                const text = await file.text();
                let data;

                if (isJS) {
                    const legacyArray = parseJSFile(text);
                    if (!legacyArray) {
                        newFiles.push({ name: file.name, valid: false, error: 'No s\'ha pogut extreure l\'array del fitxer JS' });
                        continue;
                    }
                    data = transformLegacyData(legacyArray);
                    if (!data) {
                        newFiles.push({ name: file.name, valid: false, error: 'Error transformant dades legacy' });
                        continue;
                    }
                } else {
                    data = JSON.parse(text);
                }

                const validation = validateJSON(data);

                newFiles.push({
                    name: file.name,
                    data: data,
                    valid: validation.valid,
                    error: validation.error
                });
            } catch (e) {
                newFiles.push({ name: file.name, valid: false, error: 'Error de lectura/parseig' });
            }
        }

        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // --- Upload Logic ---

    const uploadQuestions = async (questions, metadata) => {
        const batch = writeBatch(db);
        const collectionRef = collection(db, 'questions');
        const category = metadata.category || import.meta.env.VITE_CATEGORY || 'subalter';
        const subcategory = metadata.subcategory || null;

        questions.forEach((item) => {
            const newDocRef = doc(collectionRef);
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
        return questions.length;
    };

    const handleBulkUpload = async () => {
        const validFiles = files.filter(f => f.valid);
        if (validFiles.length === 0) {
            setStatus('No hi ha fitxers vàlids per pujar.');
            return;
        }

        setStatus('Pujant fitxers...');
        let totalImported = 0;
        let errors = 0;

        for (const file of validFiles) {
            try {
                const count = await uploadQuestions(file.data.questions, file.data.metadata);
                totalImported += count;
            } catch (e) {
                console.error(`Error uploading ${file.name}: `, e);
                errors++;
            }
        }

        setStatus(`Procés finalitzat.Importades ${totalImported} preguntes.Errors: ${errors} `);
        if (errors === 0) {
            setFiles([]); // Clear list on full success
        }
    };

    const handleManualImport = async () => {
        if (!jsonInput.trim()) {
            setStatus('Per favor, enganxa un JSON vàlid.');
            return;
        }

        try {
            setStatus('Processant...');
            const data = JSON.parse(jsonInput);

            let questionsToImport = [];
            let importMetadata = {};

            if (data.questions && Array.isArray(data.questions)) {
                questionsToImport = data.questions;
                importMetadata = data.metadata || {};
            } else if (Array.isArray(data)) {
                questionsToImport = data;
            } else {
                questionsToImport = [data];
            }

            const count = await uploadQuestions(questionsToImport, importMetadata);
            setStatus(`Èxit! S'han importat ${count} preguntes.`);
            setJsonInput('');
        } catch (error) {
            console.error("Error importing data: ", error);
            setStatus(`Error: ${error.message}`);
        }
    };

    if (!currentUser) return <div>Accés denegat</div>;

    return (
        <div className="glass-panel" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
            <h1 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>
                Importar Preguntes
            </h1>

            {/* --- Drag & Drop Zone --- */}
            <div
                className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                style={{
                    border: '2px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragging ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent',
                    marginBottom: '1.5rem',
                    transition: 'all 0.3s ease'
                }}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInput}
                    multiple
                    accept=".json,.js"
                    style={{ display: 'none' }}
                />
                <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    Arrossega fitxers JSON o JS (Legacy) aquí
                </p>
                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                    Format requerit: metadata + questions array
                </p>
            </div>

            {/* --- File List --- */}
            {files.length > 0 && (
                <div className="file-list" style={{ marginBottom: '1.5rem' }}>
                    {files.map((file, index) => (
                        <div key={index} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.8rem',
                            marginBottom: '0.5rem',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: `4px solid ${file.valid ? 'var(--color-success)' : 'var(--color-error)'}`
                        }}>
                            <div>
                                <span style={{ fontWeight: 'bold', marginRight: '1rem' }}>{file.name}</span>
                                {!file.valid && <span style={{ color: 'var(--color-error)', fontSize: '0.9rem' }}>({file.error})</span>}
                                {file.valid && <span style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>({file.data.questions.length} preguntes)</span>}
                            </div>
                            <button
                                onClick={() => removeFile(index)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}

                    <button
                        className="btn btn-primary"
                        onClick={handleBulkUpload}
                        disabled={files.filter(f => f.valid).length === 0}
                        style={{ marginTop: '1rem', width: '100%' }}
                    >
                        Pujar Fitxers Vàlids ({files.filter(f => f.valid).length})
                    </button>
                </div>
            )}

            <div style={{ borderBottom: '1px solid var(--color-border)', margin: '2rem 0' }}></div>

            {/* --- Manual Input --- */}
            <h3 style={{ marginBottom: '1rem' }}>O enganxa JSON manualment</h3>
            <div style={{ marginBottom: '1.5rem' }}>
                <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{"metadata": {...}, "questions": [...]}'
                    style={{
                        width: '100%',
                        height: '150px',
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
                className="btn"
                onClick={handleManualImport}
                style={{ width: '100%' }}
            >
                Pujar Text Manual
            </button>

            {status && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: status.includes('Error') || status.includes('No hi ha') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: status.includes('Error') || status.includes('No hi ha') ? 'var(--color-error)' : 'var(--color-success)',
                    border: '1px solid currentColor'
                }}>
                    {status}
                </div>
            )}
        </div>
    );
}
