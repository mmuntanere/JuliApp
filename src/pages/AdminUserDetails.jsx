import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Statistics from '../components/Statistics';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminUserDetails() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (currentUser && userId) {
                try {
                    const docRef = doc(db, 'users', userId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserProfile(docSnap.data());
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchUserProfile();
    }, [currentUser, userId]);

    if (!currentUser) return <div className="fade-in" style={{ padding: '2rem' }}>Access Denied</div>;

    return (
        <div className="fade-in" style={{ paddingBottom: '4rem' }}>
            <div style={{ maxWidth: '900px', margin: '2rem auto 0', padding: '0 2rem' }}>
                <button
                    onClick={() => navigate('/admin/users')}
                    className="btn"
                    style={{ background: 'transparent', border: '1px solid var(--color-border)', marginBottom: '1rem' }}
                >
                    ← Back to Users
                </button>

                {loading ? (
                    <div>Loading profile...</div>
                ) : (
                    <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        {userProfile?.photoURL ? (
                            <img src={userProfile.photoURL} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
                        ) : (
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : '?'}
                            </div>
                        )}
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--color-primary)' }}>
                                {userProfile?.displayName || 'Anonymous User'}
                            </h1>
                            <p style={{ margin: '0.5rem 0', opacity: 0.7 }}>{userProfile?.email || 'No Email'}</p>
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.5 }}>UID: {userId}</p>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                                Last Login: {userProfile?.lastLogin?.toDate().toLocaleString()}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Reusing the Statistics Component */}
            <Statistics userId={userId} onBack={() => navigate('/admin/users')} />
        </div>
    );
}
