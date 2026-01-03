# CRM System - Quick Reference Guide for Client Presentations

## 🎯 System Overview

**What is it?** A Sales Pipeline Management CRM system that tracks deals from initial lead to closed won/lost.

**Core Purpose**: Manage sales opportunities through a structured 9-stage pipeline with role-based access control.

---

## 📊 Main Database Tables (6 Tables in Google Sheets)

### **1. Users Table**
- Stores: User accounts, roles, authentication
- Key Fields: User ID, Name, Email, Role, Created Date
- Roles: Sales Rep, Data Specialist, Ops/Management, Exec
- Relationships: Linked to Passwords (Email/User ID), Owns Accounts, Owns Opportunities, Assigned Tasks

### **2. Passwords Table**
- Stores: User authentication credentials (separate for security)
- Complete Columns: User ID, Email, Password Hash
- Relationships: One-to-One with Users (via Email or User ID)

### **3. Accounts Table**
- Stores: Company/account information
- Complete Columns: Account ID, Company Name, Territory, Product Interest, Lead Source, Notes, Lifecycle Status, Owner
- Relationships: Linked to Users (Owner), Has many Contacts, Has many Opportunities

### **4. Contacts Table**
- Stores: Contact person information
- Complete Columns: Contact ID, Account ID, Full Name, Email, Phone, Buying Role, Is Billing Contact, Notes
- Relationships: Belongs to Account (Account ID)

### **5. Opportunities Table** (Main Table - Wide Table Design)
- Stores: All deals/leads in the pipeline (all stage fields in single table)
- Core Columns: Opportunity ID, Opportunity Name, Account ID, Stage, Forecast Probability, Assigned Rep, Created Date
- Stage Fields (45+ columns total): All fields from all 9 stages stored as columns
  - New Lead: Contact Name, Email or Phone, Territory, Lead Source
  - Contact Made: Validated Contact Info, Interest Type, First Contact Notes
  - Discovery: Project Type, Scope, Timeline, Competitors, Discovery Notes, Buying Role
  - Qualified: Qualification Score, Estimated Revenue, Project Address, Required Product Categories, Link to Plans
  - Proposal: Proposal Amount, Proposal Version, Proposal Date, Decision Date, Next Meeting
  - Negotiation: Updated Quote, Objections, Negotiation Notes, Decision Maker
  - Verbal Win: Expected Close Date, Final Deal Value, Handoff Notes, Delivery Timing
  - Closed Won: Final Deal Value, Final Margin, Billing Contact Info, Handoff Notes
  - Closed Lost: Reason Lost, Next Outreach
- Relationships: Linked to Accounts (Account ID), Linked to Users (Assigned Rep), Has many Tasks

### **6. Tasks Table**
- Stores: Tasks and activities for opportunities/accounts
- Complete Columns: Task ID, Subject, Due Date, Owner, Priority, Status, Notes, Related Opportunity ID, Related Account ID
- Purpose: Track deadlines and activities (can be linked to Opportunity or Account)
- Relationships: Belongs to Opportunity (Related Opportunity ID, optional), Belongs to Account (Related Account ID, optional), Assigned to User (Owner)

---

## 🔗 Table Relationships

```
Users (1) ──────< (1) Passwords
   │
   ├───< (Many) Accounts (via Owner)
   ├───< (Many) Opportunities (via Assigned Rep)
   └───< (Many) Tasks (via Owner)

Accounts (1) ────< (Many) Contacts (via Account ID)
   │
   └───< (Many) Opportunities (via Account ID)

Opportunities (1) ────< (Many) Tasks (via Related Opportunity ID, optional)
Accounts (1) ────< (Many) Tasks (via Related Account ID, optional)
```

**Simple Explanation**:
- One User has one Password (via Email/User ID)
- One User can own many Accounts and Opportunities
- One Account can have many Contacts and Opportunities
- One Opportunity can have many Tasks (optional - tasks can also be account-level)
- One Account can have many Tasks (optional - tasks can also be opportunity-level)
- Each Opportunity belongs to one Account and one User (Assigned Rep)
- Each Task belongs to one User (Owner) and optionally to one Opportunity or Account

