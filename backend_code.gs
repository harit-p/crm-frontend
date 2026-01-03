// ============================================================================
// CONFIGURATION
// ============================================================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId(); // Auto-detect
const OPPORTUNITIES_SHEET = "Opportunities";
const ACCOUNTS_SHEET = "Accounts";
const CONTACTS_SHEET = "Contacts";
const TASKS_SHEET = "Tasks";
const USERS_SHEET = "Users";
const PASSWORDS_SHEET = "Passwords"; // Hidden sheet for password storage

// ============================================================================
// CORS HANDLING
// ============================================================================

/**
 * Create a response with CORS headers
 * Note: Google Apps Script Web Apps handle CORS automatically when deployed
 * with "Who has access: Anyone". This function just returns the JSON response.
 */
function createCorsResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle OPTIONS request for CORS preflight
 * Note: Google Apps Script doesn't support custom headers, but CORS works
 * automatically when Web App is deployed with "Anyone" access.
 */
function doOptions() {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Generate a cryptographically secure random salt
 */
function generateSalt() {
  var saltLength = 32; // 32 bytes = 256 bits
  var saltBytes = [];
  
  // Generate random bytes
  for (var i = 0; i < saltLength; i++) {
    saltBytes.push(Math.floor(Math.random() * 256));
  }
  
  // Convert to hexadecimal string
  var saltHex = saltBytes.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
  
  return saltHex;
}

/**
 * Hash password with salt using SHA-256
 */
function hashPassword(password) {
  // Generate a random salt for each password
  var salt = generateSalt();
  
  // Combine password with salt
  var saltedPassword = password + salt;
  
  // Hash using SHA-256
  var hashBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    saltedPassword,
    Utilities.Charset.UTF_8
  );
  
  // Convert hash bytes to hexadecimal string
  var hashHex = hashBytes.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
  
  // Return salt and hash combined (salt:hash format for storage)
  return salt + ':' + hashHex;
}

/**
 * Verify password against stored hash
 */
function verifyPassword(password, storedHash) {
  try {
    // Split stored hash into salt and hash
    var parts = storedHash.split(':');
    if (parts.length !== 2) {
      return false; // Invalid format
    }
    
    var salt = parts[0];
    var storedHashValue = parts[1];
    
    // Hash the provided password with the stored salt
    var saltedPassword = password + salt;
    var hashBytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      saltedPassword,
      Utilities.Charset.UTF_8
    );
    
    // Convert to hexadecimal
    var hashHex = hashBytes.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
    
    // Compare hashes (constant-time comparison to prevent timing attacks)
    return constantTimeEquals(hashHex, storedHashValue);
  } catch (error) {
    Logger.log("Password verification error: " + error.toString());
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEquals(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  
  var result = 0;
  for (var i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Generate a simple token (base64 encoded JSON)
 */
function generateToken(userId, email) {
  var tokenData = {
    userId: userId,
    email: email,
    exp: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  var tokenString = JSON.stringify(tokenData);
  var encoded = Utilities.base64Encode(tokenString);
  return encoded;
}

/**
 * Verify token and return user info
 */
function verifyTokenAndGetUser(token) {
  try {
    if (!token) {
      return null;
    }
    
    // Decode token
    var decoded = Utilities.base64Decode(token);
    var tokenString = Utilities.newBlob(decoded).getDataAsString();
    var tokenData = JSON.parse(tokenString);
    
    // Verify token hasn't expired
    var now = new Date().getTime();
    if (tokenData.exp && tokenData.exp < now) {
      return null;
    }
    
    // Get user data
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var usersSheet = ss.getSheetByName(USERS_SHEET);
    
    if (!usersSheet) {
      return null;
    }
    
    var usersData = usersSheet.getDataRange().getValues();
    var headers = usersData[0];
    var idCol = headers.indexOf('User ID');
    var nameCol = headers.indexOf('Name');
    var emailCol = headers.indexOf('Email');
    var roleCol = headers.indexOf('Role');
    
    for (var i = 1; i < usersData.length; i++) {
      if (usersData[i][idCol] === tokenData.userId) {
        return {
          'User ID': usersData[i][idCol],
          'Name': usersData[i][nameCol],
          'Email': usersData[i][emailCol],
          'Role': usersData[i][roleCol]
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log("Token verification error: " + error.toString());
    return null;
  }
}

/**
 * Register a new user
 */
function handleRegister(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var usersSheet = ss.getSheetByName(USERS_SHEET);
    var passwordsSheet = ss.getSheetByName(PASSWORDS_SHEET);
    
    if (!usersSheet) {
      return { status: "error", message: "Users sheet not found" };
    }
    
    // Create Passwords sheet if it doesn't exist
    if (!passwordsSheet) {
      passwordsSheet = ss.insertSheet(PASSWORDS_SHEET);
      passwordsSheet.appendRow(['User ID', 'Email', 'Password Hash']);
      // Hide the sheet for security
      passwordsSheet.hideSheet();
    }
    
    var email = data.email;
    var password = data.password;
    var name = data.name;
    var role = data.role || 'Sales Rep';
    
    // Validate input
    if (!email || !password || !name) {
      return { status: "error", message: "Missing required fields" };
    }
    
    if (password.length < 6) {
      return { status: "error", message: "Password must be at least 6 characters" };
    }
    
    // Check if user already exists
    var usersData = usersSheet.getDataRange().getValues();
    var headers = usersData[0];
    var emailCol = headers.indexOf('Email');
    
    if (emailCol < 0) {
      return { status: "error", message: "Email column not found in Users sheet" };
    }
    
    for (var i = 1; i < usersData.length; i++) {
      if (usersData[i][emailCol] === email) {
        return { status: "error", message: "User with this email already exists" };
      }
    }
    
    // Generate User ID
    var userId = "USER-" + String(usersData.length).padStart(3, '0');
    
    // Create user record
    var userRow = [];
    headers.forEach(function(header) {
      if (header === 'User ID') {
        userRow.push(userId);
      } else if (header === 'Name') {
        userRow.push(name);
      } else if (header === 'Email') {
        userRow.push(email);
      } else if (header === 'Role') {
        userRow.push(role);
      } else {
        userRow.push('');
      }
    });
    
    usersSheet.appendRow(userRow);
    
    // Store password hash (includes salt automatically)
    var passwordHash = hashPassword(password);
    passwordsSheet.appendRow([userId, email, passwordHash]);
    
    // Generate token
    var token = generateToken(userId, email);
    
    // Return user data (without password)
    var user = {
      'User ID': userId,
      'Name': name,
      'Email': email,
      'Role': role
    };
    
    return {
      status: "success",
      data: {
        user: user,
        token: token
      }
    };
  } catch (error) {
    Logger.log("Register Error: " + error.toString());
    return { status: "error", message: "Registration failed: " + error.toString() };
  }
}

/**
 * Login user
 */
function handleLogin(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var usersSheet = ss.getSheetByName(USERS_SHEET);
    var passwordsSheet = ss.getSheetByName(PASSWORDS_SHEET);
    
    if (!usersSheet || !passwordsSheet) {
      return { status: "error", message: "Users or Passwords sheet not found" };
    }
    
    var email = data.email;
    var password = data.password;
    
    if (!email || !password) {
      return { status: "error", message: "Email and password are required" };
    }
    
    // Check password using secure verification
    var passwordsData = passwordsSheet.getDataRange().getValues();
    var userId = null;
    var passwordValid = false;
    
    // Find user by email and verify password
    for (var i = 1; i < passwordsData.length; i++) {
      if (passwordsData[i][1] === email) {
        var storedHash = passwordsData[i][2];
        passwordValid = verifyPassword(password, storedHash);
        if (passwordValid) {
          userId = passwordsData[i][0];
          break;
        }
      }
    }
    
    if (!userId || !passwordValid) {
      return { status: "error", message: "Invalid email or password" };
    }
    
    // Get user data
    var usersData = usersSheet.getDataRange().getValues();
    var headers = usersData[0];
    var idCol = headers.indexOf('User ID');
    var nameCol = headers.indexOf('Name');
    var emailCol = headers.indexOf('Email');
    var roleCol = headers.indexOf('Role');
    
    var user = null;
    for (var i = 1; i < usersData.length; i++) {
      if (usersData[i][idCol] === userId) {
        user = {
          'User ID': usersData[i][idCol],
          'Name': usersData[i][nameCol],
          'Email': usersData[i][emailCol],
          'Role': usersData[i][roleCol]
        };
        break;
      }
    }
    
    if (!user) {
      return { status: "error", message: "User not found" };
    }
    
    // Generate token
    var token = generateToken(userId, email);
    
    return {
      status: "success",
      data: {
        user: user,
        token: token
      }
    };
  } catch (error) {
    Logger.log("Login Error: " + error.toString());
    return { status: "error", message: "Login failed: " + error.toString() };
  }
}

/**
 * Verify token
 */
function handleVerifyToken(token) {
  try {
    if (!token) {
      return { status: "error", message: "Token is required" };
    }
    
    // Decode token (base64 decode)
    try {
      var decoded = Utilities.base64Decode(token);
      var tokenString = Utilities.newBlob(decoded).getDataAsString();
      var tokenData = JSON.parse(tokenString);
      
      // Verify token hasn't expired (24 hours)
      var now = new Date().getTime();
      if (tokenData.exp && tokenData.exp < now) {
        return { status: "error", message: "Token expired" };
      }
      
      // Get user data for verification
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var usersSheet = ss.getSheetByName(USERS_SHEET);
      
      if (usersSheet) {
        var usersData = usersSheet.getDataRange().getValues();
        var headers = usersData[0];
        var idCol = headers.indexOf('User ID');
        
        // Verify user still exists
        for (var i = 1; i < usersData.length; i++) {
          if (usersData[i][idCol] === tokenData.userId) {
            return { 
              status: "success", 
              data: { 
                valid: true,
                userId: tokenData.userId,
                email: tokenData.email
              } 
            };
          }
        }
      }
      
      return { status: "error", message: "User not found" };
    } catch (e) {
      Logger.log("Token decode error: " + e.toString());
      return { status: "error", message: "Invalid token" };
    }
  } catch (error) {
    Logger.log("Verify Token Error: " + error.toString());
    return { status: "error", message: "Token verification failed" };
  }
}

// ============================================================================
// STAGE CONFIGURATION
// ============================================================================

// Required fields per stage (from FRD)
const STAGE_REQUIRED_FIELDS = {
  'New Lead': ['Company Name', 'Contact Name', 'Email or Phone', 'Territory', 'Lead Source'],
  'Contact Made': ['Validated Contact Info', 'Interest Type', 'First Contact Notes'],
  'Discovery Completed': ['Project Type', 'Scope', 'Timeline', 'Buying Role', 'Competitors', 'Discovery Notes'],
  'Qualified Opportunity': ['Qualification Score', 'Estimated Revenue', 'Project Address', 'Required Product Categories', 'Link to Plans'],
  'Proposal Sent': ['Proposal Amount', 'Proposal Version', 'Proposal Date', 'Decision Date', 'Next Meeting'],
  'Negotiation / Decision': ['Updated Quote', 'Objections', 'Negotiation Notes', 'Decision Maker'],
  'Verbal Win': ['Expected Close Date', 'Final Deal Value', 'Handoff Notes', 'Delivery Timing'],
  'Closed Won': ['Final Deal Value', 'Final Margin', 'Billing Contact Info', 'Handoff Notes'],
  'Closed Lost': ['Reason Lost', 'Competitors', 'Next Outreach']
};

// Define stage order (must match frontend)
const STAGE_ORDER = [
  'New Lead',
  'Contact Made',
  'Discovery Completed',
  'Qualified Opportunity',
  'Proposal Sent',
  'Negotiation / Decision',
  'Verbal Win',
  'Closed Won',
  'Closed Lost'
];

// Forecast probability by stage (from FRD)
const STAGE_PROBABILITIES = {
  'New Lead': 0.1,
  'Contact Made': 0.15,
  'Discovery Completed': 0.2,
  'Qualified Opportunity': 0.4,
  'Proposal Sent': 0.6,
  'Negotiation / Decision': 0.8,
  'Verbal Win': 0.9,
  'Closed Won': 1.0,
  'Closed Lost': 0.0
};

// ============================================================================
// MAIN HANDLERS
// ============================================================================

function doGet(e) {
  // Handle case when called directly from editor
  if (!e) { 
    e = { parameter: {} }; 
  }
  
  var action = e.parameter.action;
  var result = {};
  
  try {
    if (action === "testCors") {
      // Test endpoint to verify CORS headers
      result = { 
        status: "success", 
        message: "CORS test successful",
        timestamp: new Date().toISOString()
      };
    } else if (action === "getOpportunities") {
      // Token can be passed as query parameter to avoid CORS preflight
      var token = e.parameter.token;
      // For now, we'll get opportunities without auth check (add later if needed)
      result = getOpportunitiesData();
    } else if (action === "getMeta") {
      // Token can be passed as query parameter to avoid CORS preflight
      var token = e.parameter.token;
      result = getMetaData();
    } else if (action === "getTasks") {
      result = getTasksForOpportunity(e.parameter.opportunityId);
    } else if (action === "getAllTasks") {
      result = getAllTasksData(e.parameter);
    } else if (action === "getAccounts") {
      result = getAccountsData();
    } else if (action === "getContacts") {
      result = getContactsData(e.parameter.accountId);
    } else if (action === "getUsers") {
      result = getUsersData();
    } else if (action === "verifyToken") {
      result = handleVerifyToken(e.parameter.token);
    } else if (action === "checkOverdueTasks") {
      result = checkOverdueTasks();
    } else if (action === "checkStatusStagnation") {
      result = checkStatusStagnation();
    } else if (action === "runScheduledAlerts") {
      result = runScheduledAlerts();
    } else if (action === "getAlerts") {
      // Get user info from token if provided
      var token = e.parameter.token;
      var userName = null;
      var userRole = null;
      
      if (token) {
        var userInfo = verifyTokenAndGetUser(token);
        if (userInfo) {
          userName = userInfo.Name;
          userRole = userInfo.Role;
        }
      }
      
      result = getAlertsData(userName, userRole);
    } else if (action === "getPipelineSummary") {
      result = getPipelineSummary();
    } else if (action === "getRevenueForecast") {
      result = getRevenueForecast();
    } else if (action === "getTopOpportunities") {
      var limit = e.parameter.limit ? parseInt(e.parameter.limit) : 10;
      result = getTopOpportunities(limit);
    } else if (action === "getTasksDueTodayOverdue") {
      result = getTasksDueTodayOverdue();
    } else if (action === "getLeadSourceEffectiveness") {
      result = getLeadSourceEffectiveness();
    } else if (action === "getRepPerformanceScorecard") {
      result = getRepPerformanceScorecard();
    } else if (action === "getProductCategoryDemand") {
      result = getProductCategoryDemand();
    } else if (action === "getAllReports") {
      result = getAllReportsData();
    } else {
      result = { status: "error", message: "Invalid Action" };
    }
  } catch (error) {
    Logger.log("doGet Error: " + error.toString());
    result = { status: "error", message: error.toString() };
  }
  
  // Return with CORS headers
  return createCorsResponse(result);
}

function doPost(e) {
  // Handle case when called directly from editor
  if (!e) {
    e = { postData: { contents: '{}' } };
  }
  
  var data;
  try {
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter || {};
    }
  } catch (err) {
    data = e.parameter || {};
  }
  
  var action = data.action;
  var result = {};
  
  try {
    if (action === "login") {
      result = handleLogin(data);
    } else if (action === "register") {
      result = handleRegister(data);
    } else if (action === "updateStage") {
      result = handleUpdateStage(data);
    } else if (action === "createOpportunity") {
      result = handleCreateOpportunity(data);
    } else if (action === "createAccount") {
      result = handleCreateAccount(data);
    } else if (action === "updateAccount") {
      result = handleUpdateAccount(data);
    } else if (action === "deleteAccount") {
      result = handleDeleteAccount(data);
    } else if (action === "createContact") {
      result = handleCreateContact(data);
    } else if (action === "updateContact") {
      result = handleUpdateContact(data);
    } else if (action === "deleteContact") {
      result = handleDeleteContact(data);
    } else if (action === "createTask") {
      result = handleCreateTask(data);
    } else if (action === "updateTask") {
      result = handleUpdateTask(data);
    } else if (action === "deleteTask") {
      result = handleDeleteTask(data);
    } else if (action === "sendGmailEmail") {
      result = handleSendGmailEmail(data);
    } else if (action === "createCalendarEvent") {
      result = handleCreateCalendarEvent(data);
    } else if (action === "storeDocument") {
      result = handleStoreDocument(data);
    } else if (action === "storeProposal") {
      result = handleStoreProposal(data);
    } else {
      result = { status: "error", message: "Invalid Action" };
    }
  } catch (error) {
    Logger.log("doPost Error: " + error.toString());
    result = { status: "error", message: error.toString() };
  }
  
  // Return with CORS headers
  return createCorsResponse(result);
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

function getOpportunitiesData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Opportunities sheet not found" };
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: [] };
    }
    
    var headers = data[0];
    var opportunities = [];
    
    // Get column indices by name for core fields
    var idCol = headers.indexOf('Opportunity ID');
    var nameCol = headers.indexOf('Opportunity Name');
    var accountIdCol = headers.indexOf('Account ID');
    var stageCol = headers.indexOf('Stage');
    var probCol = headers.indexOf('Forecast Probability');
    var ownerCol = headers.indexOf('Assigned Rep');
    var revenueCol = headers.indexOf('Estimated Revenue');
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var opp = {};
      
      // FIRST: Add ALL fields from spreadsheet with their exact column names
      headers.forEach(function(header, index) {
        if (header) {  // Only if header exists
          opp[header] = row[index] || '';  // Include even if empty
        }
      });
      
      // THEN: Map to frontend-expected field names (for compatibility)
      if (idCol >= 0) opp.id = row[idCol] || i;
      if (nameCol >= 0) opp.name = row[nameCol] || 'Unnamed';
      if (accountIdCol >= 0) opp.accountId = row[accountIdCol] || '';
      if (stageCol >= 0) opp.stage = row[stageCol] || 'New Lead';
      if (probCol >= 0) opp.probability = parseFloat(row[probCol]) || 0.1;
      if (ownerCol >= 0) opp.owner = row[ownerCol] || 'Unassigned';
      if (revenueCol >= 0) opp.revenue = parseFloat(row[revenueCol]) || 0;
      
      // Ensure required fields exist
      if (!opp.id) opp.id = i;
      if (!opp.name) opp.name = opp['Opportunity Name'] || 'Unnamed';
      if (!opp.stage) opp.stage = 'New Lead';
      if (!opp.probability) opp.probability = 0.1;
      if (!opp.owner) opp.owner = 'Unassigned';
      if (!opp.revenue) opp.revenue = 0;
      
      opportunities.push(opp);
    }
    
    return { status: "success", data: opportunities };
  } catch (error) {
    Logger.log("getOpportunitiesData Error: " + error.toString());
    return { status: "error", message: "Failed to fetch opportunities: " + error.toString() };
  }
}

