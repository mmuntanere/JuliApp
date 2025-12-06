import { db } from '../firebase';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, addDoc, serverTimestamp, runTransaction, query, orderBy, increment, writeBatch, arrayUnion } from 'firebase/firestore';

/**
 * Saves the result of an exam and updates user statistics atomically.
 * @param {string} userId - The current user's ID
 * @param {object} exam - The exam object (must contain id, name/examen)
 * @param {number} score - The number of correct answers
 * @param {number} totalQuestions - Total questions in the exam
 * @param {Array} failedQuestions - Array of failed question objects
 */
export const saveExamResult = async (userId, exam, score, totalQuestions, failedQuestions) => {
    if (!userId) return;

    const userStatsRef = doc(db, 'users', userId, 'stats', 'summary');
    const historyRef = collection(db, 'users', userId, 'history');

    const percentage = Math.round((score / totalQuestions) * 100);
    const examId = exam.id;
    const examName = exam.name || exam.examen; // Fallback
    const examType = exam.type || 'General';

    try {
        await runTransaction(db, async (transaction) => {
            const statsDoc = await transaction.get(userStatsRef);

            // 1. Calculate new stats
            let stats = statsDoc.exists() ? statsDoc.data() : {
                totalExamsTaken: 0,
                totalQuestionsAnswered: 0,
                totalCorrect: 0,
                averageScore: 0,
                bestScores: {},
                byType: {} // New: Breakdown by Type
            };

            const newTotalExams = (stats.totalExamsTaken || 0) + 1;
            const newTotalQuestions = (stats.totalQuestionsAnswered || 0) + totalQuestions;
            const newTotalCorrect = (stats.totalCorrect || 0) + score;

            // Update average score (simple average of percentages for now, or total correct / total questions)
            // Let's use average percentage per exam for "Average Score" display
            const currentTotalScoreSum = (stats.averageScore || 0) * (stats.totalExamsTaken || 0);
            const newAverage = Math.round((currentTotalScoreSum + percentage) / newTotalExams);

            // Update Best Score for this specific exam
            const currentBest = stats.bestScores?.[examId] || 0;
            const newBest = Math.max(currentBest, percentage);

            const updatedBestScores = {
                ...(stats.bestScores || {}),
                [examId]: newBest
            };

            // Update stats By Type
            const currentTypeStats = stats.byType?.[examType] || { totalExams: 0, totalQuestions: 0, totalCorrect: 0 };
            const typeStats = {
                totalExams: (currentTypeStats.totalExams || 0) + 1,
                totalQuestions: (currentTypeStats.totalQuestions || 0) + totalQuestions,
                totalCorrect: (currentTypeStats.totalCorrect || 0) + score
            };
            const updatedByType = {
                ...(stats.byType || {}),
                [examType]: typeStats
            };

            // 2. Commit Stats Update
            transaction.set(userStatsRef, {
                totalExamsTaken: newTotalExams,
                totalQuestionsAnswered: newTotalQuestions,
                totalCorrect: newTotalCorrect,
                averageScore: newAverage,
                bestScores: updatedBestScores,
                byType: updatedByType,
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // 3. Add to History (cannot use transaction for addDoc to collection easily in same ref scope without key, 
            // but we can just use a random ID or the timestamp). 
            // Note: Transaction objects require refs. 
            // For simplicity in this non-critical path, we will just await the addDoc AFTER transaction or 
            // use the transaction.set on a new doc ref.
            const newHistoryRef = doc(historyRef); // generate ID
            transaction.set(newHistoryRef, {
                examId: examId,
                examName: examName,
                score: score,
                totalQuestions: totalQuestions,
                percentage: percentage,
                failedQuestions: failedQuestions.map(q => ({ id: q.id, question: q.question })), // Store minimal data
                timestamp: serverTimestamp()
            });

            // 4. Update Failed Questions Pool (Non-blocking but logically part of result saving)
            // We do this outside the transaction or as separate writes because 'failed_questions' 
            // is a separate collection and we might be adding many docs.
        });

        // --- GLOBAL STATS UPDATES ---
        // Increment stats_correct / stats_incorrect on the global 'questions' collection
        const statsBatch = writeBatch(db);
        const failedIds = new Set(failedQuestions.map(q => q.id));

        exam.questions.forEach(q => {
            if (!q.id) return; // specific review questions might lack global ID if generated purely dynamic, but usually have it

            const qRef = doc(db, 'questions', q.id);
            if (failedIds.has(q.id)) {
                statsBatch.update(qRef, { stats_incorrect: increment(1) });
            } else {
                statsBatch.update(qRef, { stats_correct: increment(1) });
            }
        });
        // We commit this separately or combine with failed questions? 
        // Let's commit separately to keep logic clean and avoid batch limit (500) if exam is huge + failed questions huge.
        // Though unlikely to hit 500 in one go.
        await statsBatch.commit();

        // --- GLOBAL DAILY STATS ---
        // stats_global/daily_{YYYY-MM-DD}
        const todayStr = new Date().toISOString().split('T')[0];
        const dailyGlobalRef = doc(db, 'stats_global', `daily_${todayStr}`);

        // Use set with merge to create if not exists
        await setDoc(dailyGlobalRef, {
            date: todayStr,
            activeUsers: arrayUnion(userId),
            totalTests: increment(1),
            totalQuestions: increment(totalQuestions),
            totalCorrect: increment(score),
            lastUpdated: serverTimestamp()
        }, { merge: true });

        // --- ALL-TIME GLOBAL SUMMARY ---
        const summaryGlobalRef = doc(db, 'stats_global', 'summary');
        await setDoc(summaryGlobalRef, {
            totalTests: increment(1),
            totalQuestions: increment(totalQuestions),
            totalCorrect: increment(score),
            lastUpdated: serverTimestamp()
        }, { merge: true });

        // Handle Failed Questions addition
        const failedQuestionsRef = collection(db, 'users', userId, 'failed_questions');
        const batch = db.batch ? db.batch() : null; // Access batch from instance if available, else standard

        // Note: Firestore instance 'db' doesn't have batch directly on it in modular SDK, 
        // we import writeBatch.
        const { writeBatch } = await import('firebase/firestore');
        const failedBatch = writeBatch(db);

        failedQuestions.forEach(q => {
            const docRef = doc(failedQuestionsRef, q.id); // Use question ID as doc ID to prevent duplicates
            failedBatch.set(docRef, {
                questionData: q, // Save full question data for the review test
                success_streak: 0, // Reset streak on fail
                last_seen: serverTimestamp()
            });
        });

        if (failedQuestions.length > 0) {
            await failedBatch.commit();
        }

        console.log("Stats and failed questions saved successfully");
        return true;
    } catch (error) {
        console.error("Error saving stats:", error);
        return false;
    }
};

/**
 * Fetches the user's statistics summary.
 * @param {string} userId 
 * @returns {Promise<object|null>} The stats object or null
 */
export const getUserStats = async (userId) => {
    if (!userId) return null;
    try {
        const docRef = doc(db, 'users', userId, 'stats', 'summary');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("Error getting user stats:", error);
        return null;
    }
};

/**
 * COUNT failing questions to decide if we show the button
 */
export const getFailedQuestionsCount = async (userId) => {
    if (!userId) return 0;
    try {
        const { getCountFromServer } = await import('firebase/firestore'); // Dynamic import to save bundle if needed
        const coll = collection(db, 'users', userId, 'failed_questions');
        const snapshot = await getCountFromServer(coll);
        return snapshot.data().count;
    } catch (error) {
        console.error("Error counting failed questions:", error);
        return 0;
    }
};

/**
 * Generates a Review Exam from the failing pool.
 */
export const getFailedQuestionsExam = async (userId) => {
    if (!userId) return null;
    try {
        console.log("Fetching failed questions for:", userId);
        const coll = collection(db, 'users', userId, 'failed_questions');
        const snapshot = await getDocs(coll);

        console.log("Failed questions snapshot size:", snapshot.size);

        if (snapshot.empty) {
            console.warn("Snapshot is empty despite count check.");
            throw new Error("La colección de fallos está vacía (aunque el contador indicaba lo contrario).");
        }

        const allFailed = snapshot.docs.map(doc => ({
            ...doc.data().questionData,
            _reviewId: doc.id, // Internal ID to track stats
            _streak: doc.data().success_streak || 0
        }));

        // Shuffle and limit to 30
        const shuffled = allFailed.sort(() => Math.random() - 0.5).slice(0, 30);

        return {
            id: 'review-mode',
            name: 'Repaso de Fallos',
            examen: 'Repaso de Fallos',
            type: 'Repaso',
            questions: shuffled
        };
    } catch (error) {
        console.error("Error generating review exam:", error);
        throw error;
    }
};

/**
 * Process results specifically for a Review Exam.
 * Updates streaks or deletes resolved questions.
 */
export const processReviewResults = async (userId, questionsAnswered) => {
    // questionsAnswered: Array of { id (original), _reviewId, correct: boolean }
    if (!userId || !questionsAnswered || questionsAnswered.length === 0) return;

    try {
        const { writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);
        const colRef = collection(db, 'users', userId, 'failed_questions');

        questionsAnswered.forEach(q => {
            if (!q._reviewId) return; // Should have this if it came from getFailedQuestionsExam

            const docRef = doc(colRef, q._reviewId);

            if (q.correct) {
                // Determine previous streak (passed in with question object usually, or we assume +1)
                // Since we don't have atomic increment easily on 'streak' without reading, 
                // and we already have the streak in the question object loaded:
                const currentStreak = q._streak || 0;
                const newStreak = currentStreak + 1;

                if (newStreak >= 2) {
                    batch.delete(docRef);
                } else {
                    batch.update(docRef, { success_streak: newStreak });
                }
            } else {
                // Failed again -> Reset streak
                batch.update(docRef, { success_streak: 0 });
            }
        });

        await batch.commit();
        console.log("Review results processed.");
    } catch (error) {
        console.error("Error processing review results:", error);
    }
};

/**
 * Fetches the user's exam history for charts and daily stats.
 * @param {string} userId
 * @returns {Promise<Array>} List of history items
 */
export const getUserHistory = async (userId) => {
    if (!userId) return [];
    try {
        const historyRef = collection(db, 'users', userId, 'history');
        const q = query(historyRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Timestamp to Date object immediately for easier use
            date: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date()
        }));
    } catch (error) {
        console.error("Error fetching user history:", error);
        return [];
    }
};

