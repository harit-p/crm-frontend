import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { crmApi } from '../api';

export const ExportButton = ({ opportunities }) => {
    const { hasPermission } = useAuth();
    const [exporting, setExporting] = useState(false);

    if (!hasPermission('export_data')) {
        return null;
    }

    const handleExport = async () => {
        setExporting(true);
        try {
            // Convert opportunities to CSV
            const headers = ['Opportunity ID', 'Opportunity Name', 'Stage', 'Owner', 'Revenue', 'Probability', 'Account ID'];
            const rows = opportunities.map(opp => [
                opp.id || '',
                opp.name || '',
                opp.stage || '',
                opp.owner || '',
                opp.revenue || '',
                opp.probability || '',
                opp.accountId || ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Create download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `crm_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={exporting}
            style={{
                padding: '8px 16px',
                background: exporting ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: exporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
            }}
            onMouseOver={(e) => !exporting && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => !exporting && (e.currentTarget.style.transform = 'translateY(0)')}
        >
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export'}
        </button>
    );
};