function getMetaData() {
  return {
    status: "success",
    data: {
      stages: Object.keys(STAGE_REQUIRED_FIELDS),
      requiredFields: STAGE_REQUIRED_FIELDS,
      probabilities: STAGE_PROBABILITIES
    }
  };
}

function getTasksForOpportunity(opportunityId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(TASKS_SHEET);
    
    if (!sheet) {
      Logger.log("Tasks sheet not found");
      return { status: "success", data: [] };
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: [] };
    }
    
    var headers = data[0];
    var oppIdCol = headers.indexOf('Related Opportunity ID');
    
    if (oppIdCol < 0) {
      Logger.log("Related Opportunity ID column not found");
      return { status: "success", data: [] };
    }
    
    var tasks = [];
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowOppId = row[oppIdCol];
      
      // Check if this task is related to the opportunity
      // Handle both string and number comparisons
      if (rowOppId == opportunityId || String(rowOppId) == String(opportunityId)) {
        var task = {};
        
        // Add all fields with exact column names
        headers.forEach(function(header, index) {
          if (header) {
            task[header] = row[index] || '';
          }
        });
        
        tasks.push(task);
      }
    }
    
    return { status: "success", data: tasks };
  } catch (error) {
    Logger.log("getTasksForOpportunity Error: " + error.toString());
    return { status: "error", message: "Failed to fetch tasks: " + error.toString() };
  }
}

// ============================================================================
// ACCOUNTS CRUD
// ============================================================================

function getAccountsData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(ACCOUNTS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Accounts sheet not found" };
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: [] };
    }
    
    var headers = data[0];
    var accounts = [];
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var account = {};
      
      // Add all fields with exact column names
      headers.forEach(function(header, index) {
        if (header) {
          account[header] = row[index] || '';
        }
      });
      
      accounts.push(account);
    }
    
    return { status: "success", data: accounts };
  } catch (error) {
    Logger.log("getAccountsData Error: " + error.toString());
    return { status: "error", message: "Failed to fetch accounts: " + error.toString() };
  }
}

function handleCreateAccount(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(ACCOUNTS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Accounts sheet not found" };
    }
    
    // Validate required fields
    if (!data['Company Name'] || !data['Company Name'].trim()) {
      return { status: "error", message: "Company Name is required" };
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var dataRows = sheet.getDataRange().getValues();
    
    // Generate Account ID
    var accountId = "ACC-" + String(dataRows.length).padStart(3, '0');
    
    // Build new row
    var newRow = [];
    headers.forEach(function(header, index) {
      if (header === 'Account ID') {
        newRow[index] = accountId;
      } else if (data[header] !== undefined) {
        newRow[index] = data[header] || '';
      } else {
        newRow[index] = '';
      }
    });
    
    sheet.appendRow(newRow);
    
    return { 
      status: "success", 
      message: "Account created successfully",
      data: { 'Account ID': accountId }
    };
  } catch (error) {
    Logger.log("handleCreateAccount Error: " + error.toString());
    return { status: "error", message: "Failed to create account: " + error.toString() };
  }
}

function handleUpdateAccount(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(ACCOUNTS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Accounts sheet not found" };
    }
    
    var accountId = data.id;
    if (!accountId) {
      return { status: "error", message: "Account ID is required" };
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var dataRows = sheet.getDataRange().getValues();
    var idCol = headers.indexOf('Account ID');
    
    if (idCol < 0) {
      return { status: "error", message: "Account ID column not found" };
    }
    
    // Find row
    var rowIndex = -1;
    for (var i = 1; i < dataRows.length; i++) {
      if (dataRows[i][idCol] == accountId || String(dataRows[i][idCol]) == String(accountId)) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: "error", message: "Account not found" };
    }
    
    // Update fields
    for (var fieldName in data) {
      if (fieldName === 'id' || fieldName === 'action' || fieldName === 'token') {
        continue;
      }
      
      var colIndex = headers.indexOf(fieldName);
      if (colIndex >= 0) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(data[fieldName] || '');
      }
    }
    
    return { status: "success", message: "Account updated successfully" };
  } catch (error) {
    Logger.log("handleUpdateAccount Error: " + error.toString());
    return { status: "error", message: "Failed to update account: " + error.toString() };
  }
}

function handleDeleteAccount(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(ACCOUNTS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Accounts sheet not found" };
    }
    
    var accountId = data.id;
    if (!accountId) {
      return { status: "error", message: "Account ID is required" };
    }
    
    // Check if account has any opportunities before deletion
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    if (oppsSheet) {
      var oppsHeaders = oppsSheet.getRange(1, 1, 1, oppsSheet.getLastColumn()).getValues()[0];
      var oppsDataRows = oppsSheet.getDataRange().getValues();
      var oppsAccountIdCol = oppsHeaders.indexOf('Account ID');
      
      if (oppsAccountIdCol >= 0) {
        // Check if any opportunity references this account
        for (var i = 1; i < oppsDataRows.length; i++) {
          var oppAccountId = oppsDataRows[i][oppsAccountIdCol];
          if (oppAccountId == accountId || String(oppAccountId) == String(accountId)) {
            return { 
              status: "error", 
              message: "Cannot delete account: This account has associated opportunities. Please delete or reassign all opportunities before deleting the account." 
            };
          }
        }
      }
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var dataRows = sheet.getDataRange().getValues();
    var idCol = headers.indexOf('Account ID');
    
    if (idCol < 0) {
      return { status: "error", message: "Account ID column not found" };
    }
    
    // Find row
    var rowIndex = -1;
    for (var i = 1; i < dataRows.length; i++) {
      if (dataRows[i][idCol] == accountId || String(dataRows[i][idCol]) == String(accountId)) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: "error", message: "Account not found" };
    }
    
    // Delete row
    sheet.deleteRow(rowIndex);
    
    return { status: "success", message: "Account deleted successfully" };
  } catch (error) {
    Logger.log("handleDeleteAccount Error: " + error.toString());
    return { status: "error", message: "Failed to delete account: " + error.toString() };
  }
}

// ============================================================================
// CONTACTS CRUD
// ============================================================================

