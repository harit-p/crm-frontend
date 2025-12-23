const API_URL = import.meta.env.VITE_API_URL;

// Helper to get auth token
const getAuthToken = () => {
    return localStorage.getItem('crm_token');
};

export const crmApi = {
    // Authentication endpoints
    login: async (email, password) => {
        try {
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify({ 
                    action: "login",
                    email: email,
                    password: password
                }),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Login Error:", error);
            return { status: "error", message: error.message || "Login failed" };
        }
    },

    register: async (name, email, password, role) => {
        try {
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify({ 
                    action: "register",
                    name: name,
                    email: email,
                    password: password,
                    role: role
                }),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Register Error:", error);
            return { status: "error", message: error.message || "Registration failed" };
        }
    },

    verifyToken: async (token) => {
        try {
            // Don't send custom headers for GET requests to avoid CORS preflight
            const response = await fetch(`${API_URL}?action=verifyToken&token=${encodeURIComponent(token)}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Token Verification Error:", error);
            return { status: "error", message: "Token verification failed" };
        }
    },

    // Fetch all opportunities
    getOpportunities: async () => {
        try {
            // Don't send custom headers for GET requests to avoid CORS preflight
            // Pass token as query parameter instead
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getOpportunities&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getOpportunities`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Fetch Metadata (Stages)
    getMeta: async () => {
        try {
            // Don't send custom headers for GET requests to avoid CORS preflight
            // Pass token as query parameter instead
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getMeta&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getMeta`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Update Stage (uses POST)
    updateStage: async (payload) => {
        try {
            // For POST, include token in body to avoid CORS preflight issues
            const token = getAuthToken();
            const body = { 
                action: "updateStage", 
                ...payload,
                token: token // Include token in body instead of header
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Create new opportunity/lead
    createOpportunity: async (opportunityData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "createOpportunity", 
                ...opportunityData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Get tasks for an opportunity
    getTasksForOpportunity: async (opportunityId) => {
        try {
            // Don't send custom headers for GET requests to avoid CORS preflight
            // Pass token as query parameter instead
            const token = getAuthToken();
            const url = token
                ? `${API_URL}?action=getTasks&opportunityId=${opportunityId}&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getTasks&opportunityId=${opportunityId}`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Accounts CRUD
    getAccounts: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getAccounts&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getAccounts`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    createAccount: async (accountData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "createAccount", 
                ...accountData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    updateAccount: async (accountId, accountData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "updateAccount",
                id: accountId,
                ...accountData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    deleteAccount: async (accountId) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "deleteAccount",
                id: accountId,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Contacts CRUD
    getContacts: async (accountId = null) => {
        try {
            const token = getAuthToken();
            let url = token 
                ? `${API_URL}?action=getContacts&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getContacts`;
            
            if (accountId) {
                url += `&accountId=${accountId}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    createContact: async (contactData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "createContact", 
                ...contactData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    updateContact: async (contactId, contactData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "updateContact",
                id: contactId,
                ...contactData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    deleteContact: async (contactId) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "deleteContact",
                id: contactId,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Tasks CRUD
    getAllTasks: async (filters = {}) => {
        try {
            const token = getAuthToken();
            let url = token 
                ? `${API_URL}?action=getAllTasks&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getAllTasks`;
            
            // Add filters as query params
            if (filters.opportunityId) {
                url += `&opportunityId=${filters.opportunityId}`;
            }
            if (filters.accountId) {
                url += `&accountId=${filters.accountId}`;
            }
            if (filters.owner) {
                url += `&owner=${encodeURIComponent(filters.owner)}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    createTask: async (taskData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "createTask", 
                ...taskData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    updateTask: async (taskId, taskData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "updateTask",
                id: taskId,
                ...taskData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    deleteTask: async (taskId) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "deleteTask",
                id: taskId,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Get users list (for assigning tasks/accounts)
    getUsers: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getUsers&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getUsers`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // SLA & Alerts endpoints
    getAlerts: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getAlerts&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getAlerts`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    checkOverdueTasks: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=checkOverdueTasks&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=checkOverdueTasks`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    checkStatusStagnation: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=checkStatusStagnation&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=checkStatusStagnation`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Gmail integration
    sendGmailEmail: async (emailData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "sendGmailEmail", 
                ...emailData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Google Calendar integration
    createCalendarEvent: async (eventData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "createCalendarEvent", 
                ...eventData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Google Drive integration
    storeDocument: async (documentData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "storeDocument", 
                ...documentData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    storeProposal: async (proposalData) => {
        try {
            const token = getAuthToken();
            const body = { 
                action: "storeProposal", 
                ...proposalData,
                token: token
            };
            
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(body),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Reporting & Analytics endpoints
    getPipelineSummary: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getPipelineSummary&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getPipelineSummary`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    getRevenueForecast: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getRevenueForecast&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getRevenueForecast`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    getTopOpportunities: async (limit = 10) => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getTopOpportunities&limit=${limit}&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getTopOpportunities&limit=${limit}`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    getTasksDueTodayOverdue: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getTasksDueTodayOverdue&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getTasksDueTodayOverdue`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    getLeadSourceEffectiveness: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getLeadSourceEffectiveness&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getLeadSourceEffectiveness`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    getRepPerformanceScorecard: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getRepPerformanceScorecard&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getRepPerformanceScorecard`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    getProductCategoryDemand: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getProductCategoryDemand&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getProductCategoryDemand`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    getAllReports: async () => {
        try {
            const token = getAuthToken();
            const url = token 
                ? `${API_URL}?action=getAllReports&token=${encodeURIComponent(token)}`
                : `${API_URL}?action=getAllReports`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    }
};
