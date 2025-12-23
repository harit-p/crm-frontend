import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { crmApi } from '../api';
import { Layout, LogOut, Plus, Edit, Trash2, RefreshCw, Users, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ContactsPage = () => {
    const { user, logout, canEditContact, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [savingContact, setSavingContact] = useState(false);
    const [deletingContactId, setDeletingContactId] = useState(null);
    const [formData, setFormData] = useState({
        'Full Name': '',
        Email: '',
        Phone: '',
        'Buying Role': '',
        'Is Billing Contact': false,
        Notes: '',
        'Account ID': ''
    });

    useEffect(() => {
        fetchData();
        fetchAccounts();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const result = await crmApi.getContacts();
        if (result.status === 'success') {
            setContacts(result.data || []);
        }
        setLoading(false);
    };

    const fetchAccounts = async () => {
        const result = await crmApi.getAccounts();
        if (result.status === 'success') {
            setAccounts(result.data || []);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setTimeout(() => setRefreshing(false), 500);
    };

    const handleCreate = () => {
        setSelectedContact(null);
        setFormData({
            'Full Name': '',
            Email: '',
            Phone: '',
            'Buying Role': '',
            'Is Billing Contact': false,
            Notes: '',
            'Account ID': ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (contact) => {
        if (!canEditContact(contact)) {
            alert('You do not have permission to edit this contact');
            return;
        }
        setSelectedContact(contact);
        setFormData({
            'Full Name': contact['Full Name'] || contact.FullName || '',
            Email: contact.Email || '',
            Phone: contact.Phone || '',
            'Buying Role': contact['Buying Role'] || contact.BuyingRole || '',
            'Is Billing Contact': contact['Is Billing Contact'] === true || contact.IsBillingContact === true || contact['Is Billing Contact'] === 'TRUE',
            Notes: contact.Notes || '',
            'Account ID': contact['Account ID'] || contact.AccountID || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (contact) => {
        if (!canEditContact(contact)) {
            alert('You do not have permission to delete this contact');
            return;
        }
        
        if (!window.confirm('Are you sure you want to delete this contact?')) {
            return;
        }

        const contactId = contact['Contact ID'] || contact.id;
        if (deletingContactId === contactId) return; // Prevent double-click
        
        setDeletingContactId(contactId);
        try {
            const result = await crmApi.deleteContact(contactId);
            if (result.status === 'success') {
                await fetchData();
            } else {
                alert('Error: ' + result.message);
            }
        } finally {
            setDeletingContactId(null);
        }
    };

    const handleSave = async () => {
        if (savingContact) return; // Prevent double-click
        
        if (!formData['Full Name'].trim()) {
            alert('Full Name is required');
            return;
        }
        if (!formData['Account ID']) {
            alert('Account is required');
            return;
        }

        setSavingContact(true);
        try {
            const payload = {
                'Full Name': formData['Full Name'],
                Email: formData.Email,
                Phone: formData.Phone,
                'Buying Role': formData['Buying Role'],
                'Is Billing Contact': formData['Is Billing Contact'],
                Notes: formData.Notes,
                'Account ID': formData['Account ID']
            };

            let result;
            if (selectedContact) {
                result = await crmApi.updateContact(selectedContact['Contact ID'] || selectedContact.id, payload);
            } else {
                result = await crmApi.createContact(payload);
            }

            if (result.status === 'success') {
                await fetchData();
                setIsModalOpen(false);
                setSelectedContact(null);
            } else {
                alert('Error: ' + result.message);
            }
        } finally {
            setSavingContact(false);
        }
    };

    const canCreate = () => {
        if (!user) return false;
        if (user.Role === 'Exec') return false;
        // Ops/Management has edit_all, Sales Rep and Data Specialist have edit_contacts
        return hasPermission('edit_contacts') || hasPermission('edit_all') || user.Role === 'Ops/Management';
    };

    const getAccountName = (accountId) => {
        const account = accounts.find(a => (a['Account ID'] || a.id) === accountId);
        return account ? (account['Company Name'] || account.CompanyName) : 'Unknown';
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
                    {hasPermission('view_analytics') && <a href="#" onClick={(e) => { e.preventDefault(); navigate('/analytics'); }}>Analytics</a>}
                    {user?.Role !== 'Exec' && <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tasks'); }}>Tasks</a>}
                    {hasPermission('export_data') && <a href="#">Export</a>}
                    <a href="#" className="active" onClick={(e) => { e.preventDefault(); navigate('/contacts'); }}>Contacts</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/accounts'); }}>Accounts</a>
                </nav>
            </div>

            <main className="main-content">
                <header>
                    <h1>Contacts</h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button 
                            onClick={handleCreate} 
                            disabled={!canCreate()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                background: canCreate() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#94a3b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: canCreate() ? 'pointer' : 'not-allowed',
                                fontWeight: '600',
                                fontSize: '14px',
                                opacity: canCreate() ? 1 : 0.6,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (canCreate()) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (canCreate()) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }
                            }}
                        >
                            <Plus size={16} />
                            New Contact
                        </button>
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
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginBottom: '20px'
                    }}>
                        {contacts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                                <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                <p>No contacts found</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Full Name</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Email</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Phone</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Account</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Buying Role</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Billing Contact</th>
                                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contacts.map((contact) => {
                                            const canEdit = canEditContact(contact);
                                            
                                            return (
                                                <tr key={contact['Contact ID'] || contact.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px', fontWeight: '500' }}>
                                                        {contact['Full Name'] || contact.FullName}
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        {contact.Email ? (
                                                            <a href={`mailto:${contact.Email}`} style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Mail size={14} />
                                                                {contact.Email}
                                                            </a>
                                                        ) : '-'}
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        {contact.Phone ? (
                                                            <a href={`tel:${contact.Phone}`} style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Phone size={14} />
                                                                {contact.Phone}
                                                            </a>
                                                        ) : '-'}
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '14px' }}>
                                                        {getAccountName(contact['Account ID'] || contact.AccountID)}
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                                                        {contact['Buying Role'] || contact.BuyingRole || '-'}
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        {(contact['Is Billing Contact'] === true || contact.IsBillingContact === true || contact['Is Billing Contact'] === 'TRUE') ? (
                                                            <span style={{
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                fontWeight: '500',
                                                                background: '#d1fae5',
                                                                color: '#065f46'
                                                            }}>
                                                                Yes
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>No</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                                        {canEdit && (
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <button
                                                                    onClick={() => handleEdit(contact)}
                                                                    disabled={savingContact || deletingContactId}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        background: '#f1f5f9',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: (savingContact || deletingContactId) ? 'not-allowed' : 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        fontSize: '12px',
                                                                        opacity: (savingContact || deletingContactId) ? 0.6 : 1
                                                                    }}
                                                                >
                                                                    <Edit size={14} />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(contact)}
                                                                    disabled={deletingContactId === (contact['Contact ID'] || contact.id) || savingContact}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        background: deletingContactId === (contact['Contact ID'] || contact.id) ? '#94a3b8' : '#fee2e2',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: (deletingContactId === (contact['Contact ID'] || contact.id) || savingContact) ? 'not-allowed' : 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        fontSize: '12px',
                                                                        color: '#991b1b',
                                                                        opacity: (deletingContactId === (contact['Contact ID'] || contact.id) || savingContact) ? 0.6 : 1
                                                                    }}
                                                                >
                                                                    {deletingContactId === (contact['Contact ID'] || contact.id) ? (
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
                                                            </div>
                                                        )}
                                                        {!canEdit && <span style={{ color: '#94a3b8', fontSize: '12px' }}>Read-only</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Contact Modal */}
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
                            {selectedContact ? 'Edit Contact' : 'Create Contact'}
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Full Name *</label>
                                <input
                                    type="text"
                                    value={formData['Full Name']}
                                    onChange={(e) => setFormData({ ...formData, 'Full Name': e.target.value })}
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
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Email</label>
                                <input
                                    type="email"
                                    value={formData.Email}
                                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
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
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Phone</label>
                                <input
                                    type="tel"
                                    value={formData.Phone}
                                    onChange={(e) => setFormData({ ...formData, Phone: e.target.value })}
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
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Account *</label>
                                <select
                                    value={formData['Account ID']}
                                    onChange={(e) => setFormData({ ...formData, 'Account ID': e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(acc => (
                                        <option key={acc['Account ID'] || acc.id} value={acc['Account ID'] || acc.id}>
                                            {acc['Company Name'] || acc.CompanyName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Buying Role</label>
                                <input
                                    type="text"
                                    value={formData['Buying Role']}
                                    onChange={(e) => setFormData({ ...formData, 'Buying Role': e.target.value })}
                                    placeholder="e.g., Decision Maker, Influencer"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    id="billingContact"
                                    checked={formData['Is Billing Contact']}
                                    onChange={(e) => setFormData({ ...formData, 'Is Billing Contact': e.target.checked })}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <label htmlFor="billingContact" style={{ fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                                    Is Billing Contact
                                </label>
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
                                    if (savingContact) return;
                                    setIsModalOpen(false);
                                    setSelectedContact(null);
                                }}
                                disabled={savingContact}
                                style={{
                                    padding: '10px 20px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: savingContact ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: savingContact ? 0.6 : 1
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={savingContact}
                                style={{
                                    padding: '10px 20px',
                                    background: savingContact ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: savingContact ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: savingContact ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    justifyContent: 'center',
                                    minWidth: '100px'
                                }}
                            >
                                {savingContact && <RefreshCw size={14} className="animate-spin" />}
                                {savingContact ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