function getContactsData(accountId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONTACTS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Contacts sheet not found" };
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: [] };
    }
    
    var headers = data[0];
    var contacts = [];
    var accountIdCol = headers.indexOf('Account ID');
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      // Filter by accountId if provided
      if (accountId && accountIdCol >= 0) {
        if (row[accountIdCol] != accountId && String(row[accountIdCol]) != String(accountId)) {
          continue;
        }
      }
      
      var contact = {};
      
      // Add all fields with exact column names
      headers.forEach(function(header, index) {
        if (header) {
          contact[header] = row[index] || '';
        }
      });
      
      contacts.push(contact);
    }
    
    return { status: "success", data: contacts };
  } catch (error) {
    Logger.log("getContactsData Error: " + error.toString());
    return { status: "error", message: "Failed to fetch contacts: " + error.toString() };
  }
}

function handleCreateContact(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONTACTS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Contacts sheet not found" };
    }
    
    // Validate required fields
    if (!data['Full Name'] || !data['Full Name'].trim()) {
      return { status: "error", message: "Full Name is required" };
    }
    if (!data['Account ID']) {
      return { status: "error", message: "Account ID is required" };
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var dataRows = sheet.getDataRange().getValues();
    
    // Generate Contact ID
    var contactId = "CONT-" + String(dataRows.length).padStart(3, '0');
    
    // Build new row
    var newRow = [];
    headers.forEach(function(header, index) {
      if (header === 'Contact ID') {
        newRow[index] = contactId;
      } else if (data[header] !== undefined) {
        // Handle boolean for Is Billing Contact
        if (header === 'Is Billing Contact') {
          newRow[index] = data[header] === true || data[header] === 'TRUE' || data[header] === 'true';
        } else {
          newRow[index] = data[header] || '';
        }
      } else {
        newRow[index] = '';
      }
    });
    
    sheet.appendRow(newRow);
    
    return { 
      status: "success", 
      message: "Contact created successfully",
      data: { 'Contact ID': contactId }
    };
  } catch (error) {
    Logger.log("handleCreateContact Error: " + error.toString());
    return { status: "error", message: "Failed to create contact: " + error.toString() };
  }
}

function handleUpdateContact(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONTACTS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Contacts sheet not found" };
    }
    
    var contactId = data.id;
    if (!contactId) {
      return { status: "error", message: "Contact ID is required" };
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var dataRows = sheet.getDataRange().getValues();
    var idCol = headers.indexOf('Contact ID');
    
    if (idCol < 0) {
      return { status: "error", message: "Contact ID column not found" };
    }
    
    // Find row
    var rowIndex = -1;
    for (var i = 1; i < dataRows.length; i++) {
      if (dataRows[i][idCol] == contactId || String(dataRows[i][idCol]) == String(contactId)) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: "error", message: "Contact not found" };
    }
    
    // Update fields
    for (var fieldName in data) {
      if (fieldName === 'id' || fieldName === 'action' || fieldName === 'token') {
        continue;
      }
      
      var colIndex = headers.indexOf(fieldName);
      if (colIndex >= 0) {
        var value = data[fieldName];
        // Handle boolean for Is Billing Contact
        if (fieldName === 'Is Billing Contact') {
          value = value === true || value === 'TRUE' || value === 'true';
        }
        sheet.getRange(rowIndex, colIndex + 1).setValue(value || '');
      }
    }
    
    return { status: "success", message: "Contact updated successfully" };
  } catch (error) {
    Logger.log("handleUpdateContact Error: " + error.toString());
    return { status: "error", message: "Failed to update contact: " + error.toString() };
  }
}

function handleDeleteContact(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONTACTS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Contacts sheet not found" };
    }
    
    var contactId = data.id;
    if (!contactId) {
      return { status: "error", message: "Contact ID is required" };
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var dataRows = sheet.getDataRange().getValues();
    var idCol = headers.indexOf('Contact ID');
    
    if (idCol < 0) {
      return { status: "error", message: "Contact ID column not found" };
    }
    
    // Find row
    var rowIndex = -1;
    for (var i = 1; i < dataRows.length; i++) {
      if (dataRows[i][idCol] == contactId || String(dataRows[i][idCol]) == String(contactId)) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: "error", message: "Contact not found" };
    }
    
    // Delete row
    sheet.deleteRow(rowIndex);
    
    return { status: "success", message: "Contact deleted successfully" };
  } catch (error) {
    Logger.log("handleDeleteContact Error: " + error.toString());
    return { status: "error", message: "Failed to delete contact: " + error.toString() };
  }
}

// ============================================================================
// TASKS CRUD
// ============================================================================

function getAllTasksData(params) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(TASKS_SHEET);
    
    if (!sheet) {
      Logger.log("Tasks sheet not found");
      return { status: "success", data: [] };
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: [] };
    }
    
    var headers = data[0];
    var tasks = [];
    
    // Get filter parameters
    var opportunityId = params.opportunityId;
    var accountId = params.accountId;
    var owner = params.owner;
    
    var oppIdCol = headers.indexOf('Related Opportunity ID');
    var accIdCol = headers.indexOf('Related Account ID');
    var ownerCol = headers.indexOf('Owner');
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      // Apply filters
      if (opportunityId && oppIdCol >= 0) {
        if (row[oppIdCol] != opportunityId && String(row[oppIdCol]) != String(opportunityId)) {
          continue;
        }
      }
      
      if (accountId && accIdCol >= 0) {
        if (row[accIdCol] != accountId && String(row[accIdCol]) != String(accountId)) {
          continue;
        }
      }
      
      if (owner && ownerCol >= 0) {
        if (row[ownerCol] != owner && String(row[ownerCol]) != String(owner)) {
          continue;
        }
      }
      
      var task = {};
      
      // Add all fields with exact column names
      headers.forEach(function(header, index) {
        if (header) {
          task[header] = row[index] || '';
        }
      });
      
      tasks.push(task);
    }
    
    return { status: "success", data: tasks };
  } catch (error) {
    Logger.log("getAllTasksData Error: " + error.toString());
    return { status: "error", message: "Failed to fetch tasks: " + error.toString() };
  }
}

function handleCreateTask(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(TASKS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Tasks sheet not found" };
    }
    
    // Validate required fields
    if (!data.Subject || !data.Subject.trim()) {
      return { status: "error", message: "Subject is required" };
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var dataRows = sheet.getDataRange().getValues();
    
    // Generate Task ID
    var taskId = "TASK-" + String(dataRows.length).padStart(3, '0');
    
    // Build new row
    var newRow = [];
    headers.forEach(function(header, index) {
      if (header === 'Task ID') {
        newRow[index] = taskId;
      } else if (data[header] !== undefined) {
        newRow[index] = data[header] || '';
      } else {
        newRow[index] = '';
      }
    });
    
    sheet.appendRow(newRow);
    
    return { 
      status: "success", 
      message: "Task created successfully",
      data: { 'Task ID': taskId }
    };
  } catch (error) {
    Logger.log("handleCreateTask Error: " + error.toString());
    return { status: "error", message: "Failed to create task: " + error.toString() };
  }
}

function handleUpdateTask(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(TASKS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Tasks sheet not found" };
    }
    
    var taskId = data.id;
    if (!taskId) {
      return { status: "error", message: "Task ID is required" };
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var dataRows = sheet.getDataRange().getValues();
    var idCol = headers.indexOf('Task ID');
    
    if (idCol < 0) {
      return { status: "error", message: "Task ID column not found" };
    }
    
    // Find row
    var rowIndex = -1;
    for (var i = 1; i < dataRows.length; i++) {
      if (dataRows[i][idCol] == taskId || String(dataRows[i][idCol]) == String(taskId)) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: "error", message: "Task not found" };
    }
    
    // Update fields
    for (var fieldName in data) {
      if (fieldName === 'id' || fieldName === 'action' || fieldName === 'token') {
        continue;
      }
      
      var colIndex = headers.indexOf(fieldName);
      if (colIndex >= 0) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(data[fieldName] || '');
      }
    }
    
    return { status: "success", message: "Task updated successfully" };
  } catch (error) {
    Logger.log("handleUpdateTask Error: " + error.toString());
    return { status: "error", message: "Failed to update task: " + error.toString() };
  }
}

function handleDeleteTask(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(TASKS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Tasks sheet not found" };
    }
    
    var taskId = data.id;
    if (!taskId) {
      return { status: "error", message: "Task ID is required" };
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var dataRows = sheet.getDataRange().getValues();
    var idCol = headers.indexOf('Task ID');
    
    if (idCol < 0) {
      return { status: "error", message: "Task ID column not found" };
    }
    
    // Find row
    var rowIndex = -1;
    for (var i = 1; i < dataRows.length; i++) {
      if (dataRows[i][idCol] == taskId || String(dataRows[i][idCol]) == String(taskId)) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: "error", message: "Task not found" };
    }
    
    // Delete row
    sheet.deleteRow(rowIndex);
    
    return { status: "success", message: "Task deleted successfully" };
  } catch (error) {
    Logger.log("handleDeleteTask Error: " + error.toString());
    return { status: "error", message: "Failed to delete task: " + error.toString() };
  }
}

// ============================================================================
// USERS API
// ============================================================================

function getUsersData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(USERS_SHEET);
    
    if (!sheet) {
      return { status: "error", message: "Users sheet not found" };
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: [] };
    }
    
    var headers = data[0];
    var users = [];
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var user = {};
      
      // Add all fields with exact column names
      headers.forEach(function(header, index) {
        if (header) {
          user[header] = row[index] || '';
        }
      });
      
      users.push(user);
    }
    
    return { status: "success", data: users };
  } catch (error) {
    Logger.log("getUsersData Error: " + error.toString());
    return { status: "error", message: "Failed to fetch users: " + error.toString() };
  }
}

// ============================================================================
// STAGE VALIDATION
// ============================================================================

function getStageIndex(stage) {
  return STAGE_ORDER.indexOf(stage);
}

/**
 * Validate if stage progression is allowed
 * Rules:
 * - Can move forward one stage at a time
 * - Can move backward (reopening)
 * - Can move to Closed Won/Lost from any active stage
 * - Cannot skip stages forward
 * - Cannot move from closed stages to active stages (except backward)
 */
