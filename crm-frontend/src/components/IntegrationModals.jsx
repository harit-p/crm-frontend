import React, { useState, useRef } from 'react';
import { X, Mail, Clock, Upload, Send } from 'lucide-react';
import { crmApi } from '../api';
import { useToast } from '../contexts/ToastContext';

// Email Modal Component
export const EmailModal = ({ deal, onClose, onSuccess }) => {
  const { success, error } = useToast();
  const [formData, setFormData] = useState({
    to: deal?.['Email or Phone'] || deal?.contactEmail || '',
    subject: `Re: ${deal?.name || deal?.['Opportunity Name'] || 'Opportunity'}`,
    body: ''
  });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!formData.to || !formData.subject || !formData.body) {
      error('Please fill in all required fields');
      return;
    }

    setSending(true);
    try {
      const opportunityId = deal?.id || deal?.['Opportunity ID'];
      const accountId = deal?.accountId || deal?.['Account ID'];
      
      const result = await crmApi.sendGmailEmail({
        to: formData.to,
        subject: formData.subject,
        body: formData.body,
        opportunityId: opportunityId || null,
        accountId: accountId || null
      });

      if (result.status === 'success') {
        success('Email sent successfully and tracked in CRM!');
        onSuccess();
      } else {
        error('Error: ' + result.message);
      }
    } catch (err) {
      console.error('Error sending email:', err);
      error('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
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
      zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Send Email</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              To *
            </label>
            <input
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              placeholder="recipient@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Message *
            </label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={8}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              placeholder="Enter your message here..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              padding: '10px 20px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              cursor: sending ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              padding: '10px 20px',
              background: sending ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: sending ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Calendar Modal Component
export const CalendarModal = ({ deal, onClose, onSuccess }) => {
  const { success, error } = useToast();
  const [formData, setFormData] = useState({
    title: `Meeting: ${deal?.name || deal?.['Opportunity Name'] || 'Opportunity'}`,
    description: '',
    startTime: '',
    endTime: '',
    attendees: deal?.['Email or Phone'] || ''
  });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!formData.title || !formData.startTime || !formData.endTime) {
      error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const opportunityId = deal?.id || deal?.['Opportunity ID'];
      const accountId = deal?.accountId || deal?.['Account ID'];
      
      const attendeesList = formData.attendees ? formData.attendees.split(',').map(email => email.trim()).filter(email => email) : [];
      
      const result = await crmApi.createCalendarEvent({
        title: formData.title,
        description: formData.description,
        startTime: formData.startTime,
        endTime: formData.endTime,
        attendees: attendeesList,
        opportunityId: opportunityId || null,
        accountId: accountId || null
      });

      if (result.status === 'success') {
        success('Calendar event created successfully and logged in CRM!');
        onSuccess();
      } else {
        error('Error: ' + result.message);
      }
    } catch (err) {
      console.error('Error creating calendar event:', err);
      error('Failed to create calendar event. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
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
      zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Create Calendar Event</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              placeholder="Meeting description..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
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
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                End Time *
              </label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Attendees (comma-separated emails)
            </label>
            <input
              type="text"
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              placeholder="email1@example.com, email2@example.com"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={creating}
            style={{
              padding: '10px 20px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              cursor: creating ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              padding: '10px 20px',
              background: creating ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: creating ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Clock size={16} />
            {creating ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Document Modal Component
export const DocumentModal = ({ deal, onClose, onSuccess }) => {
  const { success, error } = useToast();
  const [formData, setFormData] = useState({
    fileName: '',
    fileContent: null,
    fileType: 'general', // 'general' or 'proposal'
    proposalVersion: '1.0',
    folderName: 'CRM Documents'
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData({ ...formData, fileName: file.name, fileContent: file });
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:type;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!formData.fileContent || !formData.fileName) {
      error('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const opportunityId = deal?.id || deal?.['Opportunity ID'];
      const accountId = deal?.accountId || deal?.['Account ID'];
      
      const base64Content = await convertFileToBase64(formData.fileContent);
      const mimeType = formData.fileContent.type || 'application/octet-stream';

      let result;
      if (formData.fileType === 'proposal') {
        result = await crmApi.storeProposal({
          proposalContent: base64Content,
          opportunityId: opportunityId,
          proposalVersion: formData.proposalVersion
        });
      } else {
        result = await crmApi.storeDocument({
          fileName: formData.fileName,
          content: base64Content,
          mimeType: mimeType,
          folderName: formData.folderName,
          opportunityId: opportunityId || null,
          accountId: accountId || null
        });
      }

      if (result.status === 'success') {
        success('Document stored successfully in Google Drive and linked in CRM!');
        onSuccess();
      } else {
        error('Error: ' + result.message);
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      error('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
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
      zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Upload Document</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Document Type
            </label>
            <select
              value={formData.fileType}
              onChange={(e) => setFormData({ ...formData, fileType: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="general">General Document</option>
              <option value="proposal">Proposal</option>
            </select>
          </div>

          {formData.fileType === 'proposal' && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Proposal Version
              </label>
              <input
                type="text"
                value={formData.proposalVersion}
                onChange={(e) => setFormData({ ...formData, proposalVersion: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
                placeholder="1.0"
              />
            </div>
          )}

          {formData.fileType === 'general' && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Folder Name
              </label>
              <input
                type="text"
                value={formData.folderName}
                onChange={(e) => setFormData({ ...formData, folderName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
                placeholder="CRM Documents"
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Select File *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            {formData.fileName && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                Selected: {formData.fileName}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{
              padding: '10px 20px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !formData.fileContent}
            style={{
              padding: '10px 20px',
              background: (uploading || !formData.fileContent) ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (uploading || !formData.fileContent) ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
};

