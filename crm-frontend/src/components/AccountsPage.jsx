import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { crmApi } from '../api';
import { Layout, LogOut, Plus, Edit, Trash2, RefreshCw, Building2, MapPin, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccountsPage = () => {
    const { user, logout, canEditAccount, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [users, setUsers] = useState([]);
    const [savingAccount, setSavingAccount] = useState(false);
    const [deletingAccountId, setDeletingAccountId] = useState(null);
    const [formData, setFormData] = useState({
        'Company Name': '',
        Territory: '',
        'Product Interest': '',
        'Lead Source': '',
        Notes: '',
        'Lifecycle Status': 'Prospect',
        Owner: user?.Name || ''
    });

    useEffect(() => {
        fetchData();
        fetchUsers();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const result = await crmApi.getAccounts();
        if (result.status === 'success') {
            let accountsData = result.data || [];
            
            // Sales Rep can only see accounts they own
            if (user?.Role === 'Sales Rep') {
                accountsData = accountsData.filter(acc => 
                    (acc.Owner || acc.owner) === user.Name || !acc.Owner
                );
            }
            
            setAccounts(accountsData);
        }
        setLoading(false);
    };

    const fetchUsers = async () => {
        const result = await crmApi.getUsers();
        if (result.status === 'success') {
            setUsers(result.data || []);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setTimeout(() => setRefreshing(false), 500);
    };

    const handleCreate = () => {
        setSelectedAccount(null);
        setFormData({
            'Company Name': '',
            Territory: '',
            'Product Interest': '',
            'Lead Source': '',
            Notes: '',
            'Lifecycle Status': 'Prospect',
            Owner: user?.Name || ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (account) => {
        if (!canEditAccount(account)) {
            alert('You do not have permission to edit this account');
            return;
        }
        setSelectedAccount(account);
        setFormData({
            'Company Name': account['Company Name'] || account.CompanyName || '',
            Territory: account.Territory || '',
            'Product Interest': account['Product Interest'] || account.ProductInterest || '',
            'Lead Source': account['Lead Source'] || account.LeadSource || '',
            Notes: account.Notes || '',
            'Lifecycle Status': account['Lifecycle Status'] || account.LifecycleStatus || 'Prospect',
            Owner: account.Owner || account.owner || user?.Name || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (account) => {
        if (!canEditAccount(account)) {
            alert('You do not have permission to delete this account');
            return;
        }
        
        if (!window.confirm('Are you sure you want to delete this account? This will also delete associated contacts.')) {
            return;
        }

        const accountId = account['Account ID'] || account.id;
        if (deletingAccountId === accountId) return; // Prevent double-click
        
        setDeletingAccountId(accountId);
        try {
            const result = await crmApi.deleteAccount(accountId);
            if (result.status === 'success') {
                await fetchData();
            } else {
                alert('Error: ' + result.message);
            }
        } finally {
            setDeletingAccountId(null);
        }
    };

    const handleSave = async () => {
        if (savingAccount) return; // Prevent double-click
        
        if (!formData['Company Name'].trim()) {
            alert('Company Name is required');
            return;
        }

        setSavingAccount(true);
        try {
            const payload = {
                'Company Name': formData['Company Name'],
                Territory: formData.Territory,
                'Product Interest': formData['Product Interest'],
                'Lead Source': formData['Lead Source'],
                Notes: formData.Notes,
                'Lifecycle Status': formData['Lifecycle Status'],
                Owner: formData.Owner
            };

            let result;
            if (selectedAccount) {
                result = await crmApi.updateAccount(selectedAccount['Account ID'] || selectedAccount.id, payload);
            } else {
                result = await crmApi.createAccount(payload);
            }

            if (result.status === 'success') {
                await fetchData();
                setIsModalOpen(false);
                setSelectedAccount(null);
            } else {
                alert('Error: ' + result.message);
            }
        } finally {
            setSavingAccount(false);
        }
    };

    const canCreate = () => {
        if (!user) return false;
        if (user.Role === 'Exec') return false;
        // Ops/Management has edit_all, Sales Rep and Data Specialist have edit_accounts
        return hasPermission('edit_accounts') || hasPermission('edit_all') || user.Role === 'Ops/Management';
    };

    const territories = ['North', 'South', 'East', 'West'];
    const leadSources = ['Website', 'Referral', 'Trade Show', 'Cold Call', 'Partner'];
    const lifecycleStatuses = ['Prospect', 'Customer', 'Partner', 'Competitor', 'Inactive'];

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
                    {hasPermission('view_analytics') && <a href="#">Analytics</a>}
                    {user?.Role !== 'Exec' && <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tasks'); }}>Tasks</a>}
                    {hasPermission('export_data') && <a href="#">Export</a>}
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/contacts'); }}>Contacts</a>
                    <a href="#" className="active">Accounts</a>
                </nav>
            </div>

            <main className="main-content">
                <header>
                    <h1>Accounts</h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {canCreate() && (
                            <button onClick={handleCreate} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}>
                                <Plus size={16} />
                                New Account
                            </button>
                        )}
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
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '20px',
                        paddingBottom: '20px'
                    }}>
                        {accounts.length === 0 ? (
                            <div style={{ 
                                gridColumn: '1 / -1',
                                textAlign: 'center', 
                                padding: '60px 20px', 
                                color: '#64748b',
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                <p>No accounts found</p>
                            </div>
                        ) : (
                            accounts.map((account) => {
                                const canEdit = canEditAccount(account);
                                
                                return (
                                    <div
                                        key={account['Account ID'] || account.id}
                                        style={{
                                            background: 'white',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            transition: 'all 0.2s',
                                            border: '1px solid #f1f5f9'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ 
                                                    fontSize: '18px', 
                                                    fontWeight: '700', 
                                                    margin: '0 0 8px 0',
                                                    color: '#0f172a'
                                                }}>
                                                    {account['Company Name'] || account.CompanyName}
                                                </h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <MapPin size={14} style={{ color: '#64748b' }} />
                                                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                                                        {account.Territory || 'No Territory'}
                                                    </span>
                                                </div>
                                                {account.Owner && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <User size={14} style={{ color: '#64748b' }} />
                                                        <span style={{ fontSize: '14px', color: '#64748b' }}>
                                                            {account.Owner}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: account['Lifecycle Status'] === 'Customer' ? '#d1fae5' : 
                                                           account['Lifecycle Status'] === 'Prospect' ? '#dbeafe' : '#f3f4f6',
                                                color: account['Lifecycle Status'] === 'Customer' ? '#065f46' : 
                                                       account['Lifecycle Status'] === 'Prospect' ? '#1e40af' : '#374151'
                                            }}>
                                                {account['Lifecycle Status'] || account.LifecycleStatus || 'Prospect'}
                                            </span>
                                        </div>

                                        <div style={{ marginBottom: '16px' }}>
                                            {account['Product Interest'] && (
                                                <div style={{ marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Product Interest:</span>
                                                    <span style={{ fontSize: '14px', color: '#0f172a', marginLeft: '8px' }}>
                                                        {account['Product Interest']}
                                                    </span>
                                                </div>
                                            )}
                                            {account['Lead Source'] && (
                                                <div style={{ marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Lead Source:</span>
                                                    <span style={{ fontSize: '14px', color: '#0f172a', marginLeft: '8px' }}>
                                                        {account['Lead Source']}
                                                    </span>
                                                </div>
                                            )}
                                            {account.Notes && (
                                                <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                                        {account.Notes.length > 100 ? account.Notes.substring(0, 100) + '...' : account.Notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                            {canEdit && (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(account)}
                                                        disabled={savingAccount || deletingAccountId}
                                                        style={{
                                                            padding: '8px 16px',
                                                            background: '#f1f5f9',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: (savingAccount || deletingAccountId) ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            opacity: (savingAccount || deletingAccountId) ? 0.6 : 1
                                                        }}
                                                    >
                                                        <Edit size={14} />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(account)}
                                                        disabled={deletingAccountId === (account['Account ID'] || account.id) || savingAccount}
                                                        style={{
                                                            padding: '8px 16px',
                                                            background: deletingAccountId === (account['Account ID'] || account.id) ? '#94a3b8' : '#fee2e2',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: (deletingAccountId === (account['Account ID'] || account.id) || savingAccount) ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            color: '#991b1b',
                                                            opacity: (deletingAccountId === (account['Account ID'] || account.id) || savingAccount) ? 0.6 : 1
                                                        }}
                                                    >
                                                        {deletingAccountId === (account['Account ID'] || account.id) ? (
                                                            <>
                                                                <RefreshCw size={14} className="animate-spin" />
                                                                Deleting...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Trash2 size={14} />
                                                                Delete
                                                            </>
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                            {!canEdit && (
                                                <span style={{ color: '#94a3b8', fontSize: '12px', padding: '8px' }}>Read-only</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </main>

            {/* Account Modal */}
            {isModalOpen && (
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
                }} onClick={() => setIsModalOpen(false)}>
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
                            {selectedAccount ? 'Edit Account' : 'Create Account'}
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Company Name *</label>
                                <input
                                    type="text"
                                    value={formData['Company Name']}
                                    onChange={(e) => setFormData({ ...formData, 'Company Name': e.target.value })}
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
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Territory</label>
                                <select
                                    value={formData.Territory}
                                    onChange={(e) => setFormData({ ...formData, Territory: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select Territory</option>
                                    {territories.map(territory => (
                                        <option key={territory} value={territory}>{territory}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Product Interest</label>
                                <input
                                    type="text"
                                    value={formData['Product Interest']}
                                    onChange={(e) => setFormData({ ...formData, 'Product Interest': e.target.value })}
                                    placeholder="e.g., Windows, Doors, Panels"
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
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Lead Source</label>
                                <select
                                    value={formData['Lead Source']}
                                    onChange={(e) => setFormData({ ...formData, 'Lead Source': e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select Lead Source</option>
                                    {leadSources.map(source => (
                                        <option key={source} value={source}>{source}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Lifecycle Status</label>
                                <select
                                    value={formData['Lifecycle Status']}
                                    onChange={(e) => setFormData({ ...formData, 'Lifecycle Status': e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    {lifecycleStatuses.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Owner</label>
                                <select
                                    value={formData.Owner}
                                    onChange={(e) => setFormData({ ...formData, Owner: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Unassigned</option>
                                    {users.map(u => (
                                        <option key={u.Name || u.Email} value={u.Name || u.Email}>
                                            {u.Name || u.Email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Notes</label>
                                <textarea
                                    value={formData.Notes}
                                    onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    if (savingAccount) return;
                                    setIsModalOpen(false);
                                    setSelectedAccount(null);
                                }}
                                disabled={savingAccount}
                                style={{
                                    padding: '10px 20px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: savingAccount ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: savingAccount ? 0.6 : 1
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={savingAccount}
                                style={{
                                    padding: '10px 20px',
                                    background: savingAccount ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: savingAccount ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: savingAccount ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    justifyContent: 'center',
                                    minWidth: '100px'
                                }}
                            >
                                {savingAccount && <RefreshCw size={14} className="animate-spin" />}
                                {savingAccount ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