---

## 🔄 System Flow (Simple)

### **1. User Login**
```
Login → Verify Credentials → Get Token → Access Dashboard
```

### **2. View Pipeline**
```
Dashboard → Fetch All Opportunities → Group by Stage → Display Kanban Board
```

### **3. Move Deal Forward**
```
Click "Move" → Select New Stage → Fill Required Fields → Save → Deal Moves to New Stage
```

### **4. View Deal Details**
```
Click Deal Card → Modal Opens → Shows All Deal Information → Organized by Stage
```

---

## 👥 User Roles (Quick Reference)

| Role | Can View | Can Edit | Can Move Deals | Special Permissions |
|------|----------|----------|----------------|---------------------|
| **Exec** | All Deals | ❌ None | ❌ None | Export Data, View Analytics |
| **Ops/Management** | All Deals | ✅ All Deals | ✅ All Stages | Manage Tasks, Override Deals |
| **Data Specialist** | All Deals | ✅ Early Stages Only | ✅ Only to "Contact Made" | Edit Contacts/Accounts |
| **Sales Rep** | Own Deals Only | ✅ Own Deals Only | ✅ All Stages | Create Opportunities |

---

## 📈 Sales Pipeline Stages (9 Stages)

```
1. New Lead
   ↓
2. Contact Made
   ↓
3. Discovery Completed
   ↓
4. Qualified Opportunity
   ↓
5. Proposal Sent
   ↓
6. Negotiation / Decision
   ↓
7. Verbal Win
   ↓
8. Closed Won ────┐
                  │
9. Closed Lost ───┘
```

### **Stage Rules**:
- ✅ Can move forward **one stage at a time** (no skipping)
- ✅ Can move **backward** (reopen deals)
- ✅ Can jump to **Closed Won/Lost** from any stage
- ❌ Cannot skip stages forward

---

## 📋 Required Fields by Stage

### **New Lead**
- Company Name, Contact Name, Email/Phone, Territory, Lead Source

### **Contact Made**
- Validated Contact Info, Interest Type, First Contact Notes

### **Discovery Completed**
- Project Type, Scope, Timeline, Buying Role, Competitors, Discovery Notes

### **Qualified Opportunity**
- Qualification Score, Estimated Revenue, Project Address, Product Categories, Link to Plans

### **Proposal Sent**
- Proposal Amount, Proposal Version, Proposal Date, Decision Date, Next Meeting

### **Negotiation / Decision**
- Updated Quote, Objections, Negotiation Notes, Decision Maker

### **Verbal Win**
- Expected Close Date, Final Deal Value, Handoff Notes, Delivery Timing

### **Closed Won**
- Final Deal Value, Final Margin, Billing Contact Info, Handoff Notes

### **Closed Lost**
- Reason Lost, Winning Competitor, Next Outreach

---

## 🔌 API Endpoints (Summary)

| Action | Method | Purpose |
|--------|--------|---------|
| `login` | POST | User authentication |
| `register` | POST | Create new user account |
| `verifyToken` | GET | Validate user session |
| `getOpportunities` | GET | Fetch all opportunities |
| `updateStage` | POST | Move deal to new stage |
| `getMeta` | GET | Get stage definitions |
| `getTasks` | GET | Get tasks for opportunity |

---

## ✨ Key Features

1. **Kanban Board**: Visual pipeline with stage columns
2. **Deal Cards**: Quick view of deal info (revenue, probability, owner, timeline)
3. **Deal Details**: Comprehensive view of all deal information
4. **Stage Movement**: Move deals with required field validation
5. **Timeline Tracking**: Task due dates with countdown timers
6. **Role-Based Access**: Different permissions for different users
7. **Data Export**: Export opportunities to CSV/Excel
8. **Real-Time Updates**: Live countdowns and status indicators

---

## 🎯 Common Use Cases

### **Use Case 1: Data Specialist Enters New Lead**
1. Logs in as Data Specialist
2. Creates new opportunity
3. Fills "New Lead" fields
4. Moves to "Contact Made" after validation
5. Cannot move past "Contact Made"

