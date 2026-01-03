# SLA Enforcement, Status Stagnation Alerts & Integrations Setup Guide

## Overview

This document explains how to set up and use the new features:
1. **SLA Enforcement** - Automatic reminders for overdue tasks
2. **Status Stagnation Alerts** - Alerts for opportunities stuck in Discovery or Negotiation stages
3. **Gmail Integration** - Send emails and track in CRM
4. **Google Calendar Integration** - Log meetings and reminders
5. **Google Drive Integration** - Store documents and proposals

---

## 1. SLA Enforcement

### Features
- **Overdue Task Detection**: Automatically identifies tasks past their due date
- **Reminder Emails**: Sends daily reminders to task owners
- **AJ Notifications**: Notifies AJ (management) when tasks are overdue for more than 3 days
- **Dashboard Flags**: Overdue tasks are flagged in the dashboard

### Configuration

1. **Update AJ Email** (in `backend_code.gs`):
   ```javascript
   const AJ_EMAIL = "aj@yourcompany.com"; // Update with actual AJ email
   ```

2. **Set Up Scheduled Trigger**:
   - Open Google Apps Script editor
   - Go to Triggers (clock icon in left sidebar)
   - Click "+ Add Trigger"
   - Select function: `runScheduledAlerts`
   - Event source: Time-driven
   - Type: Day timer
   - Time: Select preferred time (e.g., 9:00 AM)
   - Click Save

### How It Works

- Runs daily at the scheduled time
- Checks all tasks with status != "Completed"
- Sends reminder emails to task owners (once per day)
- Tracks reminder count and last reminder sent date
- Notifies AJ if tasks are overdue > 3 days

### Manual Execution

You can manually trigger SLA checks:
```javascript
// In Apps Script editor, run:
checkOverdueTasks()
```

---

## 2. Status Stagnation Alerts

### Features
- **Discovery Stage**: Alerts if no update for 7 days
- **Negotiation Stage**: Alerts if no update for 10 days
- **Automatic Emails**: Sends alerts to opportunity owners
- **Dashboard Display**: Shows stagnation alerts in dashboard

### How It Works

- Checks opportunities in "Discovery Completed" and "Negotiation / Decision" stages
- Compares `Last Updated` date (or `Created Date` if Last Updated is missing)
- Sends alert email if threshold exceeded
- Displays alerts in dashboard banner

### Updating Last Updated Date

The `Last Updated` field is automatically updated when:
- Opportunity stage is changed
- Opportunity fields are updated via `updateStage` API

To manually update:
1. Edit the opportunity in the spreadsheet
2. Update the "Last Updated" column with current date

---

## 3. Gmail Integration

### Features
- Send emails directly from CRM
- Automatically track emails as tasks in CRM
- Link emails to opportunities or accounts

### Usage

**Frontend API Call:**
```javascript
const result = await crmApi.sendGmailEmail({
  to: "customer@example.com",
  subject: "Follow-up on Proposal",
  body: "Email content here...",
  opportunityId: "OPP-001", // Optional
  accountId: "ACC-001" // Optional
});
```

**Backend Function:**
```javascript
sendGmailEmail(to, subject, body, opportunityId, accountId)
```

### What Happens

1. Email is sent via Gmail
2. A task is automatically created in CRM with:
   - Subject: "Email Sent: [subject]"
   - Status: "Completed"
   - Notes: Email content and recipient
   - Linked to opportunity/account if provided

---

## 4. Google Calendar Integration

### Features
- Create calendar events from CRM
- Automatically log meetings as tasks
- Link events to opportunities or accounts
- Send calendar invites to attendees

### Usage

**Frontend API Call:**
```javascript
const result = await crmApi.createCalendarEvent({
  title: "Customer Meeting",
  description: "Discuss proposal details",
  startTime: "2024-01-15T10:00:00",
  endTime: "2024-01-15T11:00:00",
  attendees: ["customer@example.com"],
  opportunityId: "OPP-001", // Optional
  accountId: "ACC-001" // Optional
});
```

### What Happens

1. Calendar event is created in default Google Calendar
2. Invites are sent to attendees
3. A task is automatically created in CRM with:
   - Subject: "Meeting: [title]"
   - Due Date: Meeting start time
   - Status: "Pending"
   - Priority: "High"
   - Notes: Event ID and description
   - Linked to opportunity/account if provided

---

## 5. Google Drive Integration

### Features
- Store documents in Google Drive
- Organize by folders (Proposals, CRM Documents, etc.)
- Automatically link documents to opportunities/accounts
- Store proposals with versioning

