import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, AlertCircle, X } from 'lucide-react';
import { crmApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

export const NotificationBell = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [alerts, setAlerts] = useState({
        overdueTasks: [],
        ongoingIssues: [],
        stagnationAlerts: []
    });
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchAlerts();
        // Refresh alerts every 30 seconds
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const fetchAlerts = async () => {
        try {
            const result = await crmApi.getAlerts();
            if (result.status === 'success' && result.data) {
                setAlerts({
                    overdueTasks: result.data.overdueTasks || [],
                    ongoingIssues: result.data.ongoingIssues || [],
                    stagnationAlerts: result.data.stagnationAlerts || []
                });
            }
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalAlerts = alerts.overdueTasks.length + alerts.ongoingIssues.length + alerts.stagnationAlerts.length;
    const hasAlerts = totalAlerts > 0;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                        fetchAlerts(); // Refresh when opening
                    }
                }}
                style={{
                    position: 'relative',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#1e293b';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
            >
                <Bell size={20} strokeWidth={2.5} />
                {hasAlerts && (
                    <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '8px',
                        height: '8px',
                        background: '#ef4444',
                        borderRadius: '50%',
                        border: '2px solid white',
                        animation: hasAlerts ? 'pulse 2s infinite' : 'none'
                    }}></span>
                )}
                {hasAlerts && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                        border: '2px solid white'
                    }}>
                        {totalAlerts > 99 ? '99+' : totalAlerts}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '400px',
                    maxWidth: '90vw',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0',
                    zIndex: 1000,
                    maxHeight: '600px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={18} />
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                                Alerts ({totalAlerts})
                            </h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{
                        overflowY: 'auto',
                        flex: 1
                    }}>
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                Loading alerts...
                            </div>
                        ) : totalAlerts === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                <Bell size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                <p style={{ margin: 0 }}>No alerts</p>
                            </div>
                        ) : (
                            <div style={{ padding: '8px' }}>
                                {/* Overdue Tasks */}
                                {alerts.overdueTasks.length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{
                                            padding: '8px 12px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            Overdue Tasks ({alerts.overdueTasks.length})
                                        </div>
                                        {alerts.overdueTasks.map((task, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    padding: '12px',
                                                    margin: '4px 0',
                                                    background: '#fee2e2',
                                                    borderRadius: '8px',
                                                    border: '1px solid #fecaca',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#fecaca';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#fee2e2';
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                    <Clock size={16} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            color: '#991b1b',
                                                            marginBottom: '4px',
                                                            wordBreak: 'break-word'
                                                        }}>
                                                            {task.subject}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#7f1d1d' }}>
                                                            {task.owner} • {task.daysOverdue} days overdue
                                                        </div>
                                                        {task.opportunityId && (
                                                            <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '2px' }}>
                                                                Opportunity: {task.opportunityId}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Ongoing Issues */}
                                {alerts.ongoingIssues.length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{
                                            padding: '8px 12px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            Ongoing Issues ({alerts.ongoingIssues.length})
                                        </div>
                                        {alerts.ongoingIssues.map((task, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    padding: '12px',
                                                    margin: '4px 0',
                                                    background: '#fef2f2',
                                                    borderRadius: '8px',
                                                    border: '1px solid #fecaca',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#fee2e2';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#fef2f2';
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                    <AlertCircle size={16} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            color: '#991b1b',
                                                            marginBottom: '4px',
                                                            wordBreak: 'break-word'
                                                        }}>
                                                            {task.subject}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#7f1d1d' }}>
                                                            {task.owner} • {task.daysOverdue} days overdue (Notified AJ)
                                                        </div>
                                                        {task.opportunityId && (
                                                            <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '2px' }}>
                                                                Opportunity: {task.opportunityId}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Status Stagnation Alerts */}
                                {alerts.stagnationAlerts.length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{
                                            padding: '8px 12px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            Status Stagnation ({alerts.stagnationAlerts.length})
                                        </div>
                                        {alerts.stagnationAlerts.map((alert, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    padding: '12px',
                                                    margin: '4px 0',
                                                    background: '#fef3c7',
                                                    borderRadius: '8px',
                                                    border: '1px solid #fde68a',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#fde68a';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#fef3c7';
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                    <AlertTriangle size={16} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            color: '#92400e',
                                                            marginBottom: '4px',
                                                            wordBreak: 'break-word'
                                                        }}>
                                                            {alert.opportunityName || alert.opportunityId}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#78350f' }}>
                                                            {alert.stage} • {alert.daysSinceUpdate} days without update
                                                        </div>
                                                        {alert.owner && (
                                                            <div style={{ fontSize: '11px', color: '#78350f', marginTop: '2px' }}>
                                                                Owner: {alert.owner}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {totalAlerts > 0 && (
                        <div style={{
                            padding: '12px',
                            borderTop: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            textAlign: 'center'
                        }}>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/tasks');
                                }}
                                style={{
                                    padding: '8px 16px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                View All Tasks
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* CSS Animation for blinking */}
            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.5;
                        transform: scale(1.2);
                    }
                }
            `}</style>
        </div>
    );
};

