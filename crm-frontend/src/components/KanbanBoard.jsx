import React, { useState, useEffect } from 'react';
import { crmApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { DealCard } from './DealCard';
import { StageMoveModal } from './StageMoveModal';
import { DealDetailsModal } from './DealDetailsModal';
import { ExportButton } from './ExportButton';
import { Layout, RefreshCw, LogOut, User } from 'lucide-react';

const STAGES = [
    "New Lead", "Contact Made", "Discovery Completed", "Qualified Opportunity",
    "Proposal Sent", "Negotiation / Decision", "Verbal Win", "Closed Won", "Closed Lost"
];

export const KanbanBoard = () => {
    const { user, logout, hasPermission, canEditDeal } = useAuth();
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const result = await crmApi.getOpportunities();
        if (result.status === 'success') {
            setOpportunities(result.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleMoveClick = (deal) => {
        // Exec is read-only
        if (user?.Role === 'Exec') {
            alert('Exec role is read-only. You cannot move deals.');
            return;
        }
        
        // Check if user can edit this deal
        if (!canEditDeal(deal)) {
            if (user?.Role === 'Sales Rep') {
                alert('You can only move your own deals');
            } else if (user?.Role === 'Data Specialist') {
                alert('Data Specialist cannot move deals past "Contact Made" stage');
            } else {
                alert('You do not have permission to edit this deal');
            }
            return;
        }
        
        setSelectedDeal(deal);
        setIsModalOpen(true);
    };

    const handleDetailsClick = (deal) => {
        setSelectedDeal(deal);
        setIsDetailsModalOpen(true);
    };

    const handleSaveMove = async (payload) => {
        const result = await crmApi.updateStage(payload);
        if (result.status === 'success') {
            await fetchData();
            setIsModalOpen(false);
            setSelectedDeal(null);
        } else {
            alert("Error: " + result.message);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setTimeout(() => setRefreshing(false), 500);
    };

    // Filter opportunities based on user role
    const filterOpportunities = (opps) => {
        if (!user) return [];
        
        // Exec, Ops/Management, Data Specialist can see all (full visibility)
        if (hasPermission('view_all')) {
            return opps;
        }
        
        // Sales Rep can only see their own deals (cannot alter other reps' deals)
        if (user.Role === 'Sales Rep') {
            return opps.filter(o => o.owner === user.Name || !o.owner);
        }
        
        return [];
    };

    const filteredOpportunities = filterOpportunities(opportunities);
    const groupedData = STAGES.reduce((acc, stage) => {
        acc[stage] = filteredOpportunities.filter(o => o.stage === stage);
        return acc;
    }, {});

    return (
        <div className="app-container">
            <div className="sidebar">
                <div className="logo">
                    <Layout size={28} />
                    <span>CRM Pro</span>
                </div>
                
                {/* User Info */}
                <div style={{
                    padding: '16px',
                    margin: '16px 16px 16px 0',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.25)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '16px',
                            border: '2px solid rgba(255, 255, 255, 0.3)'
                        }}>
                            {user?.Name?.charAt(0) || 'U'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'white',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginBottom: '2px'
                            }}>
                                {user?.Name || 'User'}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'rgba(255, 255, 255, 0.9)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {user?.Role || 'No Role'}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                        }}
                    >
                        <LogOut size={14} />
                        Logout
                    </button>
                </div>

                <nav className="space-y-1">
                    <a href="#" className="active">Pipeline</a>
                    {hasPermission('view_analytics') && <a href="#">Analytics</a>}
                    {hasPermission('manage_tasks') && <a href="#">Tasks</a>}
                    {hasPermission('export_data') && <a href="#">Export</a>}
                    <a href="#">Contacts</a>
                    <a href="#">Accounts</a>
                </nav>
            </div>

            <main className="main-content">
                <header>
                    <h1>Sales Pipeline</h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <ExportButton opportunities={opportunities} />
                        <button onClick={handleRefresh} disabled={refreshing}>
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} style={{ display: 'inline', marginRight: '8px' }} />
                            Refresh
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid rgba(255,255,255,0.3)',
                            borderTop: '4px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                    </div>
                ) : (
                    <div className="board">
                        {STAGES.map(stage => (
                            <div key={stage} className="column shrink-0">
                                <div className="column-header">
                                    <span>{stage}</span>
                                    <span className="count-badge">{groupedData[stage]?.length || 0}</span>
                                </div>
                                <div className="column-body">
                                    {groupedData[stage]?.map(deal => (
                                        <DealCard
                                            key={deal.id}
                                            deal={deal}
                                            onMoveClick={handleMoveClick}
                                            onDetailsClick={handleDetailsClick}
                                        />
                                    ))}
                                    {(!groupedData[stage] || groupedData[stage].length === 0) && (
                                        <div style={{
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0.3,
                                            fontSize: '12px',
                                            color: '#94a3b8'
                                        }}>
                                            No deals yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <StageMoveModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedDeal(null);
                }}
                deal={selectedDeal}
                onSave={handleSaveMove}
            />

            <DealDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedDeal(null);
                }}
                deal={selectedDeal}
            />
        </div>
    );
};
