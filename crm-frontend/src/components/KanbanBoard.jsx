import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { DealCard } from './DealCard';
import { StageMoveModal } from './StageMoveModal';
import { DealDetailsModal } from './DealDetailsModal';
import { ExportButton } from './ExportButton';
import { Layout, RefreshCw, LogOut, User, Plus } from 'lucide-react';

const STAGES = [
    "New Lead", "Contact Made", "Discovery Completed", "Qualified Opportunity",
    "Proposal Sent", "Negotiation / Decision", "Verbal Win", "Closed Won", "Closed Lost"
];

export const KanbanBoard = () => {
    const navigate = useNavigate();
    const { user, logout, hasPermission, canEditDeal } = useAuth();
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [movingStage, setMovingStage] = useState(false);
    const [savingNewLead, setSavingNewLead] = useState(false);
    const [newLeadData, setNewLeadData] = useState({
        'Opportunity Name': '',
        'Company Name': '',
        'Contact Name': '',
        'Email or Phone': '',
        'Territory': '',
        'Lead Source': ''
    });

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
        if (movingStage) return; // Prevent double-click
        setMovingStage(true);
        try {
            const result = await crmApi.updateStage(payload);
            if (result.status === 'success') {
                await fetchData();
                setIsModalOpen(false);
                setSelectedDeal(null);
            } else {
                alert("Error: " + result.message);
            }
        } finally {
            setMovingStage(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setTimeout(() => setRefreshing(false), 500);
    };

    const handleCreateNewLead = () => {
        if (user?.Role === 'Exec') {
            alert('Exec role is read-only. You cannot create new leads.');
            return;
        }
        setNewLeadData({
            'Opportunity Name': '',
            'Company Name': '',
            'Contact Name': '',
            'Email or Phone': '',
            'Territory': '',
            'Lead Source': '',
            'Assigned Rep': user?.Name || ''
        });
        setIsNewLeadModalOpen(true);
    };

    const handleSaveNewLead = async () => {
        if (savingNewLead) return; // Prevent double-click
        
        // Validate required fields
        if (!newLeadData['Company Name']?.trim()) {
            alert('Company Name is required');
            return;
        }
        if (!newLeadData['Contact Name']?.trim()) {
            alert('Contact Name is required');
            return;
        }
        if (!newLeadData['Email or Phone']?.trim()) {
            alert('Email or Phone is required');
            return;
        }
        if (!newLeadData['Territory']?.trim()) {
            alert('Territory is required');
            return;
        }
        if (!newLeadData['Lead Source']?.trim()) {
            alert('Lead Source is required');
            return;
        }

        setSavingNewLead(true);
        try {
            // Create opportunity with New Lead stage
            const payload = {
                stage: 'New Lead',
                'Opportunity Name': newLeadData['Opportunity Name'] || `${newLeadData['Company Name']} - ${newLeadData['Contact Name']}`,
                'Company Name': newLeadData['Company Name'],
                'Contact Name': newLeadData['Contact Name'],
                'Email or Phone': newLeadData['Email or Phone'],
                'Territory': newLeadData['Territory'],
                'Lead Source': newLeadData['Lead Source'],
                'Assigned Rep': newLeadData['Assigned Rep'] || user?.Name || ''
            };

            const result = await crmApi.createOpportunity(payload);
            if (result.status === 'success') {
                await fetchData();
                setIsNewLeadModalOpen(false);
                setNewLeadData({
                    'Opportunity Name': '',
                    'Company Name': '',
                    'Contact Name': '',
                    'Email or Phone': '',
                    'Territory': '',
                    'Lead Source': ''
                });
            } else {
                alert('Error: ' + result.message);
            }
        } finally {
            setSavingNewLead(false);
        }
    };

    const canCreateLead = () => {
        if (!user) return false;
        if (user.Role === 'Exec') return false;
        return hasPermission('create_opportunities') || hasPermission('edit_all') || user.Role === 'Data Specialist' || user.Role === 'Ops/Management';
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
                    {user?.Role !== 'Exec' && <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tasks'); }}>Tasks</a>}
                    {hasPermission('export_data') && <a href="#">Export</a>}
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/contacts'); }}>Contacts</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/accounts'); }}>Accounts</a>
                </nav>
            </div>

            <main className="main-content">
                <header>
                    <h1>Sales Pipeline</h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button 
                            onClick={handleCreateNewLead} 
                            disabled={!canCreateLead()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                background: canCreateLead() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#94a3b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: canCreateLead() ? 'pointer' : 'not-allowed',
                                fontWeight: '600',
                                fontSize: '14px',
                                opacity: canCreateLead() ? 1 : 0.6,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (canCreateLead()) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (canCreateLead()) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }
                            }}
                        >
                            <Plus size={16} />
                            New Lead
                        </button>
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

            {/* New Lead Modal */}
            {isNewLeadModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setIsNewLeadModalOpen(false)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '700' }}>
                            Create New Lead
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Opportunity Name</label>
                                <input
                                    type="text"
                                    value={newLeadData['Opportunity Name']}
                                    onChange={(e) => setNewLeadData({ ...newLeadData, 'Opportunity Name': e.target.value })}
                                    placeholder="Auto-generated if left empty"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Company Name *</label>
                                <input
                                    type="text"
                                    value={newLeadData['Company Name']}
                                    onChange={(e) => setNewLeadData({ ...newLeadData, 'Company Name': e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Contact Name *</label>
                                <input
                                    type="text"
                                    value={newLeadData['Contact Name']}
                                    onChange={(e) => setNewLeadData({ ...newLeadData, 'Contact Name': e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Email or Phone *</label>
                                <input
                                    type="text"
                                    value={newLeadData['Email or Phone']}
                                    onChange={(e) => setNewLeadData({ ...newLeadData, 'Email or Phone': e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Territory *</label>
                                <select
                                    value={newLeadData['Territory']}
                                    onChange={(e) => setNewLeadData({ ...newLeadData, 'Territory': e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select Territory</option>
                                    <option value="North">North</option>
                                    <option value="South">South</option>
                                    <option value="East">East</option>
                                    <option value="West">West</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Lead Source *</label>
                                <select
                                    value={newLeadData['Lead Source']}
                                    onChange={(e) => setNewLeadData({ ...newLeadData, 'Lead Source': e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select Lead Source</option>
                                    <option value="Website">Website</option>
                                    <option value="Referral">Referral</option>
                                    <option value="Trade Show">Trade Show</option>
                                    <option value="Cold Call">Cold Call</option>
                                    <option value="Partner">Partner</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    if (savingNewLead) return;
                                    setIsNewLeadModalOpen(false);
                                    setNewLeadData({
                                        'Opportunity Name': '',
                                        'Company Name': '',
                                        'Contact Name': '',
                                        'Email or Phone': '',
                                        'Territory': '',
                                        'Lead Source': ''
                                    });
                                }}
                                disabled={savingNewLead}
                                style={{
                                    padding: '10px 20px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: savingNewLead ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: savingNewLead ? 0.6 : 1
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNewLead}
                                disabled={savingNewLead}
                                style={{
                                    padding: '10px 20px',
                                    background: savingNewLead ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: savingNewLead ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: savingNewLead ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    justifyContent: 'center',
                                    minWidth: '120px'
                                }}
                            >
                                {savingNewLead && <RefreshCw size={14} className="animate-spin" />}
                                {savingNewLead ? 'Creating...' : 'Create Lead'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
