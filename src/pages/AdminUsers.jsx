import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsersMetadata } from '../services/statsService';

export default function AdminUsers() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            if (currentUser) {
                try {
                    const data = await getAllUsersMetadata();
                    // Sort by last login desc
                    data.sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0));
                    setUsers(data);
                } catch (error) {
                    console.error("Error loading users:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchUsers();
    }, [currentUser]);

    const filteredUsers = users.filter(user => {
        const search = filterText.toLowerCase();
        return (
            (user.email && user.email.toLowerCase().includes(search)) ||
            (user.displayName && user.displayName.toLowerCase().includes(search)) ||
            (user.id && user.id.toLowerCase().includes(search))
        );
    });

    if (!currentUser) return <div className="fade-in" style={{ padding: '2rem' }}>Access Denied</div>;

    return (
        <div className="fade-in" style={{
            maxWidth: '1200px',
            margin: '4rem auto',
            padding: '2rem',
        }}>
            <button
                onClick={() => navigate('/admin')}
                className="btn"
                style={{ background: 'transparent', border: '1px solid var(--color-border)', marginBottom: '2rem' }}
            >
                ← Back to Dashboard
            </button>

            <h1 style={{ color: 'var(--color-primary)', marginBottom: '2rem' }}>Registered Users ({users.length})</h1>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <input
                        type="text"
                        placeholder="Filter by email or name..."
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '300px' }}
                    />
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text)' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-primary)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>User</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Email</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Joined</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Last Login</th>
                                <th style={{ textAlign: 'center', padding: '1rem' }}>UID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt="Avatar" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
                                        ) : (
                                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {user.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
                                            </div>
                                        )}
                                        <span style={{ fontWeight: 'bold' }}>{user.displayName || 'Anonymous'}</span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{user.email || '-'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        {user.createdAt && user.createdAt.getTime() > 0 ? user.createdAt.toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {user.lastLogin ? (
                                            <span style={{ color: (new Date() - user.lastLogin) < 86400000 ? 'var(--color-success)' : 'inherit' }}>
                                                {user.lastLogin.toLocaleDateString()} {user.lastLogin.toLocaleTimeString()}
                                            </span>
                                        ) : 'N/A'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                                        {user.id.substring(0, 8)}...
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
