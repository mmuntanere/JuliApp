
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function AdminImport() {
    const navigate = useNavigate();
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
            return { valid: false, error: 'Missing "metadata" or "questions" (array)' };
        }
        // Check required metadata fields
        const { category, type, subcategory } = data.metadata;
        if (!category || !type || !subcategory) {
            return { valid: false, error: 'Incomplete metadata (category, type, subcategory)' };
        }
        return { valid: true };
    };

    const parseJSFile = (text) => {
        try {
            // Strategy 1: Check for exported object "export const X = { ... }"
            // Capture everything inside the first { ... } pair that likely represents the root object
            // This is tricky with regex. Let's try to match the variable assignment format.
            const objectMatch = text.match(/export\s+const\s+\w+\s*=\s*(\{[\s\S]*\});?/);
            if (objectMatch) {
                // We have the object string. However, keys might not be quoted in JS (e.g. metadata: {...}).
                // JSON.parse requires quoted keys.
                // If the user's file is valid JSON content assigned to a variable, this works.
                // But looking at the user's file, it looks like valid JSON structure (keys quoted) assigned to JS var.
                // Let's try parsing it.
                try {
                    // Remove trailing semicolon if captured
                    let jsonString = objectMatch[1];
                    // Clean up trailing ; if needed, though regex group shouldn't catch it if we are careful.

                    // Note: If the file strict JS with unquoted keys, JSON.parse will fail.
                    // We might need a loose parser or more regex hacking.
                    // For now, let's assume it's JSON-compatible object syntax as seen in the user's file.
                    return JSON.parse(jsonString);
                } catch (jsonErr) {
                    console.warn("Found object structure but failed to JSON parse it. It might use unquoted keys.", jsonErr);
                    // Fallthrough to array strategy or handle unquoted keys?
                    // Let's try a naive "key quoter" if it's simple
                }
            }

            // Strategy 2: Legacy Array [ ... ]
            // Extract the array part: look for [ ... ]
            const match = text.match(/\[([\s\S]*)\]/);
            if (match) {
                const arrayString = match[0];
                return JSON.parse(arrayString);
            }

            return null;
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
            author: currentUser?.email || 'Admin',
            name: '' // Will be populated from filename if empty
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
                newFiles.push({ name: file.name, valid: false, error: 'Unsupported format (.json or .js)' });
                continue;
            }

            try {
                const text = await file.text();
                let data;

                if (isJS) {
                    const parsedData = parseJSFile(text);
                    if (!parsedData) {
                        newFiles.push({ name: file.name, valid: false, error: 'Could not parse JS file' });
                        continue;
                    }

                    // Check if it's the Full Object (Metadata + Questions) or just Array (Legacy)
                    if (Array.isArray(parsedData)) {
                        // It's just the array -> Transform
                        data = transformLegacyData(parsedData);
                        if (!data) {
                            newFiles.push({ name: file.name, valid: false, error: 'Error transforming legacy data' });
                            continue;
                        }
                    } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
                        // It's the Full Object -> Use as is
                        data = parsedData;
                    } else {
                        newFiles.push({ name: file.name, valid: false, error: 'Unknown JS structure' });
                        continue;
                    }
                } else {
                    data = JSON.parse(text);
                }

                const validation = validateJSON(data);

                // Auto-populate name from filename if missing
                if (validation.valid && !data.metadata.name) {
                    data.metadata.name = file.name.replace(/\.(json|js)$/i, '');
                }

                newFiles.push({
                    name: file.name,
                    data: data,
                    valid: validation.valid,
                    error: validation.error
                });
            } catch (e) {
                newFiles.push({ name: file.name, valid: false, error: 'Read/Parse error' });
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
        const type = metadata.type || 'Test';
        const name = metadata.name || '';

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
                type: type, // Fix: Include type
                name: name, // Save exam name
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
            setStatus('No valid files to upload.');
            return;
        }
        setStatus('Uploading files...');
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
        setStatus(`Process finished. Imported ${totalImported} questions. Errors: ${errors} `);
        if (errors === 0) {
            setFiles([]); // Clear list on full success
        }
    };

    const handleManualImport = async () => {
        if (!jsonInput.trim()) {
            setStatus('Please paste a valid JSON.');
            return;
        }

        try {
            setStatus('Processing...');
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
            setStatus(`Success! Imported ${count} questions.`);
            setJsonInput('');
        } catch (error) {
            console.error("Error importing data: ", error);
            setStatus(`Error: ${error.message}`);
        }
    };

    if (!currentUser) return <div>Access Denied</div>;

    return (
        <div className="glass-panel" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
            <button
                onClick={() => navigate('/admin')}
                className="btn"
                style={{ background: 'transparent', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}
            >
                ← Back to Dashboard
            </button>
            <h1 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>
                Import Questions
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
                    Drag JSON or JS (Legacy) files here
                </p>
                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                    Required format: metadata + questions array
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
                                {file.valid && <span style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>({file.data.questions.length} questions)</span>}
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
                        Upload Valid Files ({files.filter(f => f.valid).length})
                    </button>
                </div>
            )}

            <div style={{ borderBottom: '1px solid var(--color-border)', margin: '2rem 0' }}></div>

            {/* --- Manual Input --- */}
            <h3 style={{ marginBottom: '1rem' }}>Or paste JSON manually</h3>
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
                Upload Manual Text
            </button>

            {status && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: status.includes('Error') || status.includes('No valid') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: status.includes('Error') || status.includes('No valid') ? 'var(--color-error)' : 'var(--color-success)',
                    border: '1px solid currentColor'
                }}>
                    {status}
                </div>
            )}
        </div>
    );
}