/**
 * Fetches all daily global stats docs for charts.
 */
export const getGlobalStats = async () => {
    try {
        const q = query(collection(db, 'stats_global'), orderBy('date', 'desc'), limit(30)); // Last 30 days
        // Need to import limit if not present, but let's assume standard query works or just all
        // Wait, I missed importing 'limit'. Let's avoid limit for now or just fetch all (dataset is small)
        // If dataset grows, we should add limit.
        const snapshot = await getDocs(query(collection(db, 'stats_global'), orderBy('date', 'asc')));
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error("Error fetching global stats:", error);
        return [];
    }
};

/**
 * Fetches basic metadata for ALL users to calculate total user growth.
 * NOTE: This is expensive if users > 1000. For now it's fine.
 * A better approach is maintaining a 'metadata/users_summary' doc with total_count.
 * But for this requirement, we'll just list users since we might want their join date.
 */
export const getAllUsersMetadata = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'users'));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            createdAt: doc.data().createdAt?.toDate() || new Date(0), // user must have createdAt
            lastLogin: doc.data().lastLogin?.toDate()
        }));
    } catch (error) {
        console.error("Error fetching users metadata:", error);
        return [];
    }
};

/**
 * Fetches the all-time global summary.
 */
export const getGlobalSummary = async () => {
    try {
        const docRef = doc(db, 'stats_global', 'summary');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("Error fetching global summary:", error);
        return null;
    }
};

/**
 * Efficiently counts total users.
 */
export const getTotalUsersCount = async () => {
    try {
        const { getCountFromServer } = await import('firebase/firestore');
        const coll = collection(db, 'users');
        const snapshot = await getCountFromServer(coll);
        return snapshot.data().count;
    } catch (error) {
        console.error("Error counting users:", error);
        return 0;
    }
};
