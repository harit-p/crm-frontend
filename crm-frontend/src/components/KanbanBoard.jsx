import React, { useState, useEffect } from 'react';
import { crmApi } from '../api';
import { DealCard } from './DealCard';
import { StageMoveModal } from './StageMoveModal';
import { Layout, RefreshCw } from 'lucide-react';

const STAGES = [
    "New Lead", "Contact Made", "Discovery Completed", "Qualified Opportunity",
    "Proposal Sent", "Negotiation / Decision", "Verbal Win", "Closed Won", "Closed Lost"
];

export const KanbanBoard = () => {
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
        setSelectedDeal(deal);
        setIsModalOpen(true);
    };

    const handleSaveMove = async (payload) => {
        const result = await crmApi.updateStage(payload.id, payload.stage);
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

    const groupedData = STAGES.reduce((acc, stage) => {
        acc[stage] = opportunities.filter(o => o.stage === stage);
        return acc;
    }, {});

    return (
        <div className="app-container">
            <div className="sidebar">
                <div className="logo">
                    <Layout size={28} />
                    <span>CRM Pro</span>
                </div>
                <nav className="space-y-1">
                    <a href="#" className="active">Pipeline</a>
                    <a href="#">Contacts</a>
                    <a href="#">Tasks</a>
                    <a href="#">Analytics</a>
                </nav>
            </div>

            <main className="main-content">
                <header>
                    <h1>Sales Pipeline</h1>
                    <button onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} style={{ display: 'inline', marginRight: '8px' }} />
                        Refresh
                    </button>
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
                onClose={() => setIsModalOpen(false)}
                deal={selectedDeal}
                onSave={handleSaveMove}
            />
        </div>
    );
};
