import React, { createContext, useState, useContext, useEffect } from 'react';
import { crmApi } from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                const storedUser = localStorage.getItem('crm_user');
                const storedToken = localStorage.getItem('crm_token');
                
                if (storedUser && storedToken) {
                    const userData = JSON.parse(storedUser);
                    // Verify token is still valid
                    const result = await crmApi.verifyToken(storedToken);
                    if (result.status === 'success') {
                        setUser(userData);
                        setIsAuthenticated(true);
                    } else {
                        // Token invalid, clear storage
                        localStorage.removeItem('crm_user');
                        localStorage.removeItem('crm_token');
                    }
                }
            } catch (error) {
                console.error('Session check failed:', error);
                localStorage.removeItem('crm_user');
                localStorage.removeItem('crm_token');
            } finally {
                setLoading(false);
            }
        };

        checkSession();
    }, []);

    const login = async (email, password) => {
        try {
            const result = await crmApi.login(email, password);
            if (result.status === 'success') {
                const userData = result.data.user;
                const token = result.data.token;
                
                localStorage.setItem('crm_user', JSON.stringify(userData));
                localStorage.setItem('crm_token', token);
                
                setUser(userData);
                setIsAuthenticated(true);
                return { success: true };
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            return { success: false, message: error.message || 'Login failed' };
        }
    };

    const register = async (name, email, password, role) => {
        try {
            const result = await crmApi.register(name, email, password, role);
            if (result.status === 'success') {
                const userData = result.data.user;
                const token = result.data.token;
                
                localStorage.setItem('crm_user', JSON.stringify(userData));
                localStorage.setItem('crm_token', token);
                
                setUser(userData);
                setIsAuthenticated(true);
                return { success: true };
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            return { success: false, message: error.message || 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('crm_user');
        localStorage.removeItem('crm_token');
        setUser(null);
        setIsAuthenticated(false);
    };

    const hasRole = (allowedRoles) => {
        if (!user || !user.Role) return false;
        return allowedRoles.includes(user.Role);
    };

    const hasPermission = (permission) => {
        if (!user || !user.Role) return false;
        
        // Define permissions by role (based on FRD requirements)
        const rolePermissions = {
            'Exec': [
                'view_all',           // Read-only dashboards
                'view_analytics',      // View analytics
                'export_data'          // Export permissions
            ],
            'Ops/Management': [
                'view_all',            // Full visibility
                'edit_all',            // Edit-level permissions
                'override_deals',      // Override/approve deal changes
                'view_analytics',
                'manage_tasks'
            ],
            'Data Specialist': [
                'view_all',            // Can view all
                'edit_contacts',       // Can create/edit contacts
                'edit_accounts',       // Can create/edit accounts
                'edit_markets',        // Can create/edit markets
                'move_to_new_lead',    // Can move to New Lead
                'move_to_contact_made' // Can move to Contact Made
                // Cannot move past Contact Made
                // Cannot mark as Closed Won/Lost
            ],
            'Sales Rep': [
                'view_own',            // Cannot alter other reps' deals
                'edit_own',            // Full CRUD on own deals
                'create_opportunities', // Can create opportunities
                'move_deals',          // Can move deals through pipeline stages
                'edit_contacts',       // Full CRUD on contacts
                'edit_accounts',        // Full CRUD on accounts
                'edit_leads'           // Full CRUD on leads
                // Cannot modify system settings
            ]
        };
        
        const permissions = rolePermissions[user.Role] || [];
        return permissions.includes(permission);
    };

    // Check if user can move deal to specific stage
    const canMoveToStage = (targetStage) => {
        if (!user || !user.Role) return false;
        
        // Data Specialist restrictions
        if (user.Role === 'Data Specialist') {
            const allowedStages = ['New Lead', 'Contact Made'];
            return allowedStages.includes(targetStage);
        }
        
        // Exec is read-only
        if (user.Role === 'Exec') {
            return false;
        }
        
        // Sales Rep and Ops/Management can move to any stage
        return true;
    };

    // Check if user can edit a specific deal
    const canEditDeal = (deal) => {
        if (!user || !user.Role) return false;
        
        // Exec is read-only
        if (user.Role === 'Exec') {
            return false;
        }
        
        // Ops/Management can edit all
        if (user.Role === 'Ops/Management') {
            return true;
        }
        
        // Data Specialist can only edit if not past Contact Made
        if (user.Role === 'Data Specialist') {
            const restrictedStages = ['Discovery Completed', 'Qualified Opportunity', 
                                      'Proposal Sent', 'Negotiation / Decision', 
                                      'Verbal Win', 'Closed Won', 'Closed Lost'];
            return !restrictedStages.includes(deal.stage);
        }
        
        // Sales Rep can only edit their own deals
        if (user.Role === 'Sales Rep') {
            return deal.owner === user.Name || !deal.owner;
        }
        
        return false;
    };

    // Check if user can edit an account
    const canEditAccount = (account) => {
        if (!user || !user.Role) return false;
        
        // Exec is read-only
        if (user.Role === 'Exec') {
            return false;
        }
        
        // Ops/Management can edit all
        if (user.Role === 'Ops/Management') {
            return true;
        }
        
        // Data Specialist and Sales Rep can edit accounts (they have edit_accounts permission)
        if (user.Role === 'Data Specialist' || user.Role === 'Sales Rep') {
            return true;
        }
        
        return false;
    };

    // Check if user can edit a contact
    const canEditContact = (contact) => {
        if (!user || !user.Role) return false;
        
        // Exec is read-only
        if (user.Role === 'Exec') {
            return false;
        }
        
        // Ops/Management can edit all
        if (user.Role === 'Ops/Management') {
            return true;
        }
        
        // Data Specialist and Sales Rep can edit contacts (they have edit_contacts permission)
        if (user.Role === 'Data Specialist' || user.Role === 'Sales Rep') {
            return true;
        }
        
        return false;
    };

    // Check if user can edit a task
    const canEditTask = (task) => {
        if (!user || !user.Role) return false;
        
        // Exec is read-only
        if (user.Role === 'Exec') {
            return false;
        }
        
        // Ops/Management can edit all tasks
        if (user.Role === 'Ops/Management') {
            return true;
        }
        
        // Sales Rep can edit own tasks
        if (user.Role === 'Sales Rep') {
            return task.Owner === user.Name || !task.Owner;
        }
        
        // Data Specialist can edit own tasks
        if (user.Role === 'Data Specialist') {
            return task.Owner === user.Name || !task.Owner;
        }
        
        return false;
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        hasRole,
        hasPermission,
        canMoveToStage,
        canEditDeal,
        canEditAccount,
        canEditContact,
        canEditTask
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

