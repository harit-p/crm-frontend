import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
        { id: "Validated Contact Info", label: "Validated Contact Info", type: "text", placeholder: "Confirmed email or phone number" },
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
        { id: "Billing Contact Info", label: "Billing Contact Info", type: "text", placeholder: "Billing contact name, email, phone" },
        { id: "Handoff Notes", label: "Final Handoff Notes", type: "textarea", placeholder: "Transition details..." }
    ],
    "Closed Lost": [
        { id: "Reason Lost", label: "Reason Lost", type: "text", placeholder: "Price, Competitor, Timing..." },
        { id: "Competitors", label: "Winning Competitor", type: "text", placeholder: "Who won the deal?" },
        { id: "Next Outreach", label: "Notes for Next Cycle", type: "textarea", placeholder: "Future opportunities..." }
    ]
};

const STAGES = Object.keys(STAGE_FIELDS);

// Define stage order for progression validation
const STAGE_ORDER = [
    "New Lead",
    "Contact Made",
    "Discovery Completed",
    "Qualified Opportunity",
    "Proposal Sent",
    "Negotiation / Decision",
    "Verbal Win",
    "Closed Won",
    "Closed Lost"
];

// Helper function to get stage index
const getStageIndex = (stage) => STAGE_ORDER.indexOf(stage);

// Helper function to check if stage progression is valid
const isValidStageProgression = (currentStage, newStage) => {
    const currentIndex = getStageIndex(currentStage);
    const newIndex = getStageIndex(newStage);
    
    // Can't move to same stage
    if (currentIndex === newIndex) {
        return { valid: false, message: "Deal is already in this stage" };
    }
    
    // Closed stages can only move to other closed stages or backward
    if (currentStage === "Closed Won" || currentStage === "Closed Lost") {
        if (newStage === "Closed Won" || newStage === "Closed Lost") {
            return { valid: true };
        }
        return { valid: false, message: "Cannot move from closed stage to active stage" };
    }
    
    // Can move forward one stage
    if (newIndex === currentIndex + 1) {
        return { valid: true };
    }
    
    // Can move backward (reopening)
    if (newIndex < currentIndex) {
        return { valid: true };
    }
    
    // Can move to closed stages from any active stage
    if (newStage === "Closed Won" || newStage === "Closed Lost") {
        return { valid: true };
    }
    
    // Cannot skip stages forward
    return { 
        valid: false, 
        message: `Cannot skip stages. Current: ${currentStage}. Next allowed: ${STAGE_ORDER[currentIndex + 1] || "Closed Won/Lost"}` 
    };
};

