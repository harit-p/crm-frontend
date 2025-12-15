import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles = null, requiredPermission = null }) => {
    const { isAuthenticated, loading, user, hasRole, hasPermission } = useAuth();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid rgba(255,255,255,0.3)',
                    borderTop: '4px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check role-based access
    if (allowedRoles && !hasRole(allowedRoles)) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    textAlign: 'center',
                    maxWidth: '500px'
                }}>
                    <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Access Denied</h2>
                    <p style={{ color: '#6b7280' }}>
                        You don't have permission to access this page. Required role: {allowedRoles.join(' or ')}
                    </p>
                </div>
            </div>
        );
    }

    // Check permission-based access
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    textAlign: 'center',
                    maxWidth: '500px'
                }}>
                    <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Access Denied</h2>
                    <p style={{ color: '#6b7280' }}>
                        You don't have the required permission: {requiredPermission}
                    </p>
                </div>
            </div>
        );
    }

    return children;
};