function validateStageProgression(currentStage, newStage) {
  // Same stage is always valid (no-op)
  if (currentStage === newStage) {
    return { valid: true };
  }
  
  const currentIndex = getStageIndex(currentStage);
  const newIndex = getStageIndex(newStage);
  
  // Invalid if stages not found
  if (currentIndex === -1 || newIndex === -1) {
    return { 
      valid: false, 
      message: 'Invalid stage name' 
    };
  }
  
  // Closed stages can only move to other closed stages or backward
  if (currentStage === 'Closed Won' || currentStage === 'Closed Lost') {
    if (newStage === 'Closed Won' || newStage === 'Closed Lost') {
      return { valid: true };
    }
    // Can move backward from closed stages
    if (newIndex < currentIndex) {
      return { valid: true };
    }
    return { 
      valid: false, 
      message: 'Cannot move from closed stage to active stage. Use backward movement to reopen.' 
    };
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
  if (newStage === 'Closed Won' || newStage === 'Closed Lost') {
    return { valid: true };
  }
  
  // Cannot skip stages forward
  return { 
    valid: false, 
    message: 'Cannot skip stages. Current: ' + currentStage + 
             '. Next allowed: ' + (STAGE_ORDER[currentIndex + 1] || 'Closed Won/Lost') 
  };
}

// ============================================================================
// UPDATE STAGE HANDLER
// ============================================================================

function handleUpdateStage(payload) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    
    if (!oppsSheet) {
      return { status: "error", message: "Opportunities sheet not found" };
    }
    
    var oppId = payload.id;
    var newStage = payload.stage;
    
    if (!oppId || !newStage) {
      return { status: "error", message: "Missing ID or Stage" };
    }
    
    // Get current stage from spreadsheet
    var headers = oppsSheet.getRange(1, 1, 1, oppsSheet.getLastColumn()).getValues()[0];
    var oppsData = oppsSheet.getDataRange().getValues();
    var rowIndex = -1;
    var idCol = headers.indexOf('Opportunity ID');
    var currentStage = null;
    
    for (var i = 1; i < oppsData.length; i++) {
      if (idCol >= 0 && oppsData[i][idCol] == oppId) {
        rowIndex = i + 1; // 1-based index
        var stageCol = headers.indexOf('Stage');
        if (stageCol >= 0) {
          currentStage = oppsData[i][stageCol];
        }
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: "error", message: "Opportunity Not Found" };
    }
    
    // Validate stage progression (NO SKIPPING)
    if (currentStage) {
      var progressionValidation = validateStageProgression(currentStage, newStage);
      if (!progressionValidation.valid) {
        return { 
          status: "error", 
          message: "Stage progression validation failed: " + progressionValidation.message 
        };
      }
    }
    
    // Validate required fields for the new stage
    var validation = validateRequiredFields(newStage, payload, oppsSheet);
    if (validation.status === "error") {
      return validation;
    }
    
    // Handle New Lead stage - Create Account and Contact
    if (newStage === "New Lead" && payload["Company Name"]) {
      var accountId = createOrFindAccount(
        ss, 
        payload["Company Name"], 
        payload["Territory"], 
        payload["Lead Source"] 
      );
      var contactId = createOrFindContact(
        ss, 
        accountId, 
        payload["Contact Name"], 
        payload["Email or Phone"] 
      );
      
      // Link Opportunity to Account
      var accountIdCol = headers.indexOf('Account ID');
      if (accountIdCol >= 0) {
        oppsSheet.getRange(rowIndex, accountIdCol + 1).setValue(accountId);
      }
    }
    
    // Update Stage
    var stageCol = headers.indexOf('Stage');
    if (stageCol >= 0) {
      oppsSheet.getRange(rowIndex, stageCol + 1).setValue(newStage);
    }
    
    // Auto-update Forecast Probability
    var probCol = headers.indexOf('Forecast Probability');
    if (probCol >= 0 && STAGE_PROBABILITIES[newStage] !== undefined) {
      oppsSheet.getRange(rowIndex, probCol + 1).setValue(STAGE_PROBABILITIES[newStage]);
    }
    
    // Auto-update Last Updated timestamp (for stagnation alerts)
    var lastUpdateCol = headers.indexOf('Last Updated');
    if (lastUpdateCol < 0) {
      // Add Last Updated column if it doesn't exist
      oppsSheet.getRange(1, oppsSheet.getLastColumn() + 1).setValue('Last Updated');
      lastUpdateCol = oppsSheet.getLastColumn() - 1;
    }
    if (lastUpdateCol >= 0) {
      oppsSheet.getRange(rowIndex, lastUpdateCol + 1).setValue(new Date());
    }
    
    // Update all provided fields using column name lookup
    for (var fieldName in payload) {
      // Skip metadata fields
      if (fieldName === "id" || fieldName === "stage" || fieldName === "action" ||
          fieldName === "Company Name" || fieldName === "Contact Name" || 
          fieldName === "Email or Phone" || fieldName === "Territory" || 
          fieldName === "Lead Source" || fieldName === "token") {
        continue;
      }
      
      // Find column by name
      var colIndex = headers.indexOf(fieldName);
      
      // If exact match not found, try common variations
      if (colIndex < 0) {
        var fieldMap = {
          "Interest Type": "Interest Type",
          "First Contact Notes": "First Contact Notes",
          "Validated Contact Info": "Validated Contact Info",
          "Project Type": "Project Type",
          "Scope": "Scope",
          "Timeline": "Timeline",
          "Competitors": "Competitors",
          "Buying Role": "Buying Role",
          "Discovery Notes": "Discovery Notes",
          "Qualification Score": "Qualification Score",
          "Estimated Revenue": "Estimated Revenue",
          "Project Address": "Project Address",
          "Required Product Categories": "Required Product Categories",
          "Link to Plans": "Link to Plans",
          "Proposal Amount": "Proposal Amount",
          "Proposal Version": "Proposal Version",
          "Proposal Date": "Proposal Date",
          "Decision Date": "Decision Date",
          "Next Meeting": "Next Meeting",
          "Updated Quote": "Updated Quote",
          "Objections": "Objections",
          "Negotiation Notes": "Negotiation Notes",
          "Decision Maker": "Decision Maker",
          "Expected Close Date": "Expected Close Date",
          "Final Deal Value": "Final Deal Value",
          "Final Margin": "Final Margin",
          "Handoff Notes": "Handoff Notes",
          "Delivery Timing": "Delivery Timing",
          "Billing Contact Info": "Billing Contact Info",
          "Reason Lost": "Reason Lost",
          "Next Outreach": "Next Outreach"
        };
        var mappedName = fieldMap[fieldName];
        if (mappedName) {
          colIndex = headers.indexOf(mappedName);
        }
      }
      
      if (colIndex >= 0) {
        oppsSheet.getRange(rowIndex, colIndex + 1).setValue(payload[fieldName]);
      } else {
        Logger.log("Warning: Column not found for field: " + fieldName);
      }
    }
    
    // Auto-generate task for stage transition
    if (currentStage && currentStage !== newStage) {
      try {
        createTaskForStageTransition(ss, oppId, currentStage, newStage, payload);
      } catch (taskError) {
        Logger.log("Task generation error (non-fatal): " + taskError.toString());
        // Don't fail the stage update if task creation fails
      }
    }
    
    return { status: "success", message: "Stage and fields updated successfully" };
  } catch (error) {
    Logger.log("handleUpdateStage Error: " + error.toString());
    return { status: "error", message: "Failed to update: " + error.toString() };
  }
}

// ============================================================================
// CREATE OPPORTUNITY HANDLER
// ============================================================================

