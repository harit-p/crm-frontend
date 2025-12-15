import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

// Reusing the same field definitions
const STAGE_FIELDS = {
    "New Lead": [
        { id: "Company Name", label: "Company Name", type: "text", placeholder: "Company or organization name" },
        { id: "Contact Name", label: "Contact Name", type: "text", placeholder: "Primary contact person" },
        { id: "Email or Phone", label: "Email or Phone", type: "text", placeholder: "Contact information" },
        { id: "Territory", label: "Territory", type: "text", placeholder: "North, South, East, West" },
        { id: "Lead Source", label: "Lead Source", type: "text", placeholder: "Website, Referral, Trade Show..." }
    ],
    "Contact Made": [
        { id: "Interest Type", label: "Interest Type", type: "text", placeholder: "Windows, Doors, Panels..." },
        { id: "First Contact Notes", label: "First Contact Notes", type: "textarea", placeholder: "Notes from initial contact..." }
    ],
    "Discovery Completed": [
        { id: "Project Type", label: "Project Type", type: "text", placeholder: "Commercial, Residential..." },
        { id: "Scope", label: "Scope", type: "text", placeholder: "Units / Sqft / Counts" },
        { id: "Timeline", label: "Timeline", type: "text", placeholder: "Project timeline" },
        { id: "Buying Role", label: "Buying Role", type: "text", placeholder: "Decision Maker, Influencer..." },
        { id: "Competitors", label: "Competitors", type: "text", placeholder: "Known competitors" },
        { id: "Discovery Notes", label: "Discovery Notes", type: "textarea", placeholder: "Discovery findings..." }
    ],
    "Qualified Opportunity": [
        { id: "Qualification Score", label: "Qualification Score (1-10)", type: "number", placeholder: "1-10" },
        { id: "Estimated Revenue", label: "Estimated Revenue", type: "number", placeholder: "Dollar amount" },
        { id: "Project Address", label: "Project Address", type: "text", placeholder: "Site location" },
        { id: "Required Product Categories", label: "Product Categories", type: "text", placeholder: "Windows, Doors..." },
        { id: "Link to Plans", label: "Link to Plans", type: "text", placeholder: "Google Drive URL" }
    ],
    "Proposal Sent": [
        { id: "Proposal Amount", label: "Proposal Amount ($)", type: "number", placeholder: "Dollar amount" },
        { id: "Proposal Version", label: "Version", type: "text", placeholder: "v1.0" },
        { id: "Proposal Date", label: "Proposal Date", type: "date" },
        { id: "Decision Date", label: "Decision Date", type: "date" },
        { id: "Next Meeting", label: "Next Meeting", type: "date" }
    ],
    "Negotiation / Decision": [
        { id: "Updated Quote", label: "Updated Quote ($)", type: "number", placeholder: "Dollar amount" },
        { id: "Objections", label: "Objections", type: "textarea", placeholder: "Customer concerns..." },
        { id: "Negotiation Notes", label: "Negotiation Notes", type: "textarea", placeholder: "Discussion points..." },
        { id: "Decision Maker", label: "Decision Maker Name", type: "text", placeholder: "Full name" }
    ],
    "Verbal Win": [
        { id: "Expected Close Date", label: "Expected Close Date", type: "date" },
        { id: "Final Deal Value", label: "Final Deal Value ($)", type: "number", placeholder: "Dollar amount" },
        { id: "Handoff Notes", label: "Handoff Requirements", type: "textarea", placeholder: "Deployment notes..." },
        { id: "Delivery Timing", label: "Delivery Timing", type: "text", placeholder: "Timeline requirements" }
    ],
    "Closed Won": [
        { id: "Final Deal Value", label: "Final Value", type: "number", placeholder: "Dollar amount" },
        { id: "Final Margin", label: "Final Margin %", type: "text", placeholder: "Percentage" },
        { id: "Handoff Notes", label: "Final Handoff Notes", type: "textarea", placeholder: "Transition details..." }
    ],
    "Closed Lost": [
        { id: "Reason Lost", label: "Reason Lost", type: "text", placeholder: "Price, Competitor, Timing..." },
        { id: "Competitors", label: "Winning Competitor", type: "text", placeholder: "Who won the deal?" },
        { id: "Next Outreach", label: "Notes for Next Cycle", type: "textarea", placeholder: "Future opportunities..." }
    ]
};

const STAGES = Object.keys(STAGE_FIELDS);

export const StageMoveModal = ({ isOpen, onClose, deal, onSave }) => {
    const [selectedStage, setSelectedStage] = useState('');
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (deal) setSelectedStage(deal.stage);
        setFormData({});
    }, [deal]);

    const handleStageChange = (e) => {
        setSelectedStage(e.target.value);
        setFormData({});
    };

    const handleInputChange = (id, value) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const payload = { ...formData, id: deal.id, stage: selectedStage };
        await onSave(payload);
        setLoading(false);
    };

    const requiredFields = STAGE_FIELDS[selectedStage] || [];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    {/* Modal Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white z-50 shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            padding: '24px',
                            color: 'white'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Move Deal</h2>
                                    <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>Update stage and required fields</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                                >
                                    <X size={24} color="white" />
                                </button>
                            </div>

                            {/* Deal Info Card */}
                            <div style={{
                                marginTop: '16px',
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <p style={{ margin: 0, fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deal</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '600' }}>{deal?.name}</p>
                            </div>
                        </div>

                        {/* Form Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Stage Selector */}
                                <div>
                                    <label style={{
                                        display: 'flex',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '8px',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        New Stage
                                        <ChevronRight size={16} color="#667eea" />
                                    </label>
                                    <select
                                        value={selectedStage}
                                        onChange={handleStageChange}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            background: 'white',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                    >
                                        {STAGES.map(stage => (
                                            <option key={stage} value={stage}>{stage}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Dynamic Fields */}
                                {requiredFields.length > 0 && (
                                    <>
                                        <div style={{
                                            height: '1px',
                                            background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
                                            margin: '8px 0'
                                        }}></div>

                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            color: '#667eea',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px'
                                        }}>
                                            Required Fields
                                        </div>
                                    </>
                                )}

                                {requiredFields.map((field, index) => (
                                    <div key={field.id}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: '#374151',
                                            marginBottom: '8px'
                                        }}>
                                            {field.label}
                                        </label>
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                required
                                                placeholder={field.placeholder}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    border: '2px solid #e5e7eb',
                                                    borderRadius: '12px',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    transition: 'all 0.2s',
                                                    fontFamily: 'Inter, sans-serif',
                                                    resize: 'vertical',
                                                    minHeight: '100px'
                                                }}
                                                rows={3}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                            />
                                        ) : (
                                            <input
                                                type={field.type}
                                                required
                                                placeholder={field.placeholder}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    border: '2px solid #e5e7eb',
                                                    borderRadius: '12px',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    transition: 'all 0.2s',
                                                    fontFamily: 'Inter, sans-serif'
                                                }}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                            />
                                        )}
                                    </div>
                                ))}

                                {requiredFields.length === 0 && selectedStage !== 'New Lead' && (
                                    <p style={{
                                        textAlign: 'center',
                                        color: '#9ca3af',
                                        fontSize: '14px',
                                        fontStyle: 'italic',
                                        padding: '24px'
                                    }}>
                                        No additional fields required for this stage
                                    </p>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        marginTop: '16px',
                                        padding: '14px 24px',
                                        background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                                    }}
                                    onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                    onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                                >
                                    {loading ? 'Saving...' : 'Save & Move Stage'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
