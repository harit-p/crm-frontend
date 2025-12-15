import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, User, TrendingUp } from 'lucide-react';

export const DealCard = ({ deal, onMoveClick }) => {
    const probColor = getProbColor(deal.probability);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-3 cursor-pointer group relative overflow-hidden"
            style={{ transition: 'all 0.2s ease' }}
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
                color: '#6b7280'
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
            </div>

            {/* Action Button */}
            <button
                onClick={() => onMoveClick(deal)}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#f9fafb',
                    color: '#6b7280',
                    fontSize: '13px',
                    fontWeight: '500',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
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
                Move Stage
            </button>
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
