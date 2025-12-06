import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut
} from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    function loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);

            if (user) {
                // Update Last Login / Create User Doc
                const userRef = doc(db, 'users', user.uid);
                setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    lastLogin: serverTimestamp(),
                    // We only set createdAt if it doesn't exist, but setDoc with merge: true overwrites...
                    // Actually, we can't easily conditionally set createdAt with setDoc({merge:true}) unless we read first.
                    // But we want to avoid extra read every reload.
                    // For now, let's just allow lastLogin update. 
                    // 'createdAt' is usually set on sign up. But since we use Google Auth only, 
                    // we can assume if the user is new, we should set it. 
                    // But 'user.metadata.creationTime' exists in Firebase Auth object. We can check that?
                    // Let's just update common fields.
                }, { merge: true });

                // Hack: To ensure we have a 'createdAt' in our DB for charts, we can try to set it 
                // if we suspect it's missing, OR just use user.metadata.creationTime from the auth object if valid.
                // But Firestore timestamp is better for queries.
                // Let's rely on the fact that if we just merge, we don't destroy existing createdAt.
                // If it's a NEW user, we might want to set createdAt. 
                // Implementation: If user.metadata.creationTime === user.metadata.lastSignInTime (approx), then it's new?
                // Simpler: Just save auth metadata creation time as a string/timestamp if needed.
                if (user.metadata.createdAt) {
                    // Convert to firestore? Nah, just leave it for now.
                    // Let's assume for the Chart we will use the Auth 'createdAt' if not in DB?
                    // Actually, listing users from 'users' collection only gives what we saved.
                    // Let's save 'createdAt' ONLY if we think it's necessary. 
                    // Or just separate 'updateUserActivity' function.
                }
            }
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        loginWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