### **Use Case 2: Sales Rep Manages Pipeline**
1. Logs in as Sales Rep
2. Sees only own deals
3. Moves deals through stages
4. Fills required fields at each stage
5. Closes deals as Won or Lost

### **Use Case 3: Executive Reviews Performance**
1. Logs in as Exec
2. Views all deals (read-only)
3. Reviews pipeline health
4. Exports data for reporting
5. Cannot make changes

### **Use Case 4: Operations Oversees Everything**
1. Logs in as Ops/Management
2. Views all deals
3. Can edit any deal
4. Manages tasks
5. Overrides changes if needed

---

## 🔐 Security & Permissions

- **Token-Based Auth**: Secure login system
- **Role-Based Access**: Different users see/edit different data
- **Deal Ownership**: Sales Reps only see own deals
- **Stage Restrictions**: Data Specialists limited to early stages
- **Read-Only Roles**: Exec role is view-only

---

## 📊 Data Flow (Simple)

```
User Action
    ↓
Frontend (React)
    ↓
API Call
    ↓
Backend (External API)
    ↓
Database
    ↓
Response
    ↓
UI Update
```

---

## 💡 Key Selling Points for Clients

1. **Structured Pipeline**: 9 clear stages from lead to close
2. **Progressive Data Collection**: Fields collected as deals progress
3. **Role-Based Security**: Right people see right data
4. **Task Integration**: Track deadlines and activities
5. **Real-Time Tracking**: Live countdowns and status updates
6. **Data Preservation**: Historical data never lost
7. **Export Capability**: Easy reporting and analysis
8. **Modern Interface**: Beautiful, easy-to-use design

---

## 📝 Quick Answers to Common Questions

**Q: How many stages are there?**  
A: 9 stages from New Lead to Closed Won/Lost

**Q: Can users skip stages?**  
A: No, must move one stage at a time forward, but can move backward

**Q: Who can see all deals?**  
A: Exec, Ops/Management, and Data Specialist (but with different edit permissions)

**Q: Can Sales Reps see other reps' deals?**  
A: No, Sales Reps only see their own deals

**Q: What happens to old data when moving stages?**  
A: All previous stage data is preserved and visible in deal details

**Q: How are tasks tracked?**  
A: Tasks are linked to opportunities and show timeline countdowns on deal cards

**Q: Can deals be reopened?**  
A: Yes, can move backward to any previous stage

**Q: What's the difference between Closed Won and Closed Lost?**  
A: Closed Won = successful sale, Closed Lost = deal lost to competitor/other reason

---

---

## 📋 Complete Column Reference

### **Passwords Table** (3 columns)
User ID | Email | Password Hash

### **Accounts Table** (8 columns)
Account ID | Company Name | Territory | Product Interest | Lead Source | Notes | Lifecycle Status | Owner

### **Contacts Table** (8 columns)
Contact ID | Account ID | Full Name | Email | Phone | Buying Role | Is Billing Contact | Notes

### **Opportunities Table** (45+ columns)
**Core**: Opportunity ID | Opportunity Name | Account ID | Stage | Forecast Probability | Assigned Rep | Created Date  
**All Stage Fields**: Project Type | Scope | Timeline | Competitors | Discovery Notes | Qualification Score | Estimated Revenue | Project Address | Required Product Categories | Link to Plans | Proposal Amount | Proposal Version | Proposal Date | Decision Date | Next Meeting | Updated Quote | Objections | Negotiation Notes | Decision Maker | Expected Close Date | Final Deal Value | Final Margin | Handoff Notes | Delivery Timing | Reason Lost | Next Outreach | Contact Name | Email or Phone | Territory | Lead Source | Validated Contact Info | Interest Type | First Contact Notes | Buying Role | Billing Contact Info

### **Tasks Table** (9 columns)
Task ID | Subject | Due Date | Owner | Priority | Status | Notes | Related Opportunity ID | Related Account ID

---

**Quick Reference Version**: 1.1  
**Last Updated**: Complete column lists for all tables  
**For**: Client Presentations & Quick Explanations

