import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, User, TrendingUp, Calendar, Clock } from 'lucide-react';
import { crmApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

export const DealCard = ({ deal, onMoveClick, onDetailsClick }) => {
    const { user, canEditDeal, hasPermission } = useAuth();
    const probColor = getProbColor(deal.probability);
    const [timeRemaining, setTimeRemaining] = useState(null);
    
    const [timelineInfo, setTimelineInfo] = useState(null);
    
    // Fetch tasks and calculate timeline info
    useEffect(() => {
        if (!deal.id) {
            setTimelineInfo(null);
            return;
        }
        
        const calculateTimeline = async () => {
            // Don't show timeline for closed deals
            if (deal.stage === 'Closed Won' || deal.stage === 'Closed Lost') {
                setTimelineInfo(null);
                return;
            }
            
            const now = new Date();
            let bestDate = null;
            let bestLabel = '';
            let bestTimeDiff = Infinity;
            let isFromTask = false;
            
            // First, try to fetch task due dates (prioritize tasks - they're more urgent)
            try {
                const result = await crmApi.getTasksForOpportunity(deal.id);
                
                if (result.status === 'success' && result.data && result.data.length > 0) {
                    result.data.forEach((task) => {
                        const dueDateValue = task['Due Date'] || task['DueDate'] || task['dueDate'] || task['due_date'];
                        
                        if (!dueDateValue) return;
                        
                        try {
                            const date = new Date(dueDateValue);
                            
                            if (!isNaN(date.getTime())) {
                                const timeDiff = date - now;
                                
                                // Consider all dates (past and future) - show the most urgent one
                                // Find the nearest (earliest) date
                                if (timeDiff < bestTimeDiff) {
                                    bestTimeDiff = timeDiff;
                                    bestDate = date;
                                    bestLabel = 'Task Due';
                                    isFromTask = true;
                                }
                            }
                        } catch (e) {
                            // Skip invalid dates
                        }
                    });
                }
            } catch (error) {
                // Tasks are optional, continue with opportunity dates
            }
            
            // Then check opportunity date fields - ONLY use date timestamp fields
            const oppDateFields = [];
            
            if (deal.stage === 'New Lead') {
                if (deal['Next Meeting']) oppDateFields.push({ field: deal['Next Meeting'], label: 'Next Meeting' });
            } else if (deal.stage === 'Contact Made') {
                if (deal['Next Meeting']) oppDateFields.push({ field: deal['Next Meeting'], label: 'Next Meeting' });
            } else if (deal.stage === 'Discovery Completed') {
                if (deal['Next Meeting']) oppDateFields.push({ field: deal['Next Meeting'], label: 'Next Meeting' });
                if (deal['Decision Date']) oppDateFields.push({ field: deal['Decision Date'], label: 'Decision Due' });
            } else if (deal.stage === 'Qualified Opportunity') {
                if (deal['Next Meeting']) oppDateFields.push({ field: deal['Next Meeting'], label: 'Next Meeting' });
                if (deal['Decision Date']) oppDateFields.push({ field: deal['Decision Date'], label: 'Decision Due' });
            } else if (deal.stage === 'Proposal Sent' || deal.stage === 'Negotiation / Decision') {
                if (deal['Decision Date']) oppDateFields.push({ field: deal['Decision Date'], label: 'Decision Due' });
                if (deal['Next Meeting']) oppDateFields.push({ field: deal['Next Meeting'], label: 'Next Meeting' });
            } else if (deal.stage === 'Verbal Win') {
                if (deal['Expected Close Date']) oppDateFields.push({ field: deal['Expected Close Date'], label: 'Close Date' });
            } else {
                // Fallback: check for any date field
                if (deal['Next Meeting']) oppDateFields.push({ field: deal['Next Meeting'], label: 'Next Meeting' });
                if (deal['Decision Date']) oppDateFields.push({ field: deal['Decision Date'], label: 'Decision Due' });
                if (deal['Expected Close Date']) oppDateFields.push({ field: deal['Expected Close Date'], label: 'Close Date' });
            }
            
            // Process opportunity date fields and find the most urgent one
            // Only use opportunity dates if we don't have a task date, or if opportunity date is more urgent
            oppDateFields.forEach(({ field, label: fieldLabel }) => {
                if (!field) return;
                
                try {
                    const date = new Date(field);
                    if (!isNaN(date.getTime())) {
                        const timeDiff = date - now;
                        // Use opportunity date if no task date exists, or if it's more urgent (earlier)
                        if (!bestDate || timeDiff < bestTimeDiff) {
                            bestDate = date;
                            bestLabel = fieldLabel;
                            bestTimeDiff = timeDiff;
                            isFromTask = false;
                        }
                    }
                } catch (e) {
                    // Skip invalid dates
                }
            });
            
            // If we have a date (from task or opportunity), display it
            if (!bestDate) {
                setTimelineInfo(null);
                return;
            }
            
            // Calculate display info
            const diffTime = bestDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // If less than 24 hours, return hours/minutes for live timer
            if (diffTime > 0 && diffTime < 24 * 60 * 60 * 1000) {
                setTimelineInfo({ 
                    label: bestLabel, 
                    value: bestDate, 
                    targetDate: bestDate,
                    isLiveTimer: true,
                    overdue: false,
                    isFromTask: isFromTask
                });
            } else if (diffDays < 0) {
                setTimelineInfo({ label: bestLabel, value: bestDate, days: diffDays, overdue: true, isFromTask: isFromTask });
            } else if (diffDays === 0) {
                setTimelineInfo({ label: bestLabel, value: bestDate, days: 0, today: true, isFromTask: isFromTask });
            } else {
                setTimelineInfo({ label: bestLabel, value: bestDate, days: diffDays, overdue: false, isFromTask: isFromTask });
            }
        };
        
        calculateTimeline();
    }, [deal.id, deal.stage]);
    
    // Live timer for dates less than 24 hours away
    useEffect(() => {
        if (!timelineInfo || !timelineInfo.isLiveTimer || !timelineInfo.targetDate) {
            setTimeRemaining(null);
            return;
        }
        
        const updateTimer = () => {
            const now = new Date();
            const targetDate = timelineInfo.targetDate instanceof Date 
                ? timelineInfo.targetDate 
                : new Date(timelineInfo.targetDate);
            const diff = targetDate - now;
            
            if (diff <= 0) {
                setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, overdue: true });
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeRemaining({ hours, minutes, seconds, overdue: false });
        };
        
        updateTimer(); // Initial update
        const interval = setInterval(updateTimer, 1000); // Update every second
        
        return () => clearInterval(interval);
    }, [timelineInfo?.targetDate, timelineInfo?.isLiveTimer]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-3 cursor-pointer group relative overflow-hidden"
            style={{ transition: 'all 0.2s ease' }}
            onClick={() => {
                if (onDetailsClick) onDetailsClick(deal);
            }}
        >
            {/* Gradient Top Border (visible on hover) */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                opacity: 0,
                transition: 'opacity 0.2s'
            }} className="group-hover:opacity-100"></div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h4 style={{
                    fontWeight: '600',
                    color: '#1f2937',
                    fontSize: '14px',
                    lineHeight: '1.3',
                    flex: 1,
                    marginRight: '8px'
                }}>
                    {deal.name}
                </h4>
                <span style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    ...probColor,
                    whiteSpace: 'nowrap'
                }}>
                    {Math.round(deal.probability * 100)}%
                </span>
            </div>

            {/* Metadata */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '12px',
                fontSize: '12px',
                color: '#6b7280',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DollarSign size={14} style={{ color: '#10b981' }} />
                    <span style={{ fontWeight: '500' }}>
                        {deal.revenue ? `$${(deal.revenue / 1000).toFixed(0)}k` : '-'}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={14} style={{ color: '#667eea' }} />
                    <span>{deal.owner || 'Unassigned'}</span>
                </div>
                {timelineInfo && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: timelineInfo.overdue 
                            ? '#fee2e2' 
                            : timelineInfo.today 
                            ? '#fef3c7' 
                            : timelineInfo.isLiveTimer
                            ? '#fef3c7'
                            : '#e0e7ff',
                        color: timelineInfo.overdue 
                            ? '#dc2626' 
                            : timelineInfo.today 
                            ? '#d97706' 
                            : timelineInfo.isLiveTimer
                            ? '#d97706'
                            : '#4338ca',
                        fontWeight: '600',
                        fontSize: '11px'
                    }}>
                        <Clock size={12} />
                        {timelineInfo.isLiveTimer && timeRemaining ? (
                            timeRemaining.overdue ? (
                                <span>Overdue</span>
                            ) : (
                                <span>
                                    {String(timeRemaining.hours).padStart(2, '0')}:
                                    {String(timeRemaining.minutes).padStart(2, '0')}:
                                    {String(timeRemaining.seconds).padStart(2, '0')}
                                </span>
                            )
                        ) : timelineInfo.days !== null ? (
                            timelineInfo.overdue ? (
                                <span>{Math.abs(timelineInfo.days)}d overdue</span>
                            ) : timelineInfo.today ? (
                                <span>Today</span>
                            ) : (
                                <span>{timelineInfo.days}d left</span>
                            )
                        ) : (
                            <span>{timelineInfo.label}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onDetailsClick) onDetailsClick(deal);
                    }}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: '#f9fafb',
                        color: '#6b7280',
                        fontSize: '12px',
                        fontWeight: '500',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = '#e0e7ff';
                        e.currentTarget.style.color = '#667eea';
                        e.currentTarget.style.borderColor = '#c7d2fe';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.color = '#6b7280';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                >
                    View Details
                </button>
                {canEditDeal && canEditDeal(deal) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveClick(deal);
                        }}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: '#f9fafb',
                            color: '#6b7280',
                            fontSize: '12px',
                            fontWeight: '500',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.borderColor = 'transparent';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = '#f9fafb';
                            e.currentTarget.style.color = '#6b7280';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                    >
                        <TrendingUp size={14} />
                        Move
                    </button>
                )}
            </div>
        </motion.div>
    );
};

const getProbColor = (prob) => {
    if (prob >= 0.8) return {
        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
        color: '#15803d',
        border: '1px solid #86efac'
    };
    if (prob >= 0.4) return {
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        color: '#1d4ed8',
        border: '1px solid #93c5fd'
    };
    return {
        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
        color: '#6b7280',
        border: '1px solid #d1d5db'
    };
};