### Usage

**Store General Document:**
```javascript
const result = await crmApi.storeDocument({
  fileName: "Contract_2024.pdf",
  content: fileContent, // Base64 or text content
  mimeType: "application/pdf",
  folderName: "CRM Documents", // Optional, defaults to "CRM Documents"
  opportunityId: "OPP-001", // Optional
  accountId: "ACC-001" // Optional
});
```

**Store Proposal:**
```javascript
const result = await crmApi.storeProposal({
  proposalContent: pdfContent, // Base64 PDF content
  opportunityId: "OPP-001",
  proposalVersion: "1.0" // Optional, defaults to "1.0"
});
```

### What Happens

1. Folder is created in Google Drive (if doesn't exist)
2. Document is stored in the folder
3. Link is added to:
   - Opportunity: "Link to Plans" field (for proposals) or Notes
   - Account: Notes field

### Folder Structure

- `CRM Documents/` - General documents
- `Proposals/` - Proposal documents (auto-created by `storeProposal`)

---

## API Endpoints

### Get Alerts
```
GET /api?action=getAlerts&token={token}
```
Returns all active alerts (overdue tasks, ongoing issues, stagnation alerts)

### Check Overdue Tasks
```
GET /api?action=checkOverdueTasks&token={token}
```
Manually trigger overdue task check

### Check Status Stagnation
```
GET /api?action=checkStatusStagnation&token={token}
```
Manually trigger stagnation check

### Send Gmail Email
```
POST /api
Body: {
  action: "sendGmailEmail",
  to: "email@example.com",
  subject: "Subject",
  body: "Email body",
  opportunityId: "OPP-001", // Optional
  accountId: "ACC-001", // Optional
  token: "token"
}
```

### Create Calendar Event
```
POST /api
Body: {
  action: "createCalendarEvent",
  title: "Meeting Title",
  description: "Description",
  startTime: "2024-01-15T10:00:00",
  endTime: "2024-01-15T11:00:00",
  attendees: ["email1@example.com", "email2@example.com"],
  opportunityId: "OPP-001", // Optional
  accountId: "ACC-001", // Optional
  token: "token"
}
```

### Store Document
```
POST /api
Body: {
  action: "storeDocument",
  fileName: "document.pdf",
  content: "file content",
  mimeType: "application/pdf",
  folderName: "CRM Documents", // Optional
  opportunityId: "OPP-001", // Optional
  accountId: "ACC-001", // Optional
  token: "token"
}
```

### Store Proposal
```
POST /api
Body: {
  action: "storeProposal",
  proposalContent: "PDF content",
  opportunityId: "OPP-001",
  proposalVersion: "1.0", // Optional
  token: "token"
}
```

---

## Dashboard Alerts Display

The dashboard now shows an alerts banner when there are:
- Overdue tasks
- Ongoing issues (overdue > 3 days)
- Status stagnation alerts

The banner appears at the top of the main content area and shows:
- Count of each alert type
- Summary of first 3 items
- Link to view more details

---

## Troubleshooting

### Emails Not Sending

1. Check Google Apps Script execution logs
2. Verify Gmail API is enabled in Google Cloud Console
3. Check that MailApp service is available
4. Verify user emails are correct in Users sheet

### Calendar Events Not Creating

1. Verify default calendar exists
2. Check calendar permissions
3. Ensure date format is correct (ISO 8601)

### Drive Documents Not Storing

1. Check Drive API is enabled
2. Verify folder permissions
3. Check file size limits

### Scheduled Triggers Not Running

1. Verify trigger is set up correctly
2. Check execution logs for errors
3. Ensure script has necessary permissions
4. Verify time zone settings

---

## Best Practices

1. **Scheduled Alerts**: Run daily in the morning (e.g., 9:00 AM) to catch issues early
2. **Email Tracking**: Always link emails to opportunities/accounts for better tracking
3. **Document Organization**: Use consistent folder naming for easy retrieval
4. **Proposal Versioning**: Always include version numbers in proposal filenames
5. **Calendar Events**: Set reminders in calendar events for important meetings

---

## Notes

- All integrations require appropriate Google API permissions
- Email sending uses MailApp service (no additional setup needed)
- Calendar uses default calendar (can be changed in code)
- Drive creates folders automatically if they don't exist
- All tracked activities create tasks in the Tasks sheet

---

## Support

For issues or questions:
1. Check execution logs in Apps Script editor
2. Review error messages in API responses
3. Verify all required fields are provided
4. Check Google API quotas and limits