export const StageMoveModal = ({ isOpen, onClose, deal, onSave }) => {
    const { user, canMoveToStage, canEditDeal, hasPermission } = useAuth();
    const [selectedStage, setSelectedStage] = useState('');
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [stageError, setStageError] = useState('');

    useEffect(() => {
        if (deal) {
            setSelectedStage(deal.stage);
            setFormData({});
            setErrors({});
            setStageError('');
        }
    }, [deal]);

    const handleStageChange = (e) => {
        const newStage = e.target.value;
        setSelectedStage(newStage);
        setFormData({});
        setErrors({});
        
        // Check role-based restrictions
        if (!canMoveToStage(newStage)) {
            if (user?.Role === 'Data Specialist') {
                setStageError('Data Specialist cannot move deals past "Contact Made" stage');
            } else if (user?.Role === 'Exec') {
                setStageError('Exec role is read-only and cannot move deals');
            } else {
                setStageError('You do not have permission to move to this stage');
            }
            return;
        }
        
        // Data Specialist cannot mark as Closed Won/Lost
        if (user?.Role === 'Data Specialist' && (newStage === 'Closed Won' || newStage === 'Closed Lost')) {
            setStageError('Data Specialist cannot mark deals as Closed Won/Lost');
            return;
        }
        
        // Validate stage progression
        if (deal) {
            const validation = isValidStageProgression(deal.stage, newStage);
            if (!validation.valid) {
                setStageError(validation.message);
            } else {
                setStageError('');
            }
        }
    };

    const handleInputChange = (id, value) => {
        setFormData(prev => ({ ...prev, [id]: value }));
        // Clear error for this field when user starts typing
        if (errors[id]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const requiredFields = STAGE_FIELDS[selectedStage] || [];
        
        // Check all required fields
        requiredFields.forEach(field => {
            const value = formData[field.id];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                newErrors[field.id] = `${field.label} is required`;
            }
        });
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate stage progression
        if (deal) {
            const validation = isValidStageProgression(deal.stage, selectedStage);
            if (!validation.valid) {
                setStageError(validation.message);
                return;
            }
        }
        
        // Validate required fields
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);
        setErrors({});
        setStageError('');
        
        try {
            const payload = { ...formData, id: deal.id, stage: selectedStage };
            await onSave(payload);
        } catch (error) {
            setErrors({ submit: error.message || "Failed to save. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    const requiredFields = STAGE_FIELDS[selectedStage] || [];
    
    // Get allowed stages based on current stage and user role
    const getAllowedStages = () => {
        if (!deal) return STAGES;
        
        const currentIndex = getStageIndex(deal.stage);
        const allowed = [];
        
        // Data Specialist restrictions: Cannot move past "Contact Made"
        if (user?.Role === 'Data Specialist') {
            allowed.push("New Lead", "Contact Made");
            return allowed;
        }
        
        // Exec is read-only - cannot move deals
        if (user?.Role === 'Exec') {
            return [];
        }
        
        // Can always move to closed stages (except Data Specialist)
        allowed.push("Closed Won", "Closed Lost");
        
        // Can move forward one stage
        if (currentIndex < STAGE_ORDER.length - 3) { // Not already at last active stage
            allowed.push(STAGE_ORDER[currentIndex + 1]);
        }
        
        // Can move backward (reopening)
        for (let i = 0; i < currentIndex; i++) {
            allowed.push(STAGE_ORDER[i]);
        }
        
        // Remove duplicates and sort
        return [...new Set(allowed)].sort((a, b) => 
            getStageIndex(a) - getStageIndex(b)
        );
    };
    
    const allowedStages = deal ? getAllowedStages() : STAGES;
    
    // Check if user can edit this deal
    useEffect(() => {
        if (deal && !canEditDeal(deal)) {
            setStageError('You do not have permission to edit this deal');
        } else {
            setStageError('');
        }
    }, [deal, canEditDeal]);

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
                                            border: stageError ? '2px solid #ef4444' : '2px solid #e5e7eb',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            background: 'white',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = stageError ? '#ef4444' : '#667eea'}
                                        onBlur={(e) => e.target.style.borderColor = stageError ? '#ef4444' : '#e5e7eb'}
                                    >
                                        {allowedStages.map(stage => (
                                            <option key={stage} value={stage}>
                                                {stage} {stage === deal?.stage ? '(Current)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {stageError && (
                                        <div style={{
                                            marginTop: '8px',
                                            padding: '8px 12px',
                                            background: '#fee2e2',
                                            border: '1px solid #fecaca',
                                            borderRadius: '8px',
                                            color: '#dc2626',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span style={{ fontSize: '16px' }}>⚠️</span>
                                            <span>{stageError}</span>
                                        </div>
                                    )}
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
                                            <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                        </label>
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                required
                                                placeholder={field.placeholder}
                                                value={formData[field.id] || ''}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    border: errors[field.id] ? '2px solid #ef4444' : '2px solid #e5e7eb',
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
                                                onFocus={(e) => e.target.style.borderColor = errors[field.id] ? '#ef4444' : '#667eea'}
                                                onBlur={(e) => e.target.style.borderColor = errors[field.id] ? '#ef4444' : '#e5e7eb'}
                                            />
                                        ) : (
                                            <input
                                                type={field.type}
                                                required
                                                placeholder={field.placeholder}
                                                value={formData[field.id] || ''}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    border: errors[field.id] ? '2px solid #ef4444' : '2px solid #e5e7eb',
                                                    borderRadius: '12px',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    transition: 'all 0.2s',
                                                    fontFamily: 'Inter, sans-serif'
                                                }}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                onFocus={(e) => e.target.style.borderColor = errors[field.id] ? '#ef4444' : '#667eea'}
                                                onBlur={(e) => e.target.style.borderColor = errors[field.id] ? '#ef4444' : '#e5e7eb'}
                                            />
                                        )}
                                        {errors[field.id] && (
                                            <div style={{
                                                marginTop: '4px',
                                                fontSize: '12px',
                                                color: '#ef4444'
                                            }}>
                                                {errors[field.id]}
                                            </div>
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

                                {/* Optional Fields: Notes and Attachments */}
                                <div style={{
                                    height: '1px',
                                    background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
                                    margin: '24px 0 16px 0'
                                }}></div>

                                <div style={{
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: '#667eea',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '16px'
                                }}>
                                    Optional Fields
                                </div>

                                {/* Notes Field */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#374151',
                                        marginBottom: '8px'
                                    }}>
                                        Notes
                                    </label>
                                    <textarea
                                        placeholder="Add general notes about this opportunity..."
                                        value={formData['Notes'] || ''}
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
                                        onChange={(e) => handleInputChange('Notes', e.target.value)}
                                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                    />
                                </div>

                                {/* Attachments Field */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#374151',
                                        marginBottom: '8px'
                                    }}>
                                        Attachments (URLs)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter file URLs separated by commas (e.g., https://drive.google.com/file/..., https://example.com/file.pdf)"
                                        value={formData['Attachments'] || ''}
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
                                        onChange={(e) => handleInputChange('Attachments', e.target.value)}
                                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                    />
                                    <p style={{
                                        marginTop: '6px',
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        fontStyle: 'italic'
                                    }}>
                                        Separate multiple URLs with commas
                                    </p>
                                </div>

                                {errors.submit && (
                                    <div style={{
                                        padding: '12px 16px',
                                        background: '#fee2e2',
                                        border: '1px solid #fecaca',
                                        borderRadius: '8px',
                                        color: '#dc2626',
                                        fontSize: '14px'
                                    }}>
                                        {errors.submit}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading || !!stageError}
                                    style={{
                                        marginTop: '16px',
                                        padding: '14px 24px',
                                        background: (loading || stageError) ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: (loading || stageError) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: (loading || stageError) ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
                                    }}
                                    onMouseOver={(e) => !loading && !stageError && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                    onMouseOut={(e) => !loading && !stageError && (e.currentTarget.style.transform = 'translateY(0)')}
                                >
                                    {loading ? 'Saving...' : stageError ? 'Fix Stage Selection' : 'Save & Move Stage'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
