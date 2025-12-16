import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { crmApi } from '../api';
import { Layout, LogOut, Plus, Edit, Trash2, RefreshCw, Calendar, User, Briefcase, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TasksPage = () => {
    const { user, logout, canEditTask, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [opportunities, setOpportunities] = useState([]);
    const [users, setUsers] = useState([]);
    const [savingTask, setSavingTask] = useState(false);
    const [deletingTaskId, setDeletingTaskId] = useState(null);
    const [activeView, setActiveView] = useState('all'); // 'all', 'daily', 'overdue', 'pipeline'
    const [formData, setFormData] = useState({
        Subject: '',
        DueDate: '',
        Owner: user?.Name || '',
        Priority: 'Medium',
        Status: 'Pending',
        Notes: '',
        RelatedOpportunityID: '',
        RelatedAccountID: ''
    });

    useEffect(() => {
        fetchData();
        fetchAccounts();
        fetchOpportunities();
        fetchUsers();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const filters = {};
        
        // Sales Rep and Data Specialist only see their own tasks
        if (user?.Role === 'Sales Rep' || user?.Role === 'Data Specialist') {
            filters.owner = user.Name;
        }
        
        const result = await crmApi.getAllTasks(filters);
        if (result.status === 'success') {
            setTasks(result.data || []);
        }
        setLoading(false);
    };

    const fetchAccounts = async () => {
        const result = await crmApi.getAccounts();
        if (result.status === 'success') {
            setAccounts(result.data || []);
        }
    };

    const fetchOpportunities = async () => {
        const result = await crmApi.getOpportunities();
        if (result.status === 'success') {
            setOpportunities(result.data || []);
        }
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
        setSelectedTask(null);
        setFormData({
            Subject: '',
            DueDate: '',
            Owner: user?.Name || '',
            Priority: 'Medium',
            Status: 'Pending',
            Notes: '',
            RelatedOpportunityID: '',
            RelatedAccountID: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (task) => {
        if (!canEditTask(task)) {
            alert('You do not have permission to edit this task');
            return;
        }
        setSelectedTask(task);
        setFormData({
            Subject: task.Subject || '',
            DueDate: task['Due Date'] || task.DueDate || '',
            Owner: task.Owner || user?.Name || '',
            Priority: task.Priority || 'Medium',
            Status: task.Status || 'Pending',
            Notes: task.Notes || '',
            RelatedOpportunityID: task['Related Opportunity ID'] || task.RelatedOpportunityID || '',
            RelatedAccountID: task['Related Account ID'] || task.RelatedAccountID || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (task) => {
        if (!canEditTask(task)) {
            alert('You do not have permission to delete this task');
            return;
        }
        
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }

        const taskId = task['Task ID'] || task.id;
        if (deletingTaskId === taskId) return; // Prevent double-click
        
        setDeletingTaskId(taskId);
        try {
            const result = await crmApi.deleteTask(taskId);
            if (result.status === 'success') {
                await fetchData();
            } else {
                alert('Error: ' + result.message);
            }
        } finally {
            setDeletingTaskId(null);
        }
    };

    const handleSave = async () => {
        if (savingTask) return; // Prevent double-click
        
        if (!formData.Subject.trim()) {
            alert('Subject is required');
            return;
        }

        setSavingTask(true);
        try {
            const payload = {
                Subject: formData.Subject,
                'Due Date': formData.DueDate,
                Owner: formData.Owner,
                Priority: formData.Priority,
                Status: formData.Status,
                Notes: formData.Notes,
                'Related Opportunity ID': formData.RelatedOpportunityID || null,
                'Related Account ID': formData.RelatedAccountID || null
            };

            let result;
            if (selectedTask) {
                result = await crmApi.updateTask(selectedTask['Task ID'] || selectedTask.id, payload);
            } else {
                result = await crmApi.createTask(payload);
            }

            if (result.status === 'success') {
                await fetchData();
                setIsModalOpen(false);
                setSelectedTask(null);
            } else {
                alert('Error: ' + result.message);
            }
        } finally {
            setSavingTask(false);
        }
    };

    const canCreate = () => {
        if (!user) return false;
        if (user.Role === 'Exec') return false;
        return hasPermission('manage_tasks') || user.Role === 'Sales Rep' || user.Role === 'Data Specialist';
    };

    // Filter tasks based on active view
    const getFilteredTasks = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        switch (activeView) {
            case 'daily':
                // My Daily Tasks - tasks due today for current user
                return tasks.filter(task => {
                    const dueDate = task['Due Date'] || task.DueDate;
                    if (!dueDate) return false;
                    const taskDueDate = new Date(dueDate);
                    taskDueDate.setHours(0, 0, 0, 0);
                    const isToday = taskDueDate.getTime() === today.getTime();
                    const isMyTask = (task.Owner || task.owner) === user?.Name;
                    return isToday && isMyTask && task.Status !== 'Completed';
                });
            
            case 'overdue':
                // Overdue Tasks - tasks past due date
                return tasks.filter(task => {
                    const dueDate = task['Due Date'] || task.DueDate;
                    if (!dueDate) return false;
                    const taskDueDate = new Date(dueDate);
                    taskDueDate.setHours(0, 0, 0, 0);
                    const isOverdue = taskDueDate.getTime() < today.getTime();
                    return isOverdue && task.Status !== 'Completed';
                });
            
            case 'pipeline':
                // Pipeline Tasks - tasks related to opportunities
                return tasks.filter(task => {
                    const hasOppId = task['Related Opportunity ID'] || task.RelatedOpportunityID;
                    return !!hasOppId;
                });
            
            default:
                // All tasks (with role-based filtering already applied)
                return tasks;
        }
    };

    const filteredTasks = getFilteredTasks();

    // Helper to get opportunity name
    const getOpportunityName = (oppId) => {
        if (!oppId) return '-';
        const opp = opportunities.find(o => (o.id || o['Opportunity ID']) === oppId);
        return opp ? (opp.name || opp['Opportunity Name'] || oppId) : oppId;
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
                    {hasPermission('view_analytics') && <a href="#">Analytics</a>}
                    {user?.Role !== 'Exec' && <a href="#" className="active">Tasks</a>}
                    {hasPermission('export_data') && <a href="#">Export</a>}
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/contacts'); }}>Contacts</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/accounts'); }}>Accounts</a>
                </nav>
            </div>

            <main className="main-content">
                <header>
                    <h1>Tasks</h1>
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
                                New Task
                            </button>
                        )}
                        <button onClick={handleRefresh} disabled={refreshing}>
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} style={{ display: 'inline', marginRight: '8px' }} />
                            Refresh
                        </button>
                    </div>
                </header>

                {/* Task View Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '24px',
                    background: 'white',
                    padding: '8px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <button
                        onClick={() => setActiveView('all')}
                        style={{
                            padding: '10px 20px',
                            background: activeView === 'all' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f1f5f9',
                            color: activeView === 'all' ? 'white' : '#64748b',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                    >
                        All Tasks
                    </button>
                    <button
                        onClick={() => setActiveView('daily')}
                        style={{
                            padding: '10px 20px',
                            background: activeView === 'daily' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f1f5f9',
                            color: activeView === 'daily' ? 'white' : '#64748b',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}
                    >
                        My Daily Tasks
                        {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const dailyCount = tasks.filter(t => {
                                const dueDate = t['Due Date'] || t.DueDate;
                                if (!dueDate) return false;
                                const taskDueDate = new Date(dueDate);
                                taskDueDate.setHours(0, 0, 0, 0);
                                return taskDueDate.getTime() === today.getTime() && (t.Owner || t.owner) === user?.Name && t.Status !== 'Completed';
                            }).length;
                            return dailyCount > 0 ? (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    background: '#ef4444',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700'
                                }}>
                                    {dailyCount}
                                </span>
                            ) : null;
                        })()}
                    </button>
                    <button
                        onClick={() => setActiveView('overdue')}
                        style={{
                            padding: '10px 20px',
                            background: activeView === 'overdue' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f1f5f9',
                            color: activeView === 'overdue' ? 'white' : '#64748b',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}
                    >
                        Overdue Tasks
                        {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const overdueCount = tasks.filter(t => {
                                const dueDate = t['Due Date'] || t.DueDate;
                                if (!dueDate) return false;
                                const taskDueDate = new Date(dueDate);
                                taskDueDate.setHours(0, 0, 0, 0);
                                return taskDueDate.getTime() < today.getTime() && t.Status !== 'Completed';
                            }).length;
                            return overdueCount > 0 ? (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    background: '#ef4444',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700'
                                }}>
                                    {overdueCount}
                                </span>
                            ) : null;
                        })()}
                    </button>
                    <button
                        onClick={() => setActiveView('pipeline')}
                        style={{
                            padding: '10px 20px',
                            background: activeView === 'pipeline' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f1f5f9',
                            color: activeView === 'pipeline' ? 'white' : '#64748b',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Pipeline Tasks
                    </button>
                </div>

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
                        {filteredTasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                                <Target size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                <p>No tasks found</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Subject</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Due Date</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Owner</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Priority</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Status</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Related To</th>
                                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTasks.map((task) => {
                                            const canEdit = canEditTask(task);
                                            const dueDate = task['Due Date'] || task.DueDate;
                                            const isOverdue = dueDate && new Date(dueDate) < new Date() && task.Status !== 'Completed';
                                            
                                            return (
                                                <tr key={task['Task ID'] || task.id} style={{ 
                                                    borderBottom: '1px solid #f1f5f9',
                                                    backgroundColor: isOverdue ? '#fef2f2' : 'transparent'
                                                }}>
                                                    <td style={{ padding: '12px' }}>{task.Subject}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        {dueDate ? new Date(dueDate).toLocaleDateString() : '-'}
                                                        {isOverdue && <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '12px' }}>Overdue</span>}
                                                    </td>
                                                    <td style={{ padding: '12px' }}>{task.Owner || '-'}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            background: task.Priority === 'High' ? '#fee2e2' : task.Priority === 'Medium' ? '#fef3c7' : '#d1fae5',
                                                            color: task.Priority === 'High' ? '#991b1b' : task.Priority === 'Medium' ? '#92400e' : '#065f46'
                                                        }}>
                                                            {task.Priority || 'Medium'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            background: task.Status === 'Completed' ? '#d1fae5' : task.Status === 'In Progress' ? '#dbeafe' : '#f3f4f6',
                                                            color: task.Status === 'Completed' ? '#065f46' : task.Status === 'In Progress' ? '#1e40af' : '#374151'
                                                        }}>
                                                            {task.Status || 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                                                        {task['Related Opportunity ID'] || task.RelatedOpportunityID ? (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Briefcase size={12} />
                                                                {getOpportunityName(task['Related Opportunity ID'] || task.RelatedOpportunityID)}
                                                            </span>
                                                        ) : task['Related Account ID'] || task.RelatedAccountID ? (
                                                            <span>Account</span>
                                                        ) : (
                                                            <span>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                                        {canEdit && (
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <button
                                                                    onClick={() => handleEdit(task)}
                                                                    disabled={savingTask || deletingTaskId}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        background: '#f1f5f9',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: (savingTask || deletingTaskId) ? 'not-allowed' : 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        fontSize: '12px',
                                                                        opacity: (savingTask || deletingTaskId) ? 0.6 : 1
                                                                    }}
                                                                >
                                                                    <Edit size={14} />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(task)}
                                                                    disabled={deletingTaskId === (task['Task ID'] || task.id) || savingTask}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        background: deletingTaskId === (task['Task ID'] || task.id) ? '#94a3b8' : '#fee2e2',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: (deletingTaskId === (task['Task ID'] || task.id) || savingTask) ? 'not-allowed' : 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        fontSize: '12px',
                                                                        color: '#991b1b',
                                                                        opacity: (deletingTaskId === (task['Task ID'] || task.id) || savingTask) ? 0.6 : 1
                                                                    }}
                                                                >
                                                                    {deletingTaskId === (task['Task ID'] || task.id) ? (
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

            {/* Task Modal */}
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
                            {selectedTask ? 'Edit Task' : 'Create Task'}
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Subject *</label>
                                <input
                                    type="text"
                                    value={formData.Subject}
                                    onChange={(e) => setFormData({ ...formData, Subject: e.target.value })}
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
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Due Date</label>
                                <input
                                    type="date"
                                    value={formData.DueDate}
                                    onChange={(e) => setFormData({ ...formData, DueDate: e.target.value })}
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
                                    {users.map(u => (
                                        <option key={u.Name || u.Email} value={u.Name || u.Email}>
                                            {u.Name || u.Email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Priority</label>
                                <select
                                    value={formData.Priority}
                                    onChange={(e) => setFormData({ ...formData, Priority: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Status</label>
                                <select
                                    value={formData.Status}
                                    onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Related Opportunity</label>
                                <select
                                    value={formData.RelatedOpportunityID}
                                    onChange={(e) => setFormData({ ...formData, RelatedOpportunityID: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">None</option>
                                    {opportunities.map(opp => (
                                        <option key={opp.id || opp['Opportunity ID']} value={opp.id || opp['Opportunity ID']}>
                                            {opp.name || opp['Opportunity Name']} - {opp.stage || opp.Stage}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Related Account</label>
                                <select
                                    value={formData.RelatedAccountID}
                                    onChange={(e) => setFormData({ ...formData, RelatedAccountID: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">None</option>
                                    {accounts.map(acc => (
                                        <option key={acc['Account ID'] || acc.id} value={acc['Account ID'] || acc.id}>
                                            {acc['Company Name'] || acc.CompanyName}
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
                                    if (savingTask) return;
                                    setIsModalOpen(false);
                                    setSelectedTask(null);
                                }}
                                disabled={savingTask}
                                style={{
                                    padding: '10px 20px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: savingTask ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: savingTask ? 0.6 : 1
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={savingTask}
                                style={{
                                    padding: '10px 20px',
                                    background: savingTask ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: savingTask ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: savingTask ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    justifyContent: 'center',
                                    minWidth: '100px'
                                }}
                            >
                                {savingTask && <RefreshCw size={14} className="animate-spin" />}
                                {savingTask ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