function handleCreateOpportunity(payload) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    
    if (!oppsSheet) {
      return { status: "error", message: "Opportunities sheet not found" };
    }
    
    // Validate required fields for New Lead stage
    var requiredFields = ['Company Name', 'Contact Name', 'Email or Phone', 'Territory', 'Lead Source'];
    var missingFields = [];
    
    requiredFields.forEach(function(fieldName) {
      if (!payload[fieldName] || !payload[fieldName].trim()) {
        missingFields.push(fieldName);
      }
    });
    
    if (missingFields.length > 0) {
      return { 
        status: "error", 
        message: "Missing required fields: " + missingFields.join(", ") 
      };
    }
    
    // Get headers
    var headers = oppsSheet.getRange(1, 1, 1, oppsSheet.getLastColumn()).getValues()[0];
    var dataRows = oppsSheet.getDataRange().getValues();
    
    // Generate Opportunity ID
    var oppId = "OPP-" + String(dataRows.length).padStart(3, '0');
    
    // Create or find Account
    var accountId = createOrFindAccount(
      ss, 
      payload['Company Name'], 
      payload['Territory'], 
      payload['Lead Source'] 
    );
    
    // Create or find Contact
    var contactId = createOrFindContact(
      ss, 
      accountId, 
      payload['Contact Name'], 
      payload['Email or Phone'] 
    );
    
    // Build new row
    var newRow = [];
    headers.forEach(function(header, index) {
      if (header === 'Opportunity ID') {
        newRow[index] = oppId;
      } else if (header === 'Opportunity Name') {
        newRow[index] = payload['Opportunity Name'] || (payload['Company Name'] + ' - ' + payload['Contact Name']);
      } else if (header === 'Account ID') {
        newRow[index] = accountId;
      } else if (header === 'Stage') {
        newRow[index] = 'New Lead';
      } else if (header === 'Forecast Probability') {
        newRow[index] = STAGE_PROBABILITIES['New Lead'] || 0.1;
      } else if (header === 'Assigned Rep') {
        newRow[index] = payload['Assigned Rep'] || '';
      } else if (header === 'Created Date') {
        newRow[index] = new Date();
      } else if (header === 'Company Name') {
        newRow[index] = payload['Company Name'] || '';
      } else if (header === 'Contact Name') {
        newRow[index] = payload['Contact Name'] || '';
      } else if (header === 'Email or Phone') {
        newRow[index] = payload['Email or Phone'] || '';
      } else if (header === 'Territory') {
        newRow[index] = payload['Territory'] || '';
      } else if (header === 'Lead Source') {
        newRow[index] = payload['Lead Source'] || '';
      } else if (payload[header] !== undefined) {
        newRow[index] = payload[header];
      } else {
        newRow[index] = '';
      }
    });
    
    oppsSheet.appendRow(newRow);
    
    // Auto-create task: "Contact within 24 hrs" when lead is created
    try {
      createAutoTask(ss, oppId, accountId, {
        subject: 'Contact within 24 hrs',
        dueDays: 1, // 24 hours = 1 day
        priority: 'High',
        notes: 'Initial contact required for new lead: ' + (payload['Contact Name'] || payload['Company Name']),
        owner: payload['Assigned Rep'] || ''
      });
    } catch (taskError) {
      Logger.log("Task creation error (non-fatal): " + taskError.toString());
      // Don't fail the opportunity creation if task creation fails
    }
    
    return { 
      status: "success", 
      message: "Opportunity created successfully",
      data: { 'Opportunity ID': oppId }
    };
  } catch (error) {
    Logger.log("handleCreateOpportunity Error: " + error.toString());
    return { status: "error", message: "Failed to create opportunity: " + error.toString() };
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateRequiredFields(stage, payload, sheet) {
  var requiredFields = STAGE_REQUIRED_FIELDS[stage];
  
  if (!requiredFields) {
    return { status: "error", message: "Invalid stage: " + stage };
  }
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var missingFields = [];
  
  requiredFields.forEach(function(fieldName) {
    // Check if field value is provided
    var hasValue = payload[fieldName] !== undefined && 
                   payload[fieldName] !== null && 
                   payload[fieldName] !== '';
    
    // Check if column exists in spreadsheet
    var colExists = headers.indexOf(fieldName) >= 0;
    
    if (!hasValue) {
      if (!colExists) {
        missingFields.push(fieldName + " (column missing in spreadsheet)");
      } else {
        missingFields.push(fieldName);
      }
    }
  });
  
  if (missingFields.length > 0) {
    return { 
      status: "error", 
      message: "Missing required fields: " + missingFields.join(", ") 
    };
  }
  
  return { status: "success" };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createOrFindAccount(ss, companyName, territory, leadSource) {
  var accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET);
  if (!accountsSheet) {
    throw new Error("Accounts sheet not found");
  }
  
  var data = accountsSheet.getDataRange().getValues();
  var headers = data[0];
  var nameCol = headers.indexOf('Company Name');
  
  if (nameCol < 0) {
    throw new Error("Company Name column not found in Accounts sheet");
  }
  
  // Check if company already exists
  for (var i = 1; i < data.length; i++) {
    if (data[i][nameCol] === companyName) {
      var idCol = headers.indexOf('Account ID');
      return idCol >= 0 ? data[i][idCol] : data[i][0];
    }
  }
  
  // Create new Account
  var idCol = headers.indexOf('Account ID');
  var newId = "ACC-" + String(data.length).padStart(3, '0');
  var newRow = [];
  
  // Build row based on actual column positions
  headers.forEach(function(header, index) {
    if (header === 'Account ID') {
      newRow[index] = newId;
    } else if (header === 'Company Name') {
      newRow[index] = companyName;
    } else if (header === 'Territory') {
      newRow[index] = territory || "";
    } else if (header === 'Lead Source') {
      newRow[index] = leadSource || "";
    } else if (header === 'Notes') {
      newRow[index] = "AUTO-CREATED from New Lead";
    } else if (header === 'Lifecycle Status') {
      newRow[index] = "Prospect";
    } else {
      newRow[index] = "";
    }
  });
  
  accountsSheet.appendRow(newRow);
  return newId;
}

function createOrFindContact(ss, accountId, contactName, emailOrPhone) {
  var contactsSheet = ss.getSheetByName(CONTACTS_SHEET);
  if (!contactsSheet) {
    throw new Error("Contacts sheet not found");
  }
  
  var data = contactsSheet.getDataRange().getValues();
  var headers = data[0];
  var accountIdCol = headers.indexOf('Account ID');
  var nameCol = headers.indexOf('Full Name');
  
  if (accountIdCol < 0 || nameCol < 0) {
    throw new Error("Required columns not found in Contacts sheet");
  }
  
  // Check if contact exists for this account
  for (var i = 1; i < data.length; i++) {
    if (data[i][accountIdCol] === accountId && data[i][nameCol] === contactName) {
      var idCol = headers.indexOf('Contact ID');
      return idCol >= 0 ? data[i][idCol] : data[i][0];
    }
  }
  
  // Create new Contact
  var newId = "CONT-" + String(data.length).padStart(3, '0');
  
  // Determine if emailOrPhone is email or phone
  var email = "";
  var phone = "";
  if (emailOrPhone && emailOrPhone.includes("@")) {
    email = emailOrPhone;
  } else {
    phone = emailOrPhone;
  }
  
  var newRow = [];
  headers.forEach(function(header, index) {
    if (header === 'Contact ID') {
      newRow[index] = newId;
    } else if (header === 'Account ID') {
      newRow[index] = accountId;
    } else if (header === 'Full Name') {
      newRow[index] = contactName || "Unknown";
    } else if (header === 'Email') {
      newRow[index] = email;
    } else if (header === 'Phone') {
      newRow[index] = phone;
    } else if (header === 'Notes') {
      newRow[index] = "AUTO-CREATED from New Lead";
    } else {
      newRow[index] = "";
    }
  });
  
  contactsSheet.appendRow(newRow);
  return newId;
}

// ============================================================================
// AUTO TASK GENERATION FOR STAGE TRANSITIONS
// ============================================================================

/**
 * Automatically create tasks when opportunity moves to a new stage
 */
function createTaskForStageTransition(ss, opportunityId, oldStage, newStage, payload) {
  try {
    var tasksSheet = ss.getSheetByName(TASKS_SHEET);
    if (!tasksSheet) {
      Logger.log("Tasks sheet not found, skipping task creation");
      return;
    }
    
    // Define tasks for each stage transition
    var stageTasks = {
      'Contact Made': {
        subject: 'Discovery within 3 days',
        dueDays: 3,
        priority: 'High',
        notes: 'Complete discovery process with ' + (payload['Contact Name'] || 'contact') + ' to understand requirements and needs'
      },
      'Discovery Completed': {
        subject: 'Review discovery findings and prepare qualification',
        dueDays: 3,
        priority: 'High',
        notes: 'Review discovery notes and prepare qualification materials'
      },
      'Qualified Opportunity': {
        subject: 'Prepare proposal and gather required documents',
        dueDays: 5,
        priority: 'High',
        notes: 'Prepare proposal based on qualification findings'
      },
      'Proposal Sent': {
        // This will create multiple follow-up tasks (Day 2, 5, 10)
        subject: 'Proposal Follow-up',
        dueDays: 2, // First follow-up at Day 2
        priority: 'High',
        notes: 'Follow up on proposal sent',
        multipleTasks: [
          { days: 2, subject: 'Proposal Follow-up - Day 2', priority: 'High' },
          { days: 5, subject: 'Proposal Follow-up - Day 5', priority: 'High' },
          { days: 10, subject: 'Proposal Follow-up - Day 10', priority: 'Medium' }
        ]
      },
      'Negotiation / Decision': {
        subject: 'Address objections and finalize negotiation',
        dueDays: 2,
        priority: 'High',
        notes: 'Work on addressing concerns and finalizing deal terms'
      },
      'Verbal Win': {
        subject: 'Prepare contract and handoff documentation',
        dueDays: 5,
        priority: 'Medium',
        notes: 'Prepare final contract and handoff materials'
      },
      'Closed Won': {
        subject: 'Complete handoff and onboarding',
        dueDays: 7,
        priority: 'Medium',
        notes: 'Complete customer onboarding and handoff process'
      }
    };
    
    // Only create task if moving to a stage that requires a task
    if (!stageTasks[newStage]) {
      return; // No task needed for this stage
    }
    
    var taskConfig = stageTasks[newStage];
    
    // Get owner and account ID from opportunity
    var owner = payload['Assigned Rep'] || '';
    var accountId = '';
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    if (oppsSheet) {
      var oppsData = oppsSheet.getDataRange().getValues();
      var oppHeaders = oppsData[0];
      var oppIdCol = oppHeaders.indexOf('Opportunity ID');
      var ownerCol = oppHeaders.indexOf('Assigned Rep');
      var accIdCol = oppHeaders.indexOf('Account ID');
      
      for (var i = 1; i < oppsData.length; i++) {
        if (oppIdCol >= 0 && oppsData[i][oppIdCol] == opportunityId) {
          if (ownerCol >= 0 && !owner) {
            owner = oppsData[i][ownerCol] || '';
          }
          if (accIdCol >= 0) {
            accountId = oppsData[i][accIdCol] || '';
          }
          break;
        }
      }
    }
    
    // Handle Proposal Sent - create multiple follow-up tasks (Day 2, 5, 10)
    if (newStage === 'Proposal Sent' && taskConfig.multipleTasks) {
      taskConfig.multipleTasks.forEach(function(followUpTask) {
        createAutoTask(ss, opportunityId, accountId, {
          subject: followUpTask.subject,
          dueDays: followUpTask.days,
          priority: followUpTask.priority,
          notes: 'Auto follow-up on proposal sent - Day ' + followUpTask.days,
          owner: owner
        });
      });
    } else {
      // Create single task for other stages
      createAutoTask(ss, opportunityId, accountId, {
        subject: taskConfig.subject,
        dueDays: taskConfig.dueDays,
        priority: taskConfig.priority,
        notes: taskConfig.notes,
        owner: owner
      });
    }
    
    Logger.log("Auto-generated task(s) for stage transition: " + newStage);
  } catch (error) {
    Logger.log("Error creating auto-task: " + error.toString());
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Helper function to create a task
 */
function createAutoTask(ss, opportunityId, accountId, taskConfig) {
  try {
    var tasksSheet = ss.getSheetByName(TASKS_SHEET);
    if (!tasksSheet) {
      Logger.log("Tasks sheet not found, skipping task creation");
      return;
    }
    
    var taskData = tasksSheet.getDataRange().getValues();
    var headers = taskData[0];
    
    // Calculate due date
    var dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + taskConfig.dueDays);
    
    // Generate Task ID
    var taskId = "TASK-" + String(taskData.length).padStart(3, '0');
    
    // Build new task row
    var newRow = [];
    headers.forEach(function(header, index) {
      if (header === 'Task ID') {
        newRow[index] = taskId;
      } else if (header === 'Subject') {
        newRow[index] = taskConfig.subject;
      } else if (header === 'Due Date') {
        newRow[index] = dueDate;
      } else if (header === 'Owner') {
        newRow[index] = taskConfig.owner || '';
      } else if (header === 'Priority') {
        newRow[index] = taskConfig.priority || 'Medium';
      } else if (header === 'Status') {
        newRow[index] = 'Pending';
      } else if (header === 'Notes') {
        newRow[index] = taskConfig.notes || '';
      } else if (header === 'Related Opportunity ID') {
        newRow[index] = opportunityId || '';
      } else if (header === 'Related Account ID') {
        newRow[index] = accountId || '';
      } else {
        newRow[index] = '';
      }
    });
    
    tasksSheet.appendRow(newRow);
    Logger.log("Created auto-task: " + taskConfig.subject);
  } catch (error) {
    Logger.log("Error in createAutoTask: " + error.toString());
    // Don't throw - this is a non-critical operation
  }
}

// ============================================================================
// TEST FUNCTIONS (Optional - for debugging)
// ============================================================================

function testGetOpportunities() {
  var result = getOpportunitiesData();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testGetMeta() {
  var result = getMetaData();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testGetTasks() {
  var result = getTasksForOpportunity('OPP-001');
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testGetAccounts() {
  var result = getAccountsData();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testGetContacts() {
  var result = getContactsData();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ============================================================================
// SLA ENFORCEMENT & ALERTS
// ============================================================================

/**
 * Configuration for AJ notification (ongoing issues)
 * Set this email address to receive notifications about ongoing SLA issues
 */
const AJ_EMAIL = "aj@example.com"; // TODO: Update with actual AJ email

/**
 * Check for overdue tasks and send reminders
 * This function checks all tasks and identifies overdue ones
 * Filters by userName if provided (for Sales Reps to see only their alerts)
 */
function checkOverdueTasks(filterByUser) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tasksSheet = ss.getSheetByName(TASKS_SHEET);
    
    if (!tasksSheet) {
      Logger.log("Tasks sheet not found");
      return { status: "error", message: "Tasks sheet not found" };
    }
    
    var data = tasksSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", overdueTasks: [] };
    }
    
    var headers = data[0];
    var dueDateCol = headers.indexOf('Due Date');
    var ownerCol = headers.indexOf('Owner');
    var statusCol = headers.indexOf('Status');
    var subjectCol = headers.indexOf('Subject');
    var taskIdCol = headers.indexOf('Task ID');
    var oppIdCol = headers.indexOf('Related Opportunity ID');
    var lastReminderCol = headers.indexOf('Last Reminder Sent');
    var reminderCountCol = headers.indexOf('Reminder Count');
    
    if (dueDateCol < 0 || ownerCol < 0) {
      return { status: "error", message: "Required columns not found" };
    }
    
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    
    var overdueTasks = [];
    var ongoingIssues = [];
    
    // Check if Last Reminder Sent and Reminder Count columns exist, if not add them
    if (lastReminderCol < 0) {
      tasksSheet.getRange(1, tasksSheet.getLastColumn() + 1).setValue('Last Reminder Sent');
      lastReminderCol = tasksSheet.getLastColumn() - 1;
    }
    if (reminderCountCol < 0) {
      tasksSheet.getRange(1, tasksSheet.getLastColumn() + 1).setValue('Reminder Count');
      reminderCountCol = tasksSheet.getLastColumn() - 1;
    }
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var dueDate = row[dueDateCol];
      var status = statusCol >= 0 ? row[statusCol] : 'Pending';
      var owner = row[ownerCol];
      var subject = subjectCol >= 0 ? row[subjectCol] : 'Untitled Task';
      var taskId = taskIdCol >= 0 ? row[taskIdCol] : '';
      var oppId = oppIdCol >= 0 ? row[oppIdCol] : '';
      var lastReminder = lastReminderCol >= 0 ? row[lastReminderCol] : null;
      var reminderCount = reminderCountCol >= 0 ? (row[reminderCountCol] || 0) : 0;
      
      // Skip completed tasks
      if (status === 'Completed') {
        continue;
      }
      
      // Filter by user if specified (for Sales Reps)
      if (filterByUser && owner !== filterByUser) {
        continue;
      }
      
      if (dueDate && dueDate instanceof Date) {
        var taskDueDate = new Date(dueDate);
        taskDueDate.setHours(0, 0, 0, 0);
        
        // Check if overdue
        if (taskDueDate.getTime() < today.getTime()) {
          var daysOverdue = Math.floor((today.getTime() - taskDueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          var taskInfo = {
            taskId: taskId,
            subject: subject,
            owner: owner,
            dueDate: dueDate,
            daysOverdue: daysOverdue,
            opportunityId: oppId,
            reminderCount: reminderCount
          };
          
          overdueTasks.push(taskInfo);
          
          // If task is overdue for more than 3 days, flag as ongoing issue
          if (daysOverdue > 3) {
            ongoingIssues.push(taskInfo);
          }
          
          // Send reminder to rep (only if not sent today)
          var shouldSendReminder = true;
          if (lastReminder) {
            var lastReminderDate = new Date(lastReminder);
            lastReminderDate.setHours(0, 0, 0, 0);
            if (lastReminderDate.getTime() === today.getTime()) {
              shouldSendReminder = false; // Already sent today
            }
          }
          
          if (shouldSendReminder && owner) {
            sendTaskReminderEmail(owner, taskInfo);
            
            // Update last reminder sent date and increment count
            var rowIndex = i + 1;
            if (lastReminderCol >= 0) {
              tasksSheet.getRange(rowIndex, lastReminderCol + 1).setValue(today);
            }
            if (reminderCountCol >= 0) {
              tasksSheet.getRange(rowIndex, reminderCountCol + 1).setValue(reminderCount + 1);
            }
          }
        }
      }
    }
    
    // Notify AJ if there are ongoing issues
    if (ongoingIssues.length > 0) {
      notifyAJOngoingIssues(ongoingIssues);
    }
    
    return {
      status: "success",
      overdueTasks: overdueTasks,
      ongoingIssues: ongoingIssues,
      remindersSent: overdueTasks.length
    };
  } catch (error) {
    Logger.log("checkOverdueTasks Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Send reminder email to task owner
 */
function sendTaskReminderEmail(ownerEmail, taskInfo) {
  try {
    var user = getUserByEmail(ownerEmail);
    if (!user) {
      Logger.log("User not found for email: " + ownerEmail);
      return;
    }
    
    var subject = "⚠️ Overdue Task Reminder: " + taskInfo.subject;
    var body = "Hello " + user.Name + ",\n\n";
    body += "You have an overdue task that requires attention:\n\n";
    body += "Task: " + taskInfo.subject + "\n";
    body += "Due Date: " + Utilities.formatDate(taskInfo.dueDate, Session.getScriptTimeZone(), "MM/dd/yyyy") + "\n";
    body += "Days Overdue: " + taskInfo.daysOverdue + "\n";
    
    if (taskInfo.opportunityId) {
      body += "Related Opportunity: " + taskInfo.opportunityId + "\n";
    }
    
    body += "\nPlease update the task status or complete it as soon as possible.\n\n";
    body += "Thank you,\nCRM System";
    
    // Send email using Gmail API
    if (user.Email) {
      MailApp.sendEmail({
        to: user.Email,
        subject: subject,
        body: body
      });
      
      Logger.log("Reminder sent to: " + user.Email);
    }
  } catch (error) {
    Logger.log("sendTaskReminderEmail Error: " + error.toString());
  }
}

/**
 * Notify AJ about ongoing issues
 */
function notifyAJOngoingIssues(ongoingIssues) {
  try {
    if (!AJ_EMAIL || AJ_EMAIL === "aj@example.com") {
      Logger.log("AJ email not configured, skipping notification");
      return;
    }
    
    var subject = "🚨 Ongoing SLA Issues - " + ongoingIssues.length + " Task(s) Overdue > 3 Days";
    var body = "Hello AJ,\n\n";
    body += "There are " + ongoingIssues.length + " task(s) that have been overdue for more than 3 days:\n\n";
    
    ongoingIssues.forEach(function(task, index) {
      body += (index + 1) + ". " + task.subject + "\n";
      body += "   Owner: " + task.owner + "\n";
      body += "   Days Overdue: " + task.daysOverdue + "\n";
      body += "   Due Date: " + Utilities.formatDate(task.dueDate, Session.getScriptTimeZone(), "MM/dd/yyyy") + "\n";
      if (task.opportunityId) {
        body += "   Opportunity: " + task.opportunityId + "\n";
      }
      body += "\n";
    });
    
    body += "Please follow up with the assigned reps to resolve these issues.\n\n";
    body += "Thank you,\nCRM System";
    
    MailApp.sendEmail({
      to: AJ_EMAIL,
      subject: subject,
      body: body
    });
    
    Logger.log("Ongoing issues notification sent to AJ");
  } catch (error) {
    Logger.log("notifyAJOngoingIssues Error: " + error.toString());
  }
}

/**
 * Get user by email
 */
function getUserByEmail(email) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var usersSheet = ss.getSheetByName(USERS_SHEET);
    
    if (!usersSheet) {
      return null;
    }
    
    var data = usersSheet.getDataRange().getValues();
    var headers = data[0];
    var emailCol = headers.indexOf('Email');
    var nameCol = headers.indexOf('Name');
    var roleCol = headers.indexOf('Role');
    
    if (emailCol < 0) {
      return null;
    }
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        return {
          Email: data[i][emailCol],
          Name: nameCol >= 0 ? data[i][nameCol] : '',
          Role: roleCol >= 0 ? data[i][roleCol] : ''
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log("getUserByEmail Error: " + error.toString());
    return null;
  }
}

/**
 * Check for status stagnation in opportunities
 * - Discovery: 7 days without update
 * - Negotiation: 10 days without update
 * Filters by userName if provided (for Sales Reps to see only their alerts)
 */
function checkStatusStagnation(filterByUser) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    
    if (!oppsSheet) {
      return { status: "error", message: "Opportunities sheet not found" };
    }
    
    var data = oppsSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", alerts: [] };
    }
    
    var headers = data[0];
    var stageCol = headers.indexOf('Stage');
    var oppIdCol = headers.indexOf('Opportunity ID');
    var oppNameCol = headers.indexOf('Opportunity Name');
    var ownerCol = headers.indexOf('Assigned Rep');
    var lastUpdateCol = headers.indexOf('Last Updated');
    var createdDateCol = headers.indexOf('Created Date');
    
    if (stageCol < 0 || oppIdCol < 0) {
      return { status: "error", message: "Required columns not found" };
    }
    
    // Add Last Updated column if it doesn't exist
    if (lastUpdateCol < 0) {
      oppsSheet.getRange(1, oppsSheet.getLastColumn() + 1).setValue('Last Updated');
      lastUpdateCol = oppsSheet.getLastColumn() - 1;
    }
    
    var today = new Date();
    var alerts = [];
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var stage = row[stageCol];
      var oppId = row[oppIdCol];
      var oppName = oppNameCol >= 0 ? row[oppNameCol] : oppId;
      var owner = ownerCol >= 0 ? row[ownerCol] : '';
      var lastUpdate = lastUpdateCol >= 0 ? row[lastUpdateCol] : null;
      var createdDate = createdDateCol >= 0 ? row[createdDateCol] : null;
      
      // Filter by user if specified (for Sales Reps)
      if (filterByUser && owner !== filterByUser) {
        continue;
      }
      
      // Skip closed stages
      if (stage === 'Closed Won' || stage === 'Closed Lost') {
        continue;
      }
      
      // Determine reference date (use Last Updated if available, otherwise Created Date)
      var referenceDate = lastUpdate || createdDate;
      if (!referenceDate) {
        continue; // Skip if no date available
      }
      
      var refDate = new Date(referenceDate);
      var daysSinceUpdate = Math.floor((today.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check Discovery stage (7 days)
      if (stage === 'Discovery Completed' && daysSinceUpdate >= 7) {
        alerts.push({
          opportunityId: oppId,
          opportunityName: oppName,
          stage: stage,
          owner: owner,
          daysSinceUpdate: daysSinceUpdate,
          alertType: 'Discovery Stagnation'
        });
        
        // Send alert email
        sendStagnationAlert(owner, {
          opportunityId: oppId,
          opportunityName: oppName,
          stage: stage,
          daysSinceUpdate: daysSinceUpdate
        });
      }
      
      // Check Negotiation stage (10 days)
      if (stage === 'Negotiation / Decision' && daysSinceUpdate >= 10) {
        alerts.push({
          opportunityId: oppId,
          opportunityName: oppName,
          stage: stage,
          owner: owner,
          daysSinceUpdate: daysSinceUpdate,
          alertType: 'Negotiation Stagnation'
        });
        
        // Send alert email
        sendStagnationAlert(owner, {
          opportunityId: oppId,
          opportunityName: oppName,
          stage: stage,
          daysSinceUpdate: daysSinceUpdate
        });
      }
    }
    
    return {
      status: "success",
      alerts: alerts,
      alertsSent: alerts.length
    };
  } catch (error) {
    Logger.log("checkStatusStagnation Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Send stagnation alert email
 */
function sendStagnationAlert(ownerEmail, oppInfo) {
  try {
    var user = getUserByEmail(ownerEmail);
    if (!user && ownerEmail) {
      // Try to find user by name if email lookup fails
      user = getUserByName(ownerEmail);
    }
    
    if (!user) {
      Logger.log("User not found for: " + ownerEmail);
      return;
    }
    
    var subject = "⚠️ Status Stagnation Alert: " + oppInfo.opportunityName;
    var body = "Hello " + user.Name + ",\n\n";
    body += "The following opportunity has been in the " + oppInfo.stage + " stage for " + oppInfo.daysSinceUpdate + " days without updates:\n\n";
    body += "Opportunity: " + oppInfo.opportunityName + "\n";
    body += "Opportunity ID: " + oppInfo.opportunityId + "\n";
    body += "Current Stage: " + oppInfo.stage + "\n";
    body += "Days Since Last Update: " + oppInfo.daysSinceUpdate + "\n\n";
    
    if (oppInfo.stage === 'Discovery Completed') {
      body += "Action Required: Please update the opportunity status or move it to the next stage.\n";
    } else if (oppInfo.stage === 'Negotiation / Decision') {
      body += "Action Required: Please follow up with the customer or update the negotiation status.\n";
    }
    
    body += "\nThank you,\nCRM System";
    
    if (user.Email) {
      MailApp.sendEmail({
        to: user.Email,
        subject: subject,
        body: body
      });
      
      Logger.log("Stagnation alert sent to: " + user.Email);
    }
  } catch (error) {
    Logger.log("sendStagnationAlert Error: " + error.toString());
  }
}

/**
 * Get user by name
 */
function getUserByName(name) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var usersSheet = ss.getSheetByName(USERS_SHEET);
    
    if (!usersSheet) {
      return null;
    }
    
    var data = usersSheet.getDataRange().getValues();
    var headers = data[0];
    var nameCol = headers.indexOf('Name');
    var emailCol = headers.indexOf('Email');
    var roleCol = headers.indexOf('Role');
    
    if (nameCol < 0) {
      return null;
    }
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][nameCol] === name) {
        return {
          Email: emailCol >= 0 ? data[i][emailCol] : '',
          Name: data[i][nameCol],
          Role: roleCol >= 0 ? data[i][roleCol] : ''
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log("getUserByName Error: " + error.toString());
    return null;
  }
}

/**
 * Scheduled function to run SLA and stagnation checks
 * Set this up as a time-driven trigger (daily)
 */
function runScheduledAlerts() {
  Logger.log("Running scheduled SLA and stagnation checks...");
  
  // Check overdue tasks
  var slaResult = checkOverdueTasks();
  Logger.log("SLA Check Result: " + JSON.stringify(slaResult));
  
  // Check status stagnation
  var stagnationResult = checkStatusStagnation();
  Logger.log("Stagnation Check Result: " + JSON.stringify(stagnationResult));
  
  return {
    sla: slaResult,
    stagnation: stagnationResult
  };
}

// ============================================================================
// GMAIL INTEGRATION
// ============================================================================

/**
 * Send email via Gmail and track in CRM
 */
function sendGmailEmail(to, subject, body, opportunityId, accountId) {
  try {
    // Send email
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: body
    });
    
    // Track email in CRM (create a task or note)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tasksSheet = ss.getSheetByName(TASKS_SHEET);
    
    if (tasksSheet && (opportunityId || accountId)) {
      var headers = tasksSheet.getRange(1, 1, 1, tasksSheet.getLastColumn()).getValues()[0];
      var dataRows = tasksSheet.getDataRange().getValues();
      
      var taskId = "TASK-" + String(dataRows.length).padStart(3, '0');
      var newRow = [];
      
      headers.forEach(function(header, index) {
        if (header === 'Task ID') {
          newRow[index] = taskId;
        } else if (header === 'Subject') {
          newRow[index] = 'Email Sent: ' + subject;
        } else if (header === 'Due Date') {
          newRow[index] = new Date();
        } else if (header === 'Status') {
          newRow[index] = 'Completed';
        } else if (header === 'Priority') {
          newRow[index] = 'Low';
        } else if (header === 'Notes') {
          newRow[index] = 'Email sent to: ' + to + '\n' + body;
        } else if (header === 'Related Opportunity ID') {
          newRow[index] = opportunityId || '';
        } else if (header === 'Related Account ID') {
          newRow[index] = accountId || '';
        } else {
          newRow[index] = '';
        }
      });
      
      tasksSheet.appendRow(newRow);
      Logger.log("Email tracked in CRM: " + taskId);
    }
    
    return { status: "success", message: "Email sent and tracked" };
  } catch (error) {
    Logger.log("sendGmailEmail Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

// ============================================================================
// GOOGLE CALENDAR INTEGRATION
// ============================================================================

/**
 * Create calendar event and log in CRM
 */
function createCalendarEvent(title, description, startTime, endTime, attendees, opportunityId, accountId) {
  try {
    var calendar = CalendarApp.getDefaultCalendar();
    
    if (!calendar) {
      return { status: "error", message: "No default calendar found" };
    }
    
    var event = calendar.createEvent(title, startTime, endTime, {
      description: description,
      guests: attendees.join(','),
      sendInvites: true
    });
    
    // Log meeting in CRM (create a task)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tasksSheet = ss.getSheetByName(TASKS_SHEET);
    
    if (tasksSheet && (opportunityId || accountId)) {
      var headers = tasksSheet.getRange(1, 1, 1, tasksSheet.getLastColumn()).getValues()[0];
      var dataRows = tasksSheet.getDataRange().getValues();
      
      var taskId = "TASK-" + String(dataRows.length).padStart(3, '0');
      var newRow = [];
      
      headers.forEach(function(header, index) {
        if (header === 'Task ID') {
          newRow[index] = taskId;
        } else if (header === 'Subject') {
          newRow[index] = 'Meeting: ' + title;
        } else if (header === 'Due Date') {
          newRow[index] = startTime;
        } else if (header === 'Status') {
          newRow[index] = 'Pending';
        } else if (header === 'Priority') {
          newRow[index] = 'High';
        } else if (header === 'Notes') {
          newRow[index] = 'Calendar Event: ' + event.getId() + '\n' + description + '\nAttendees: ' + attendees.join(', ');
        } else if (header === 'Related Opportunity ID') {
          newRow[index] = opportunityId || '';
        } else if (header === 'Related Account ID') {
          newRow[index] = accountId || '';
        } else {
          newRow[index] = '';
        }
      });
      
      tasksSheet.appendRow(newRow);
      Logger.log("Meeting logged in CRM: " + taskId);
    }
    
    return {
      status: "success",
      eventId: event.getId(),
      message: "Calendar event created and logged in CRM"
    };
  } catch (error) {
    Logger.log("createCalendarEvent Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Create reminder task from calendar
 */
function createReminderFromCalendar(title, dueDate, notes, opportunityId, accountId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tasksSheet = ss.getSheetByName(TASKS_SHEET);
    
    if (!tasksSheet) {
      return { status: "error", message: "Tasks sheet not found" };
    }
    
    var headers = tasksSheet.getRange(1, 1, 1, tasksSheet.getLastColumn()).getValues()[0];
    var dataRows = tasksSheet.getDataRange().getValues();
    
    var taskId = "TASK-" + String(dataRows.length).padStart(3, '0');
    var newRow = [];
    
    headers.forEach(function(header, index) {
      if (header === 'Task ID') {
        newRow[index] = taskId;
      } else if (header === 'Subject') {
        newRow[index] = title;
      } else if (header === 'Due Date') {
        newRow[index] = dueDate;
      } else if (header === 'Status') {
        newRow[index] = 'Pending';
      } else if (header === 'Priority') {
        newRow[index] = 'Medium';
      } else if (header === 'Notes') {
        newRow[index] = notes || '';
      } else if (header === 'Related Opportunity ID') {
        newRow[index] = opportunityId || '';
      } else if (header === 'Related Account ID') {
        newRow[index] = accountId || '';
      } else {
        newRow[index] = '';
      }
    });
    
    tasksSheet.appendRow(newRow);
    
    return { status: "success", taskId: taskId, message: "Reminder created in CRM" };
  } catch (error) {
    Logger.log("createReminderFromCalendar Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

// ============================================================================
// GOOGLE DRIVE INTEGRATION
// ============================================================================

/**
 * Store document in Google Drive and link to opportunity/account
 */
function storeDocumentInDrive(fileName, content, mimeType, folderName, opportunityId, accountId) {
  try {
    // Get or create folder for CRM documents
    var driveFolder = getOrCreateDriveFolder(folderName || 'CRM Documents');
    
    // Create file in Drive
    var file = driveFolder.createFile(fileName, content, mimeType);
    
    // Update opportunity or account with link to document
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var fileUrl = file.getUrl();
    
    if (opportunityId) {
      var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
      if (oppsSheet) {
        var oppsData = oppsSheet.getDataRange().getValues();
        var oppHeaders = oppsData[0];
        var oppIdCol = oppHeaders.indexOf('Opportunity ID');
        var linkToPlansCol = oppHeaders.indexOf('Link to Plans');
        
        for (var i = 1; i < oppsData.length; i++) {
          if (oppIdCol >= 0 && oppsData[i][oppIdCol] == opportunityId) {
            if (linkToPlansCol >= 0) {
              var existingLink = oppsData[i][linkToPlansCol] || '';
              var newLink = existingLink ? existingLink + '\n' + fileName + ': ' + fileUrl : fileName + ': ' + fileUrl;
              oppsSheet.getRange(i + 1, linkToPlansCol + 1).setValue(newLink);
            }
            break;
          }
        }
      }
    }
    
    if (accountId) {
      var accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET);
      if (accountsSheet) {
        var accData = accountsSheet.getDataRange().getValues();
        var accHeaders = accData[0];
        var accIdCol = accHeaders.indexOf('Account ID');
        var notesCol = accHeaders.indexOf('Notes');
        
        for (var i = 1; i < accData.length; i++) {
          if (accIdCol >= 0 && accData[i][accIdCol] == accountId) {
            if (notesCol >= 0) {
              var existingNotes = accData[i][notesCol] || '';
              var newNotes = existingNotes + '\nDocument: ' + fileName + ' - ' + fileUrl;
              accountsSheet.getRange(i + 1, notesCol + 1).setValue(newNotes);
            }
            break;
          }
        }
      }
    }
    
    return {
      status: "success",
      fileId: file.getId(),
      fileUrl: fileUrl,
      message: "Document stored and linked in CRM"
    };
  } catch (error) {
    Logger.log("storeDocumentInDrive Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Get or create a folder in Google Drive
 */
function getOrCreateDriveFolder(folderName) {
  try {
    var folders = DriveApp.getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      return folders.next();
    } else {
      // Create new folder
      return DriveApp.createFolder(folderName);
    }
  } catch (error) {
    Logger.log("getOrCreateDriveFolder Error: " + error.toString());
    throw error;
  }
}

/**
 * Store proposal document in Drive
 */
function storeProposal(proposalContent, opportunityId, proposalVersion) {
  try {
    var fileName = 'Proposal_' + opportunityId + '_v' + (proposalVersion || '1.0') + '.pdf';
    var folderName = 'Proposals';
    
    return storeDocumentInDrive(fileName, proposalContent, 'application/pdf', folderName, opportunityId, null);
  } catch (error) {
    Logger.log("storeProposal Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

// ============================================================================
// API HANDLERS FOR INTEGRATIONS
// ============================================================================

/**
 * Handle send Gmail email request
 */
function handleSendGmailEmail(data) {
  try {
    var to = data.to;
    var subject = data.subject;
    var body = data.body;
    var opportunityId = data.opportunityId || null;
    var accountId = data.accountId || null;
    
    if (!to || !subject || !body) {
      return { status: "error", message: "Missing required fields: to, subject, body" };
    }
    
    return sendGmailEmail(to, subject, body, opportunityId, accountId);
  } catch (error) {
    Logger.log("handleSendGmailEmail Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Handle create calendar event request
 */
function handleCreateCalendarEvent(data) {
  try {
    var title = data.title;
    var description = data.description || '';
    var startTime = data.startTime ? new Date(data.startTime) : null;
    var endTime = data.endTime ? new Date(data.endTime) : null;
    var attendees = data.attendees || [];
    var opportunityId = data.opportunityId || null;
    var accountId = data.accountId || null;
    
    if (!title || !startTime || !endTime) {
      return { status: "error", message: "Missing required fields: title, startTime, endTime" };
    }
    
    return createCalendarEvent(title, description, startTime, endTime, attendees, opportunityId, accountId);
  } catch (error) {
    Logger.log("handleCreateCalendarEvent Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Handle store document request
 */
function handleStoreDocument(data) {
  try {
    var fileName = data.fileName;
    var content = data.content;
    var mimeType = data.mimeType || 'text/plain';
    var folderName = data.folderName || 'CRM Documents';
    var opportunityId = data.opportunityId || null;
    var accountId = data.accountId || null;
    
    if (!fileName || !content) {
      return { status: "error", message: "Missing required fields: fileName, content" };
    }
    
    return storeDocumentInDrive(fileName, content, mimeType, folderName, opportunityId, accountId);
  } catch (error) {
    Logger.log("handleStoreDocument Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Handle store proposal request
 */
function handleStoreProposal(data) {
  try {
    var proposalContent = data.proposalContent;
    var opportunityId = data.opportunityId;
    var proposalVersion = data.proposalVersion || '1.0';
    
    if (!proposalContent || !opportunityId) {
      return { status: "error", message: "Missing required fields: proposalContent, opportunityId" };
    }
    
    return storeProposal(proposalContent, opportunityId, proposalVersion);
  } catch (error) {
    Logger.log("handleStoreProposal Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Get all alerts (overdue tasks and stagnation alerts) for dashboard
 * Filters by userName if provided (for Sales Reps to see only their alerts)
 * Managers/Ops see all alerts
 */
function getAlertsData(userName, userRole) {
  try {
    // Sales Reps only see their own alerts, others see all
    var filterByUser = (userRole === 'Sales Rep' || userRole === 'Data Specialist') ? userName : null;
    
    var slaResult = checkOverdueTasks(filterByUser);
    var stagnationResult = checkStatusStagnation(filterByUser);
    
    return {
      status: "success",
      data: {
        overdueTasks: slaResult.overdueTasks || [],
        ongoingIssues: slaResult.ongoingIssues || [],
        stagnationAlerts: stagnationResult.alerts || []
      }
    };
  } catch (error) {
    Logger.log("getAlertsData Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

// ============================================================================
// REPORTING & ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get Pipeline Summary - Count of opportunities by stage
 */
function getPipelineSummary() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    
    if (!oppsSheet) {
      return { status: "error", message: "Opportunities sheet not found" };
    }
    
    var data = oppsSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: {} };
    }
    
    var headers = data[0];
    var stageCol = headers.indexOf('Stage');
    
    if (stageCol < 0) {
      return { status: "error", message: "Stage column not found" };
    }
    
    var summary = {};
    
    // Initialize all stages
    STAGE_ORDER.forEach(function(stage) {
      summary[stage] = 0;
    });
    
    // Count opportunities by stage
    for (var i = 1; i < data.length; i++) {
      var stage = data[i][stageCol];
      if (stage && summary.hasOwnProperty(stage)) {
        summary[stage] = (summary[stage] || 0) + 1;
      }
    }
    
    // Calculate totals
    var totalActive = 0;
    var totalClosed = 0;
    STAGE_ORDER.forEach(function(stage) {
      if (stage === 'Closed Won' || stage === 'Closed Lost') {
        totalClosed += summary[stage] || 0;
      } else {
        totalActive += summary[stage] || 0;
      }
    });
    
    return {
      status: "success",
      data: {
        byStage: summary,
        totalActive: totalActive,
        totalClosed: totalClosed,
        total: totalActive + totalClosed
      }
    };
  } catch (error) {
    Logger.log("getPipelineSummary Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Get Revenue Forecast - Weighted revenue by stage
 */
function getRevenueForecast() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    
    if (!oppsSheet) {
      return { status: "error", message: "Opportunities sheet not found" };
    }
    
    var data = oppsSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: { totalForecast: 0, byStage: {} } };
    }
    
    var headers = data[0];
    var stageCol = headers.indexOf('Stage');
    var probCol = headers.indexOf('Forecast Probability');
    var estimatedRevenueCol = headers.indexOf('Estimated Revenue');
    var proposalAmountCol = headers.indexOf('Proposal Amount');
    var updatedQuoteCol = headers.indexOf('Updated Quote');
    var finalDealValueCol = headers.indexOf('Final Deal Value');
    
    var forecastByStage = {};
    var totalForecast = 0;
    
    // Initialize stages
    STAGE_ORDER.forEach(function(stage) {
      forecastByStage[stage] = {
        count: 0,
        totalValue: 0,
        weightedForecast: 0
      };
    });
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var stage = row[stageCol];
      
      // Skip closed lost
      if (stage === 'Closed Lost') {
        continue;
      }
      
      // Get revenue value (priority: Final Deal Value > Updated Quote > Proposal Amount > Estimated Revenue)
      var revenue = 0;
      if (finalDealValueCol >= 0 && row[finalDealValueCol]) {
        revenue = parseFloat(row[finalDealValueCol]) || 0;
      } else if (updatedQuoteCol >= 0 && row[updatedQuoteCol]) {
        revenue = parseFloat(row[updatedQuoteCol]) || 0;
      } else if (proposalAmountCol >= 0 && row[proposalAmountCol]) {
        revenue = parseFloat(row[proposalAmountCol]) || 0;
      } else if (estimatedRevenueCol >= 0 && row[estimatedRevenueCol]) {
        revenue = parseFloat(row[estimatedRevenueCol]) || 0;
      }
      
      if (revenue > 0 && stage && forecastByStage.hasOwnProperty(stage)) {
        var probability = probCol >= 0 ? (parseFloat(row[probCol]) || STAGE_PROBABILITIES[stage] || 0) : (STAGE_PROBABILITIES[stage] || 0);
        var weightedValue = revenue * probability;
        
        forecastByStage[stage].count += 1;
        forecastByStage[stage].totalValue += revenue;
        forecastByStage[stage].weightedForecast += weightedValue;
        
        totalForecast += weightedValue;
      }
    }
    
    return {
      status: "success",
      data: {
        totalForecast: totalForecast,
        byStage: forecastByStage
      }
    };
  } catch (error) {
    Logger.log("getRevenueForecast Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Get Top Opportunities - Ranked by weighted value
 */
function getTopOpportunities(limit) {
  try {
    limit = limit || 10;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    
    if (!oppsSheet) {
      return { status: "error", message: "Opportunities sheet not found" };
    }
    
    var data = oppsSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: [] };
    }
    
    var headers = data[0];
    var oppIdCol = headers.indexOf('Opportunity ID');
    var oppNameCol = headers.indexOf('Opportunity Name');
    var stageCol = headers.indexOf('Stage');
    var probCol = headers.indexOf('Forecast Probability');
    var ownerCol = headers.indexOf('Assigned Rep');
    var estimatedRevenueCol = headers.indexOf('Estimated Revenue');
    var proposalAmountCol = headers.indexOf('Proposal Amount');
    var updatedQuoteCol = headers.indexOf('Updated Quote');
    var finalDealValueCol = headers.indexOf('Final Deal Value');
    
    var opportunities = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var stage = row[stageCol];
      
      // Skip closed lost
      if (stage === 'Closed Lost') {
        continue;
      }
      
      // Get revenue value
      var revenue = 0;
      if (finalDealValueCol >= 0 && row[finalDealValueCol]) {
        revenue = parseFloat(row[finalDealValueCol]) || 0;
      } else if (updatedQuoteCol >= 0 && row[updatedQuoteCol]) {
        revenue = parseFloat(row[updatedQuoteCol]) || 0;
      } else if (proposalAmountCol >= 0 && row[proposalAmountCol]) {
        revenue = parseFloat(row[proposalAmountCol]) || 0;
      } else if (estimatedRevenueCol >= 0 && row[estimatedRevenueCol]) {
        revenue = parseFloat(row[estimatedRevenueCol]) || 0;
      }
      
      if (revenue > 0) {
        var probability = probCol >= 0 ? (parseFloat(row[probCol]) || STAGE_PROBABILITIES[stage] || 0) : (STAGE_PROBABILITIES[stage] || 0);
        var weightedValue = revenue * probability;
        
        opportunities.push({
          opportunityId: oppIdCol >= 0 ? row[oppIdCol] : '',
          opportunityName: oppNameCol >= 0 ? row[oppNameCol] : '',
          stage: stage,
          owner: ownerCol >= 0 ? row[ownerCol] : '',
          revenue: revenue,
          probability: probability,
          weightedValue: weightedValue
        });
      }
    }
    
    // Sort by weighted value (descending)
    opportunities.sort(function(a, b) {
      return b.weightedValue - a.weightedValue;
    });
    
    // Return top N
    return {
      status: "success",
      data: opportunities.slice(0, limit)
    };
  } catch (error) {
    Logger.log("getTopOpportunities Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Get Tasks Due Today / Overdue
 */
function getTasksDueTodayOverdue() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tasksSheet = ss.getSheetByName(TASKS_SHEET);
    
    if (!tasksSheet) {
      return { status: "success", data: { dueToday: [], overdue: [] } };
    }
    
    var data = tasksSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: { dueToday: [], overdue: [] } };
    }
    
    var headers = data[0];
    var dueDateCol = headers.indexOf('Due Date');
    var statusCol = headers.indexOf('Status');
    var subjectCol = headers.indexOf('Subject');
    var ownerCol = headers.indexOf('Owner');
    var priorityCol = headers.indexOf('Priority');
    var taskIdCol = headers.indexOf('Task ID');
    var oppIdCol = headers.indexOf('Related Opportunity ID');
    
    if (dueDateCol < 0) {
      return { status: "success", data: { dueToday: [], overdue: [] } };
    }
    
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    
    var dueToday = [];
    var overdue = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var dueDate = row[dueDateCol];
      var status = statusCol >= 0 ? row[statusCol] : 'Pending';
      
      // Skip completed tasks
      if (status === 'Completed') {
        continue;
      }
      
      if (dueDate && dueDate instanceof Date) {
        var taskDueDate = new Date(dueDate);
        taskDueDate.setHours(0, 0, 0, 0);
        
        var task = {
          taskId: taskIdCol >= 0 ? row[taskIdCol] : '',
          subject: subjectCol >= 0 ? row[subjectCol] : '',
          owner: ownerCol >= 0 ? row[ownerCol] : '',
          priority: priorityCol >= 0 ? row[priorityCol] : 'Medium',
          dueDate: dueDate,
          opportunityId: oppIdCol >= 0 ? row[oppIdCol] : ''
        };
        
        if (taskDueDate.getTime() === today.getTime()) {
          dueToday.push(task);
        } else if (taskDueDate.getTime() < today.getTime()) {
          var daysOverdue = Math.floor((today.getTime() - taskDueDate.getTime()) / (1000 * 60 * 60 * 24));
          task.daysOverdue = daysOverdue;
          overdue.push(task);
        }
      }
    }
    
    // Sort overdue by days overdue (most overdue first)
    overdue.sort(function(a, b) {
      return b.daysOverdue - a.daysOverdue;
    });
    
    return {
      status: "success",
      data: {
        dueToday: dueToday,
        overdue: overdue
      }
    };
  } catch (error) {
    Logger.log("getTasksDueTodayOverdue Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Get Lead Source Effectiveness
 */
function getLeadSourceEffectiveness() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    
    if (!oppsSheet) {
      return { status: "error", message: "Opportunities sheet not found" };
    }
    
    var data = oppsSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: {} };
    }
    
    var headers = data[0];
    var leadSourceCol = headers.indexOf('Lead Source');
    var stageCol = headers.indexOf('Stage');
    var finalDealValueCol = headers.indexOf('Final Deal Value');
    
    if (leadSourceCol < 0) {
      return { status: "error", message: "Lead Source column not found" };
    }
    
    var effectiveness = {};
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var leadSource = row[leadSourceCol];
      var stage = row[stageCol];
      
      if (!leadSource) {
        leadSource = 'Unknown';
      }
      
      if (!effectiveness[leadSource]) {
        effectiveness[leadSource] = {
          total: 0,
          closedWon: 0,
          closedLost: 0,
          active: 0,
          totalRevenue: 0,
          wonRevenue: 0
        };
      }
      
      effectiveness[leadSource].total += 1;
      
      if (stage === 'Closed Won') {
        effectiveness[leadSource].closedWon += 1;
        var revenue = finalDealValueCol >= 0 ? (parseFloat(row[finalDealValueCol]) || 0) : 0;
        effectiveness[leadSource].wonRevenue += revenue;
        effectiveness[leadSource].totalRevenue += revenue;
      } else if (stage === 'Closed Lost') {
        effectiveness[leadSource].closedLost += 1;
      } else {
        effectiveness[leadSource].active += 1;
      }
    }
    
    // Calculate conversion rates
    for (var source in effectiveness) {
      var stats = effectiveness[source];
      stats.winRate = stats.total > 0 ? (stats.closedWon / stats.total) * 100 : 0;
      stats.lossRate = stats.total > 0 ? (stats.closedLost / stats.total) * 100 : 0;
      stats.avgRevenue = stats.closedWon > 0 ? stats.wonRevenue / stats.closedWon : 0;
    }
    
    return {
      status: "success",
      data: effectiveness
    };
  } catch (error) {
    Logger.log("getLeadSourceEffectiveness Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Get Rep Performance Scorecard
 */
function getRepPerformanceScorecard() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    
    if (!oppsSheet) {
      return { status: "error", message: "Opportunities sheet not found" };
    }
    
    var data = oppsSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: {} };
    }
    
    var headers = data[0];
    var ownerCol = headers.indexOf('Assigned Rep');
    var stageCol = headers.indexOf('Stage');
    var probCol = headers.indexOf('Forecast Probability');
    var estimatedRevenueCol = headers.indexOf('Estimated Revenue');
    var proposalAmountCol = headers.indexOf('Proposal Amount');
    var updatedQuoteCol = headers.indexOf('Updated Quote');
    var finalDealValueCol = headers.indexOf('Final Deal Value');
    
    if (ownerCol < 0) {
      return { status: "error", message: "Assigned Rep column not found" };
    }
    
    var performance = {};
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var owner = row[ownerCol];
      var stage = row[stageCol];
      
      if (!owner) {
        owner = 'Unassigned';
      }
      
      if (!performance[owner]) {
        performance[owner] = {
          totalOpportunities: 0,
          activeOpportunities: 0,
          closedWon: 0,
          closedLost: 0,
          totalRevenue: 0,
          weightedForecast: 0,
          avgDealSize: 0
        };
      }
      
      performance[owner].totalOpportunities += 1;
      
      // Get revenue value
      var revenue = 0;
      if (finalDealValueCol >= 0 && row[finalDealValueCol]) {
        revenue = parseFloat(row[finalDealValueCol]) || 0;
      } else if (updatedQuoteCol >= 0 && row[updatedQuoteCol]) {
        revenue = parseFloat(row[updatedQuoteCol]) || 0;
      } else if (proposalAmountCol >= 0 && row[proposalAmountCol]) {
        revenue = parseFloat(row[proposalAmountCol]) || 0;
      } else if (estimatedRevenueCol >= 0 && row[estimatedRevenueCol]) {
        revenue = parseFloat(row[estimatedRevenueCol]) || 0;
      }
      
      if (stage === 'Closed Won') {
        performance[owner].closedWon += 1;
        performance[owner].totalRevenue += revenue;
      } else if (stage === 'Closed Lost') {
        performance[owner].closedLost += 1;
      } else {
        performance[owner].activeOpportunities += 1;
        var probability = probCol >= 0 ? (parseFloat(row[probCol]) || 0) : 0;
        performance[owner].weightedForecast += revenue * probability;
      }
    }
    
    // Calculate metrics
    for (var rep in performance) {
      var stats = performance[rep];
      stats.winRate = stats.totalOpportunities > 0 ? (stats.closedWon / stats.totalOpportunities) * 100 : 0;
      stats.lossRate = stats.totalOpportunities > 0 ? (stats.closedLost / stats.totalOpportunities) * 100 : 0;
      stats.avgDealSize = stats.closedWon > 0 ? stats.totalRevenue / stats.closedWon : 0;
    }
    
    return {
      status: "success",
      data: performance
    };
  } catch (error) {
    Logger.log("getRepPerformanceScorecard Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Get Product Category Demand Breakdown
 */
function getProductCategoryDemand() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var oppsSheet = ss.getSheetByName(OPPORTUNITIES_SHEET);
    
    if (!oppsSheet) {
      return { status: "error", message: "Opportunities sheet not found" };
    }
    
    var data = oppsSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: "success", data: {} };
    }
    
    var headers = data[0];
    var productCategoriesCol = headers.indexOf('Required Product Categories');
    var interestTypeCol = headers.indexOf('Interest Type');
    var stageCol = headers.indexOf('Stage');
    var estimatedRevenueCol = headers.indexOf('Estimated Revenue');
    var proposalAmountCol = headers.indexOf('Proposal Amount');
    var updatedQuoteCol = headers.indexOf('Updated Quote');
    var finalDealValueCol = headers.indexOf('Final Deal Value');
    
    var demand = {};
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var stage = row[stageCol];
      
      // Skip closed lost
      if (stage === 'Closed Lost') {
        continue;
      }
      
      // Get product categories
      var categories = [];
      if (productCategoriesCol >= 0 && row[productCategoriesCol]) {
        var categoriesStr = String(row[productCategoriesCol]);
        categories = categoriesStr.split(',').map(function(cat) {
          return cat.trim();
        }).filter(function(cat) {
          return cat.length > 0;
        });
      }
      
      // Fallback to Interest Type if no categories
      if (categories.length === 0 && interestTypeCol >= 0 && row[interestTypeCol]) {
        categories = [String(row[interestTypeCol]).trim()];
      }
      
      // Get revenue value
      var revenue = 0;
      if (finalDealValueCol >= 0 && row[finalDealValueCol]) {
        revenue = parseFloat(row[finalDealValueCol]) || 0;
      } else if (updatedQuoteCol >= 0 && row[updatedQuoteCol]) {
        revenue = parseFloat(row[updatedQuoteCol]) || 0;
      } else if (proposalAmountCol >= 0 && row[proposalAmountCol]) {
        revenue = parseFloat(row[proposalAmountCol]) || 0;
      } else if (estimatedRevenueCol >= 0 && row[estimatedRevenueCol]) {
        revenue = parseFloat(row[estimatedRevenueCol]) || 0;
      }
      
      // If no categories found, use "Unknown"
      if (categories.length === 0) {
        categories = ['Unknown'];
      }
      
      // Count each category
      categories.forEach(function(category) {
        if (!demand[category]) {
          demand[category] = {
            count: 0,
            totalRevenue: 0,
            activeCount: 0,
            closedWonCount: 0,
            closedWonRevenue: 0
          };
        }
        
        demand[category].count += 1;
        demand[category].totalRevenue += revenue;
        
        if (stage === 'Closed Won') {
          demand[category].closedWonCount += 1;
          demand[category].closedWonRevenue += revenue;
        } else {
          demand[category].activeCount += 1;
        }
      });
    }
    
    // Calculate averages
    for (var category in demand) {
      var stats = demand[category];
      stats.avgRevenue = stats.count > 0 ? stats.totalRevenue / stats.count : 0;
      stats.avgWonRevenue = stats.closedWonCount > 0 ? stats.closedWonRevenue / stats.closedWonCount : 0;
    }
    
    return {
      status: "success",
      data: demand
    };
  } catch (error) {
    Logger.log("getProductCategoryDemand Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Get all reports data in one call (for dashboard)
 */
function getAllReportsData() {
  try {
    return {
      status: "success",
      data: {
        pipelineSummary: getPipelineSummary().data || {},
        revenueForecast: getRevenueForecast().data || {},
        topOpportunities: getTopOpportunities(10).data || [],
        tasksDueTodayOverdue: getTasksDueTodayOverdue().data || {},
        leadSourceEffectiveness: getLeadSourceEffectiveness().data || {},
        repPerformance: getRepPerformanceScorecard().data || {},
        productCategoryDemand: getProductCategoryDemand().data || {}
      }
    };
  } catch (error) {
    Logger.log("getAllReportsData Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

