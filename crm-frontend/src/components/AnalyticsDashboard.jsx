import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { crmApi } from '../api';
import { Layout, LogOut, RefreshCw, TrendingUp, DollarSign, Target, Calendar, Users, BarChart3, Package, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

export const AnalyticsDashboard = () => {
    const { user, logout, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reports, setReports] = useState({
        pipelineSummary: {},
        revenueForecast: {},
        topOpportunities: [],
        tasksDueTodayOverdue: { dueToday: [], overdue: [] },
        leadSourceEffectiveness: {},
        repPerformance: {},
        productCategoryDemand: {}
    });

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const result = await crmApi.getAllReports();
            if (result.status === 'success' && result.data) {
                setReports(result.data);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchReports();
        setTimeout(() => setRefreshing(false), 500);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatPercent = (value) => {
        return (value || 0).toFixed(1) + '%';
    };

    // Pipeline Summary Card
    const PipelineSummaryCard = () => {
        const { byStage = {}, totalActive = 0, totalClosed = 0, total = 0 } = reports.pipelineSummary;
        const stages = ['New Lead', 'Contact Made', 'Discovery Completed', 'Qualified Opportunity', 
                       'Proposal Sent', 'Negotiation / Decision', 'Verbal Win'];

        return (
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <BarChart3 size={24} color="#667eea" />
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Pipeline Summary</h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ textAlign: 'center', padding: '16px', background: '#f1f5f9', borderRadius: '8px' }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#667eea' }}>{totalActive}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Active Deals</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px', background: '#f1f5f9', borderRadius: '8px' }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>{totalClosed}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Closed Deals</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px', background: '#f1f5f9', borderRadius: '8px' }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#8b5cf6' }}>{total}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Total Deals</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {stages.map(stage => (
                        <div key={stage} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{stage}</div>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>{byStage[stage] || 0}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Revenue Forecast Card
    const RevenueForecastCard = () => {
        const { totalForecast = 0, byStage = {} } = reports.revenueForecast;
        const stages = Object.keys(byStage).filter(s => byStage[s].weightedForecast > 0);

        return (
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <DollarSign size={24} color="#10b981" />
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Revenue Forecast</h2>
                </div>
                
                <div style={{ textAlign: 'center', padding: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '12px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>Total Weighted Forecast</div>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: 'white' }}>{formatCurrency(totalForecast)}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {stages.slice(0, 6).map(stage => {
                        const stageData = byStage[stage];
                        return (
                            <div key={stage} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{stage}</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                                    {formatCurrency(stageData.weightedForecast)}
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                    {stageData.count} deals
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Top Opportunities Card
    const TopOpportunitiesCard = () => {
        const topOpps = reports.topOpportunities || [];

        return (
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <Target size={24} color="#f59e0b" />
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Top Opportunities</h2>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {topOpps.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No opportunities found</div>
                    ) : (
                        topOpps.map((opp, index) => (
                            <div key={index} style={{
                                padding: '16px',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                                        {opp.opportunityName || opp.opportunityId}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        {opp.stage} • {opp.owner}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>
                                        {formatCurrency(opp.weightedValue)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                        {formatPercent(opp.probability * 100)} prob
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    // Tasks Due Today / Overdue Card
    const TasksCard = () => {
        const { dueToday = [], overdue = [] } = reports.tasksDueTodayOverdue;

        return (
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <Calendar size={24} color="#ef4444" />
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Tasks Due Today / Overdue</h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '12px' }}>
                            Due Today ({dueToday.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                            {dueToday.length === 0 ? (
                                <div style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>No tasks due today</div>
                            ) : (
                                dueToday.map((task, index) => (
                                    <div key={index} style={{
                                        padding: '12px',
                                        background: '#fef3c7',
                                        borderRadius: '6px',
                                        fontSize: '12px'
                                    }}>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{task.subject}</div>
                                        <div style={{ color: '#64748b' }}>{task.owner}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '12px' }}>
                            Overdue ({overdue.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                            {overdue.length === 0 ? (
                                <div style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>No overdue tasks</div>
                            ) : (
                                overdue.map((task, index) => (
                                    <div key={index} style={{
                                        padding: '12px',
                                        background: '#fee2e2',
                                        borderRadius: '6px',
                                        fontSize: '12px'
                                    }}>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{task.subject}</div>
                                        <div style={{ color: '#64748b' }}>
                                            {task.owner} • {task.daysOverdue} days overdue
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Lead Source Effectiveness Card
    const LeadSourceCard = () => {
        const sources = Object.keys(reports.leadSourceEffectiveness || {});

        return (
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <TrendingUp size={24} color="#8b5cf6" />
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Lead Source Effectiveness</h2>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Source</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Total</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Won</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Lost</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Win Rate</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sources.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No data available</td>
                                </tr>
                            ) : (
                                sources.map(source => {
                                    const stats = reports.leadSourceEffectiveness[source];
                                    return (
                                        <tr key={source} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontWeight: '600' }}>{source}</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>{stats.total}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#10b981' }}>{stats.closedWon}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#ef4444' }}>{stats.closedLost}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>{formatPercent(stats.winRate)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(stats.wonRevenue)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Rep Performance Card
    const RepPerformanceCard = () => {
        const reps = Object.keys(reports.repPerformance || {}).filter(r => r !== 'Unassigned');

        return (
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <Users size={24} color="#3b82f6" />
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Rep Performance Scorecard</h2>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Rep</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Total</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Active</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Won</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Lost</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Win Rate</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Revenue</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Forecast</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reps.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No data available</td>
                                </tr>
                            ) : (
                                reps.map(rep => {
                                    const stats = reports.repPerformance[rep];
                                    return (
                                        <tr key={rep} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontWeight: '600' }}>{rep}</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>{stats.totalOpportunities}</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>{stats.activeOpportunities}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#10b981' }}>{stats.closedWon}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#ef4444' }}>{stats.closedLost}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>{formatPercent(stats.winRate)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(stats.totalRevenue)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>{formatCurrency(stats.weightedForecast)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Product Category Demand Card
    const ProductCategoryCard = () => {
        const categories = Object.keys(reports.productCategoryDemand || {}).sort((a, b) => {
            return (reports.productCategoryDemand[b].totalRevenue || 0) - (reports.productCategoryDemand[a].totalRevenue || 0);
        });

        return (
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <Package size={24} color="#ec4899" />
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Product Category Demand Breakdown</h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    {categories.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No data available</div>
                    ) : (
                        categories.map(category => {
                            const stats = reports.productCategoryDemand[category];
                            return (
                                <div key={category} style={{
                                    padding: '16px',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>{category}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>Total Opportunities:</span>
                                            <span style={{ fontWeight: '600' }}>{stats.count}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>Active:</span>
                                            <span>{stats.activeCount}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>Closed Won:</span>
                                            <span style={{ color: '#10b981', fontWeight: '600' }}>{stats.closedWonCount}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>Total Revenue:</span>
                                            <span style={{ fontWeight: '600' }}>{formatCurrency(stats.totalRevenue)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>Won Revenue:</span>
                                            <span style={{ color: '#10b981', fontWeight: '600' }}>{formatCurrency(stats.closedWonRevenue)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="app-container">
            <div className="sidebar">
                <div className="logo">
                    <Layout size={28} />
                    <span>CRM Pro</span>
                </div>
                
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
                            transition: 'all 0.2s'
                        }}
                    >
                        <LogOut size={14} />
                        Logout
                    </button>
                </div>

                <nav className="space-y-1">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Pipeline</a>
                    {hasPermission('view_analytics') && <a href="#" className="active">Analytics</a>}
                    {user?.Role !== 'Exec' && <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tasks'); }}>Tasks</a>}
                    {hasPermission('export_data') && <a href="#">Export</a>}
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/contacts'); }}>Contacts</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/accounts'); }}>Accounts</a>
                </nav>
            </div>

            <main className="main-content">
                <header>
                    <h1>Analytics Dashboard</h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <NotificationBell />
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
                    <div>
                        <PipelineSummaryCard />
                        <RevenueForecastCard />
                        <TopOpportunitiesCard />
                        <TasksCard />
                        <LeadSourceCard />
                        <RepPerformanceCard />
                        <ProductCategoryCard />
                    </div>
                )}
            </main>
        </div>
    );
};

