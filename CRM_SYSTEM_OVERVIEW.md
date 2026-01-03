# CRM System Overview - Complete Documentation

## 📋 Table of Contents
1. [Database Tables & Structure](#database-tables--structure)
2. [Table Relationships](#table-relationships)
3. [System Flow & User Journey](#system-flow--user-journey)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Sales Pipeline Stages](#sales-pipeline-stages)
6. [API Endpoints & Data Flow](#api-endpoints--data-flow)
7. [Key Features](#key-features)

---

## 🗄️ Database Tables & Structure

**Database Backend**: Google Sheets  
**Database Link**: [crm_db Google Sheet](https://docs.google.com/spreadsheets/d/1BH5nnbbCOn7EYTX4Uc1aOyd0bcLV0NvZOE6lpqtPxDs/edit?usp=sharing)

The CRM system uses **Google Sheets** as the database backend with the following 6 main tables (sheets):

### 1. **Users Table**
**Purpose**: Stores user authentication and role information

**Key Fields** (inferred from system usage):
- `User ID` or `id` - Unique user identifier
- `Name` - User's full name
- `Email` - Login email (unique)
- `Role` - User role (Sales Rep, Data Specialist, Ops/Management, Exec)
- `Created Date` - Account creation timestamp (if exists)
- Additional user metadata fields

**Note**: Password is stored separately in Passwords table (linked via Email or User ID)

**Relationships**:
- One-to-One with Passwords (via `Email` or `User ID`)
- One-to-Many with Accounts (via `Owner`)
- One-to-Many with Opportunities (via `Assigned Rep`)
- One-to-Many with Tasks (via `Owner`)

---

### 2. **Passwords Table**
**Purpose**: Stores user authentication credentials separately for security

**Complete Column List**:
- `User ID` - Unique user identifier (references Users table)
- `Email` - User email (unique, references Users.Email)
- `Password Hash` - Hashed password for authentication

**Relationships**:
- One-to-One with Users (via `Email` or `User ID`)

---

### 3. **Accounts Table**
**Purpose**: Stores company/account information

**Complete Column List**:
- `Account ID` - Unique account identifier (e.g., ACC-001, ACC-002)
- `Company Name` - Company or organization name
- `Territory` - Geographic territory (North, South, East, West)
- `Product Interest` - Products of interest (Windows, Doors, Panels, etc.)
- `Lead Source` - Source of lead (Website, Referral, Trade Show, Cold Call, Partner)
- `Notes` - Additional account notes and information
- `Lifecycle Status` - Account status (Customer, Prospect, etc.)
- `Owner` - Assigned sales rep (references Users.Name)

**Relationships**:
- One-to-Many with Contacts (via `Account ID`)
- One-to-Many with Opportunities (via `Account ID`)
- Many-to-One with Users (via `Owner`)

---

### 4. **Contacts Table**
**Purpose**: Stores contact person information

**Complete Column List**:
- `Contact ID` - Unique contact identifier
- `Account ID` - Linked account (references Accounts.Account ID)
- `Full Name` - Full name of contact person
- `Email` - Contact email address
- `Phone` - Contact phone number
- `Buying Role` - Contact's role in buying process (Decision Maker, Influencer, etc.)
- `Is Billing Contact` - Boolean flag indicating if this is the billing contact
- `Notes` - Additional contact notes and information

**Relationships**:
- Many-to-One with Accounts (via `Account ID`)

---

### 5. **Opportunities Table** (Main Deals/Leads Table)
**Purpose**: Central table storing all sales opportunities/deals

**Complete Column List** (All fields stored in single table - not normalized by stage):

**Core/Identification Fields**:
- `Opportunity ID` - Unique opportunity identifier
- `Opportunity Name` - Opportunity/deal name
- `Account ID` - Linked account (references Accounts.Account ID)
- `Stage` - Current pipeline stage (9 possible stages)
- `Forecast Probability` - Win probability (0.0 to 1.0, typically 0-1)
- `Assigned Rep` - Assigned sales rep (references Users.Name)
- `Created Date` - Record creation date

**New Lead Stage Fields**:
- `Contact Name` - Primary contact person
- `Email or Phone` - Contact information
- `Territory` - Geographic territory (North, South, East, West)
- `Lead Source` - Source of lead (Website, Referral, Trade Show, etc.)

**Contact Made Stage Fields**:
- `Validated Contact Info` - Confirmed email or phone
- `Interest Type` - Product interest (Windows, Doors, Panels, etc.)
- `First Contact Notes` - Notes from initial contact

**Discovery Completed Stage Fields**:
- `Project Type` - Commercial, Residential, etc.
- `Scope` - Project scope (Units / Sqft / Counts)
- `Timeline` - Project timeline
- `Competitors` - Known competitors
- `Discovery Notes` - Discovery findings
- `Buying Role` - Decision Maker, Influencer, etc. (also used in other stages)

**Qualified Opportunity Stage Fields**:
- `Qualification Score` - Score from 1-10
- `Estimated Revenue` - Dollar amount
- `Project Address` - Site location
- `Required Product Categories` - Windows, Doors, etc.
- `Link to Plans` - Google Drive URL or similar

**Proposal Sent Stage Fields**:
- `Proposal Amount` - Dollar amount
- `Proposal Version` - Version number (v1.0, etc.)
- `Proposal Date` - Date proposal was sent
- `Decision Date` - Expected decision date
- `Next Meeting` - Next meeting date

**Negotiation / Decision Stage Fields**:
- `Updated Quote` - Updated dollar amount
- `Objections` - Customer concerns
- `Negotiation Notes` - Discussion points
- `Decision Maker` - Decision maker's full name

**Verbal Win Stage Fields**:
- `Expected Close Date` - Expected closing date
- `Final Deal Value` - Final dollar amount
- `Handoff Notes` - Deployment/transition notes
- `Delivery Timing` - Timeline requirements

**Closed Won Stage Fields**:
- `Final Deal Value` - Final dollar amount (shared with Verbal Win)
- `Final Margin` - Final margin percentage
- `Billing Contact Info` - Billing contact details
- `Handoff Notes` - Final transition details (shared with Verbal Win)

**Closed Lost Stage Fields**:
- `Reason Lost` - Loss reason (Price, Competitor, Timing, etc.)
- `Next Outreach` - Notes for future opportunities

**Note**: All fields are stored in a single wide table. Fields are populated as the opportunity progresses through stages, but all columns exist for all records.

**Relationships**:
- Many-to-One with Accounts (via `Account ID`)
- Many-to-One with Users (via `Assigned Rep`)
- One-to-Many with Tasks (via `Related Opportunity ID`)

---

### 6. **Tasks Table**
**Purpose**: Tracks tasks and activities related to opportunities and accounts

**Complete Column List**:
- `Task ID` - Unique task identifier
- `Subject` - Task subject/description
- `Due Date` - Task due date
- `Owner` - Task owner/assigned user (references Users.Name)
- `Priority` - Task priority level
- `Status` - Task status (Pending, In Progress, Completed, etc.)
- `Notes` - Task notes and details
- `Related Opportunity ID` - Linked opportunity (references Opportunities.Opportunity ID, nullable)
- `Related Account ID` - Linked account (references Accounts.Account ID, nullable)

**Relationships**:
- Many-to-One with Opportunities (via `Related Opportunity ID`, optional)
- Many-to-One with Accounts (via `Related Account ID`, optional)
- Many-to-One with Users (via `Owner`)

---

## 🔗 Table Relationships

```
Users (1) ──────< (1) Passwords
   │
   │ (1)
   │
   ├───< (Many) Accounts
   │
   ├───< (Many) Opportunities
   │
   └───< (Many) Tasks

Accounts (1) ────< (Many) Contacts
   │
   │ (1)
   │
   └───< (Many) Opportunities

Opportunities (1) ────< (Many) Tasks
```

**Relationship Details**:

1. **Users ↔ Passwords** (One-to-One)
   - Each user has one password record
   - Foreign Key: `Passwords.Email` → `Users.Email`

2. **Users ↔ Accounts** (One-to-Many)
   - One user can own multiple accounts
   - Each account has one owner
   - Foreign Key: `Accounts.Owner` → `Users.Name`

3. **Users ↔ Opportunities** (One-to-Many)
   - One user can own multiple opportunities
   - Each opportunity has one owner (can be null/unassigned)
   - Foreign Key: `Opportunities.owner` → `Users.Name`

4. **Users ↔ Tasks** (One-to-Many)
   - One user can be assigned multiple tasks
   - Each task has one assigned user
   - Foreign Key: `Tasks.Assigned To` → `Users.Name`

5. **Accounts ↔ Contacts** (One-to-Many)
   - One account can have multiple contacts
   - Each contact belongs to one account
   - Foreign Key: `Contacts.Account ID` → `Accounts.Account ID`

6. **Accounts ↔ Opportunities** (One-to-Many)
   - One account can have multiple opportunities
   - Each opportunity belongs to one account
   - Foreign Key: `Opportunities.Account ID` → `Accounts.Account ID`

7. **Opportunities ↔ Tasks** (One-to-Many, Optional)
   - One opportunity can have multiple tasks
   - Each task can belong to one opportunity (optional - tasks can also be account-level)
   - Foreign Key: `Tasks.Related Opportunity ID` → `Opportunities.Opportunity ID`

8. **Accounts ↔ Tasks** (One-to-Many, Optional)
   - One account can have multiple tasks
   - Each task can belong to one account (optional - tasks can also be opportunity-level)
   - Foreign Key: `Tasks.Related Account ID` → `Accounts.Account ID`

9. **Opportunities ↔ Stages** (Many-to-One)
   - Multiple opportunities can be in the same stage
   - Each opportunity has one current stage
   - Stage is stored as a string field in Opportunities table

---

## 🔄 System Flow & User Journey

### **Authentication Flow**

1. **User Registration/Login**:
   ```
   User → Login/Register Page → API Call → Backend Authentication
   → Token Generation → Store in localStorage → Redirect to Dashboard
   ```

2. **Session Management**:
   - Token stored in `localStorage` as `crm_token`
   - User data stored as `crm_user` (JSON)
   - Token verified on app load
   - Auto-logout if token invalid

### **Dashboard Flow**

1. **Load Dashboard**:
   ```
   User → Dashboard → Fetch Opportunities (getOpportunities API)
   → Fetch Metadata/Stages (getMeta API) → Display Kanban Board
   ```

2. **View Opportunities**:
   - Opportunities filtered by user role
   - Grouped by stage in Kanban columns
   - Each deal card shows: Name, Revenue, Owner, Probability, Timeline

3. **View Deal Details**:
   ```
   Click Deal Card → DealDetailsModal Opens
   → Shows all stage-specific fields for current stage
   → Displays historical data from previous stages
   ```

4. **Move Deal Through Pipeline**:
   ```
   Click "Move" Button → StageMoveModal Opens
   → Select New Stage → Fill Required Fields
   → Validate Stage Progression → Submit (updateStage API)
   → Refresh Opportunities → Update Kanban Board
   ```

### **Data Entry Flow**

1. **New Lead Creation**:
   - Data Specialist or Sales Rep creates opportunity
   - Starts at "New Lead" stage
   - Required fields: Company Name, Contact Name, Email/Phone, Territory, Lead Source

2. **Stage Progression**:
   - Each stage has required fields
   - Cannot skip stages forward (must go sequentially)
   - Can move backward (reopening deals)
   - Can jump to Closed Won/Lost from any active stage

3. **Field Collection**:
   - Fields collected progressively as deal moves through stages
   - Previous stage data preserved
   - New fields added when moving to new stage

### **Task Management Flow**

1. **View Tasks**:
   ```
   Deal Card → Fetch Tasks (getTasksForOpportunity API)
   → Display timeline based on task due dates
   → Show countdown/overdue indicators
   ```

2. **Task Timeline**:
   - Tasks prioritized over opportunity dates
   - Shows nearest due date
   - Live countdown for dates < 24 hours away
   - Overdue indicators for past dates

---

## 👥 User Roles & Permissions

### **1. Exec (Executive)**
**Access Level**: Read-Only

**Permissions**:
- ✅ `view_all` - View all opportunities across organization
- ✅ `view_analytics` - Access analytics dashboards
- ✅ `export_data` - Export data for reporting

**Restrictions**:
- ❌ Cannot edit any deals
- ❌ Cannot move deals between stages
- ❌ Read-only access to all data

**Use Case**: Executive reporting and oversight

---

### **2. Ops/Management**
**Access Level**: Full Administrative

**Permissions**:
- ✅ `view_all` - Full visibility across organization
- ✅ `edit_all` - Edit any deal regardless of owner
- ✅ `override_deals` - Override/approve deal changes
- ✅ `view_analytics` - Access analytics
- ✅ `manage_tasks` - Create and manage tasks

**Restrictions**:
- None - Full system access

**Use Case**: Operations management, deal oversight, task management

---

### **3. Data Specialist**
**Access Level**: Limited Editing

**Permissions**:
- ✅ `view_all` - View all opportunities
- ✅ `edit_contacts` - Create/edit contacts
- ✅ `edit_accounts` - Create/edit accounts
- ✅ `edit_markets` - Create/edit markets
- ✅ `move_to_new_lead` - Can move to New Lead stage
- ✅ `move_to_contact_made` - Can move to Contact Made stage

**Restrictions**:
- ❌ Cannot move deals past "Contact Made" stage
- ❌ Cannot mark deals as Closed Won/Lost
- ❌ Cannot edit deals in advanced stages (Discovery Completed and beyond)

**Use Case**: Lead qualification, initial data entry, contact management

---

### **4. Sales Rep**
**Access Level**: Own Deals Only

**Permissions**:
- ✅ `view_own` - View only own deals (cannot see other reps' deals)
- ✅ `edit_own` - Full CRUD on own deals
- ✅ `create_opportunities` - Create new opportunities
- ✅ `move_deals` - Move deals through all pipeline stages
- ✅ `edit_contacts` - Full CRUD on contacts
- ✅ `edit_accounts` - Full CRUD on accounts
- ✅ `edit_leads` - Full CRUD on leads

**Restrictions**:
- ❌ Cannot view or edit other sales reps' deals
- ❌ Cannot modify system settings

**Use Case**: Sales representatives managing their own pipeline

---

## 📊 Sales Pipeline Stages

The CRM uses a **9-stage sales pipeline**:

### **Stage Flow**:
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

### **Stage Details**:

#### **1. New Lead**
- **Purpose**: Initial lead entry
- **Required Fields**: Company Name, Contact Name, Email/Phone, Territory, Lead Source
- **Probability**: ~10-20%
- **Who Can Move**: Data Specialist, Sales Rep, Ops/Management

#### **2. Contact Made**
- **Purpose**: Initial contact established
- **Required Fields**: Validated Contact Info, Interest Type, First Contact Notes
- **Probability**: ~20-30%
- **Who Can Move**: Data Specialist (max), Sales Rep, Ops/Management

#### **3. Discovery Completed**
- **Purpose**: Needs and requirements discovered
- **Required Fields**: Project Type, Scope, Timeline, Buying Role, Competitors, Discovery Notes
- **Probability**: ~30-40%
- **Who Can Move**: Sales Rep, Ops/Management (Data Specialist cannot move here)

#### **4. Qualified Opportunity**
- **Purpose**: Deal qualified and validated
- **Required Fields**: Qualification Score, Estimated Revenue, Project Address, Product Categories, Link to Plans
- **Probability**: ~40-50%
- **Who Can Move**: Sales Rep, Ops/Management

#### **5. Proposal Sent**
- **Purpose**: Proposal submitted to customer
- **Required Fields**: Proposal Amount, Proposal Version, Proposal Date, Decision Date, Next Meeting
- **Probability**: ~50-60%
- **Who Can Move**: Sales Rep, Ops/Management

#### **6. Negotiation / Decision**
- **Purpose**: Active negotiation phase
- **Required Fields**: Updated Quote, Objections, Negotiation Notes, Decision Maker
- **Probability**: ~60-70%
- **Who Can Move**: Sales Rep, Ops/Management

#### **7. Verbal Win**
- **Purpose**: Verbal commitment received
- **Required Fields**: Expected Close Date, Final Deal Value, Handoff Notes, Delivery Timing
- **Probability**: ~80-90%
- **Who Can Move**: Sales Rep, Ops/Management

#### **8. Closed Won**
- **Purpose**: Deal successfully closed
- **Required Fields**: Final Deal Value, Final Margin, Billing Contact Info, Handoff Notes
- **Probability**: 100%
- **Who Can Move**: Sales Rep, Ops/Management (Data Specialist cannot)

#### **9. Closed Lost**
- **Purpose**: Deal lost to competitor or other reason
- **Required Fields**: Reason Lost, Winning Competitor, Next Outreach
- **Probability**: 0%
- **Who Can Move**: Sales Rep, Ops/Management (Data Specialist cannot)

### **Stage Progression Rules**:

1. **Forward Movement**: Can only move forward one stage at a time (cannot skip stages)
2. **Backward Movement**: Can move backward to reopen deals
3. **Closed Stages**: Can jump to Closed Won/Lost from any active stage
4. **Closed Stage Movement**: Can switch between Closed Won and Closed Lost, but cannot move back to active stages

---

## 🔌 API Endpoints & Data Flow

### **API Base Structure**:
- Single endpoint with `action` parameter
- Token-based authentication
- CORS-enabled for cross-origin requests

### **Endpoints**:

#### **1. Authentication Endpoints**

**Login**:
```
POST /api
Body: {
  action: "login",
  email: string,
  password: string
}
Response: {
  status: "success" | "error",
  data: {
    user: { Name, Email, Role },
    token: string
  }
}
```

**Register**:
```
POST /api
Body: {
  action: "register",
  name: string,
  email: string,
  password: string,
  role: "Sales Rep" | "Data Specialist" | "Ops/Management" | "Exec"
}
Response: {
  status: "success" | "error",
  data: {
    user: { Name, Email, Role },
    token: string
  }
}
```

**Verify Token**:
```
GET /api?action=verifyToken&token={token}
Response: {
  status: "success" | "error",
  data: { user: {...} }
}
```

#### **2. Opportunities Endpoints**

**Get Opportunities**:
```
GET /api?action=getOpportunities&token={token}
Response: {
  status: "success" | "error",
  data: [Opportunity objects]
}
```

**Update Stage**:
```
POST /api
Body: {
  action: "updateStage",
  id: opportunityId,
  stage: "New Stage",
  field1: value1,
  field2: value2,
  ... (all required fields for new stage),
  token: string
}
Response: {
  status: "success" | "error",
  message: string
}
```

#### **3. Metadata Endpoints**

**Get Metadata**:
```
GET /api?action=getMeta&token={token}
Response: {
  status: "success" | "error",
  data: { stages, configurations }
}
```

#### **4. Tasks Endpoints**

**Get Tasks for Opportunity**:
```
GET /api?action=getTasks&opportunityId={id}&token={token}
Response: {
  status: "success" | "error",
  data: [Task objects]
}
```

### **Data Flow Diagram**:

```
Frontend (React)
    │
    ├─→ API Calls (api.js)
    │       │
    │       ├─→ Authentication (login, register, verifyToken)
    │       ├─→ Opportunities (getOpportunities, updateStage)
    │       ├─→ Metadata (getMeta)
    │       └─→ Tasks (getTasksForOpportunity)
    │
    └─→ State Management
            │
            ├─→ AuthContext (User state, permissions)
            ├─→ KanbanBoard (Opportunities state)
            └─→ Components (Local state)
```

---

## ✨ Key Features

### **1. Kanban Board View**
- Visual pipeline representation
- Drag-and-drop ready (UI prepared)
- Stage-based grouping
- Deal count per stage
- Real-time updates

### **2. Deal Cards**
- Compact deal information
- Revenue display
- Probability indicator (color-coded)
- Owner information
- Timeline countdown (tasks + opportunity dates)
- Quick actions (View Details, Move)

### **3. Deal Details Modal**
- Comprehensive deal information
- Stage-specific field grouping
- Historical data preservation
- Formatted currency and dates
- Responsive design

### **4. Stage Movement Modal**
- Stage selection dropdown
- Dynamic required fields
- Form validation
- Stage progression validation
- Role-based restrictions

### **5. Timeline Management**
- Task due date tracking
- Opportunity date tracking
- Live countdown (< 24 hours)
- Overdue indicators
- Priority-based display (tasks > opportunities)

### **6. Role-Based Access Control**
- Granular permissions
- Deal ownership filtering
- Stage movement restrictions
- View/edit permissions
- UI element visibility control

### **7. Data Export**
- Export functionality (ExportButton component)
- CSV/Excel export capability
- Filtered data export

### **8. Responsive Design**
- Mobile-friendly interface
- Modern UI with animations
- Gradient themes
- Smooth transitions

---

## 🔐 Security Features

1. **Token-Based Authentication**: JWT or similar token system
2. **Role-Based Access Control**: Permissions enforced at UI and API level
3. **CORS Protection**: Configured for secure cross-origin requests
4. **Session Management**: Token verification on app load
5. **Data Isolation**: Sales Reps can only see own deals

---

## 📈 Business Logic

### **Probability Calculation**:
- Probability tied to stage (implicit)
- Can be manually adjusted
- Used for forecasting

### **Revenue Tracking**:
- Estimated Revenue (Qualified Opportunity stage)
- Proposal Amount (Proposal Sent stage)
- Updated Quote (Negotiation stage)
- Final Deal Value (Verbal Win / Closed Won)

### **Deal Ownership**:
- Assigned via `owner` field
- Sales Reps restricted to own deals
- Ops/Management can override

### **Stage Validation**:
- Required fields enforced
- Stage progression rules enforced
- Role-based movement restrictions

---

## 🎯 Use Cases

### **Scenario 1: New Lead Entry (Data Specialist)**
1. Data Specialist logs in
2. Creates new opportunity at "New Lead" stage
3. Fills required fields (Company, Contact, Email/Phone, Territory, Lead Source)
4. Saves opportunity
5. Can move to "Contact Made" after validation

### **Scenario 2: Sales Rep Pipeline Management**
1. Sales Rep logs in
2. Views only own deals in Kanban board
3. Clicks on deal to view details
4. Moves deal to next stage (e.g., Discovery Completed)
5. Fills required fields for new stage
6. Deal progresses through pipeline
7. Eventually closes as Won or Lost

### **Scenario 3: Executive Reporting (Exec)**
1. Exec logs in
2. Views all deals across organization
3. Reviews pipeline health
4. Exports data for reporting
5. Cannot make changes (read-only)

### **Scenario 4: Operations Oversight (Ops/Management)**
1. Ops/Management logs in
2. Views all deals
3. Can edit any deal
4. Manages tasks across opportunities
5. Overrides deal changes if needed
6. Accesses analytics

---

## 📝 Notes for Client Presentation

### **Key Selling Points**:

1. **Flexible Pipeline**: 9-stage customizable pipeline with stage-specific fields
2. **Role-Based Security**: Granular permissions for different user types
3. **Progressive Data Collection**: Fields collected as deals progress
4. **Task Integration**: Tasks linked to opportunities with timeline tracking
5. **Real-Time Updates**: Live countdowns and status updates
6. **Data Preservation**: Historical data maintained across stage changes
7. **Export Capability**: Data export for reporting and analysis
8. **Modern UI**: Beautiful, responsive interface with smooth animations

### **Technical Highlights**:

- React-based frontend
- RESTful API architecture
- Token-based authentication
- CORS-enabled for flexibility
- Local storage for session management
- Real-time timeline calculations
- Form validation and error handling

---

## 🔄 Data Flow Summary

```
User Action
    ↓
Frontend Component
    ↓
API Call (api.js)
    ↓
Backend API (External)
    ↓
Database (Google Sheets/Apps Script)
    ↓
Response
    ↓
State Update
    ↓
UI Re-render
```

---

---

## 📝 Database Schema Notes

**Database Structure**: All tables are stored in Google Sheets with the following structure:

1. **Users** - User accounts and roles (columns inferred from system usage)
2. **Passwords** - Authentication credentials (User ID, Email, Password Hash)
3. **Accounts** - Company/account information (8 columns)
4. **Contacts** - Contact person information (8 columns)
5. **Opportunities** - All deals/leads with all stage fields in single wide table (45+ columns)
6. **Tasks** - Task management (9 columns)

**Key Design Notes**:
- Opportunities table uses a "wide table" design - all stage-specific fields exist as columns for all records
- Tasks can be linked to either Opportunities or Accounts (or both)
- Passwords are stored separately from Users for security
- All relationships use string-based foreign keys (Account ID, Opportunity ID, Email, etc.)

**Database Location**: [Google Sheets Database](https://docs.google.com/spreadsheets/d/1BH5nnbbCOn7EYTX4Uc1aOyd0bcLV0NvZOE6lpqtPxDs/edit?usp=sharing)

---

**Document Version**: 1.2  
**Last Updated**: Complete column lists for all 6 tables  
**System**: CRM Pipeline Management System  
**Database**: Google Sheets (6 tables, wide-table design for Opportunities)

