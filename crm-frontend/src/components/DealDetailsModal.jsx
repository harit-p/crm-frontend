import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, User, Calendar, MapPin, FileText, TrendingUp } from 'lucide-react';

export const DealDetailsModal = ({ isOpen, onClose, deal }) => {
  if (!deal) return null;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    if (!value || value === '') return 'Not set';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
  };

  // Get field value - try multiple variations of field name
  const getFieldValue = (fieldName) => {
    // Try exact match first
    if (deal[fieldName] !== undefined && deal[fieldName] !== null && deal[fieldName] !== '') {
      return deal[fieldName];
    }
    // Try without spaces
    const noSpaces = fieldName.replace(/\s+/g, '');
    if (deal[noSpaces] !== undefined && deal[noSpaces] !== null && deal[noSpaces] !== '') {
      return deal[noSpaces];
    }
    // Try with underscores
    const withUnderscores = fieldName.replace(/\s+/g, '_');
    if (deal[withUnderscores] !== undefined && deal[withUnderscores] !== null && deal[withUnderscores] !== '') {
      return deal[withUnderscores];
    }
    // Try camelCase
    const camelCase = fieldName.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/\s/g, '');
    if (deal[camelCase] !== undefined && deal[camelCase] !== null && deal[camelCase] !== '') {
      return deal[camelCase];
    }
    return '';
  };

  const hasValue = (fieldName) => {
    const value = getFieldValue(fieldName);
    // Check if value exists and is not empty
    if (value === '' || value === null || value === undefined) return false;
    // For strings, check if not just whitespace
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  };

  const renderField = (label, fieldName, icon = null) => {
    const value = getFieldValue(fieldName);
    if (!hasValue(fieldName)) return null;

    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          {icon && React.cloneElement(icon, { size: 16, color: '#667eea' })}
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label}
          </label>
        </div>
        <div style={{ fontSize: '14px', color: '#1f2937', paddingLeft: icon ? '24px' : '0' }}>
          {value}
        </div>
      </div>
    );
  };

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
            className="fixed inset-y-0 right-0 w-full sm:w-[600px] bg-white z-50 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                    {deal.name || 'Opportunity Details'}
                  </h2>
                  <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                    {deal.stage || 'No stage'}
                  </p>
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

              {/* Key Metrics */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  flex: 1
                }}>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>Probability</div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>
                    {Math.round((deal.probability || 0) * 100)}%
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  flex: 1
                }}>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>Revenue</div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>
                    {formatCurrency(deal.revenue || deal['Estimated Revenue'])}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  flex: 1
                }}>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>Owner</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {deal.owner || deal['Assigned Rep'] || 'Unassigned'}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {/* Basic Information - Always show core fields */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#667eea" />
                  Basic Information
                </h3>
                <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                  {deal['Opportunity ID'] && renderField('Opportunity ID', 'Opportunity ID')}
                  {deal['Account ID'] && renderField('Account ID', 'Account ID')}
                  {deal['Company Name'] && renderField('Company Name', 'Company Name')}
                  {renderField('Contact Name', 'Contact Name')}
                  {renderField('Email or Phone', 'Email or Phone')}
                  {renderField('Territory', 'Territory')}
                  {renderField('Lead Source', 'Lead Source')}
                  {deal['Created Date'] && renderField('Created Date', 'Created Date', <Calendar size={16} />)}
                </div>
              </div>

              {/* New Lead Fields */}
              {(hasValue('Contact Name') || hasValue('Email or Phone') || hasValue('Territory') || hasValue('Lead Source')) && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
                    New Lead Information
                  </h3>
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                    {renderField('Contact Name', 'Contact Name', <User size={16} />)}
                    {renderField('Email or Phone', 'Email or Phone')}
                    {renderField('Territory', 'Territory', <MapPin size={16} />)}
                    {renderField('Lead Source', 'Lead Source')}
                  </div>
                </div>
              )}

              {/* Contact Made Fields */}
              {(hasValue('Validated Contact Info') || hasValue('Interest Type') || hasValue('First Contact Notes')) && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
                    Contact Made Information
                  </h3>
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                    {renderField('Validated Contact Info', 'Validated Contact Info')}
                    {renderField('Interest Type', 'Interest Type')}
                    {renderField('First Contact Notes', 'First Contact Notes')}
                  </div>
                </div>
              )}

              {/* Discovery Fields */}
              {(hasValue('Project Type') || hasValue('Scope') || hasValue('Timeline') || hasValue('Buying Role') || hasValue('Competitors') || hasValue('Discovery Notes')) && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
                    Discovery Information
                  </h3>
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                    {renderField('Project Type', 'Project Type')}
                    {renderField('Scope', 'Scope')}
                    {renderField('Timeline', 'Timeline', <Calendar size={16} />)}
                    {renderField('Buying Role', 'Buying Role')}
                    {renderField('Competitors', 'Competitors')}
                    {renderField('Discovery Notes', 'Discovery Notes')}
                  </div>
                </div>
              )}

              {/* Qualified Opportunity Fields */}
              {(hasValue('Qualification Score') || hasValue('Project Address') || hasValue('Required Product Categories') || hasValue('Link to Plans')) && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
                    Qualified Opportunity Information
                  </h3>
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                    {renderField('Qualification Score', 'Qualification Score')}
                    {renderField('Estimated Revenue', 'Estimated Revenue', <DollarSign size={16} />)}
                    {renderField('Project Address', 'Project Address', <MapPin size={16} />)}
                    {renderField('Required Product Categories', 'Required Product Categories')}
                    {renderField('Link to Plans', 'Link to Plans')}
                  </div>
                </div>
              )}

              {/* Proposal Fields */}
              {(hasValue('Proposal Amount') || hasValue('Proposal Version') || hasValue('Proposal Date') || hasValue('Decision Date') || hasValue('Next Meeting')) && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
                    Proposal Information
                  </h3>
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                    {renderField('Proposal Amount', 'Proposal Amount', <DollarSign size={16} />)}
                    {renderField('Proposal Version', 'Proposal Version')}
                    {renderField('Proposal Date', 'Proposal Date', <Calendar size={16} />)}
                    {renderField('Decision Date', 'Decision Date', <Calendar size={16} />)}
                    {renderField('Next Meeting', 'Next Meeting', <Calendar size={16} />)}
                  </div>
                </div>
              )}

              {/* Negotiation Fields */}
              {(hasValue('Updated Quote') || hasValue('Objections') || hasValue('Negotiation Notes') || hasValue('Decision Maker')) && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
                    Negotiation Information
                  </h3>
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                    {renderField('Updated Quote', 'Updated Quote', <DollarSign size={16} />)}
                    {renderField('Objections', 'Objections')}
                    {renderField('Negotiation Notes', 'Negotiation Notes')}
                    {renderField('Decision Maker', 'Decision Maker', <User size={16} />)}
                  </div>
                </div>
              )}

              {/* Verbal Win / Closed Won Fields */}
              {(hasValue('Expected Close Date') || hasValue('Final Deal Value') || hasValue('Final Margin') || hasValue('Handoff Notes') || hasValue('Delivery Timing') || hasValue('Billing Contact Info')) && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
                    Closing Information
                  </h3>
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                    {renderField('Expected Close Date', 'Expected Close Date', <Calendar size={16} />)}
                    {renderField('Final Deal Value', 'Final Deal Value', <DollarSign size={16} />)}
                    {renderField('Final Margin', 'Final Margin')}
                    {renderField('Billing Contact Info', 'Billing Contact Info')}
                    {renderField('Handoff Notes', 'Handoff Notes')}
                    {renderField('Delivery Timing', 'Delivery Timing')}
                  </div>
                </div>
              )}

              {/* Closed Lost Fields */}
              {(hasValue('Reason Lost') || hasValue('Next Outreach')) && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
                    Lost Information
                  </h3>
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                    {renderField('Reason Lost', 'Reason Lost')}
                    {renderField('Winning Competitor', 'Competitors')}
                    {renderField('Next Outreach', 'Next Outreach')}
                  </div>
                </div>
              )}

              {/* Show message if no details - check all possible fields */}
              {!hasValue('Contact Name') && 
               !hasValue('Email or Phone') && 
               !hasValue('Project Type') && 
               !hasValue('Scope') && 
               !hasValue('Proposal Amount') && 
               !hasValue('Qualification Score') && 
               !hasValue('Updated Quote') && 
               !hasValue('Final Deal Value') && 
               !hasValue('Reason Lost') && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <p>No additional details available for this opportunity.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

