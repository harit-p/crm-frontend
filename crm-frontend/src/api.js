import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const crmApi = {
    // Fetch all opportunities
    getOpportunities: async () => {
        // Apps Script requires 'text/plain' or weird headers to avoid CORS preflight issues sometimes, 
        // but standard GET usually works with 'no-cors' mode IF we just need opaque response, 
        // BUT we need data.
        // Standard fetch with redirect following is best for GAS Web Apps.
        try {
            const response = await axios.get(`${API_URL}?action=getOpportunities`);
            return response.data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Fetch Metadata (Stages)
    getMeta: async () => {
        try {
            const response = await axios.get(`${API_URL}?action=getMeta`);
            return response.data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Update Stage (uses POST)
    // Note: GAS Web Apps need specific handling for POST (CORS).
    // Often simpler to use 'no-cors' fetch or send data as URL params if body fails,
    // but let's try standard POST first.
    updateStage: async (id, stage) => {
        try {
            // Using 'application/x-www-form-urlencoded' often works better with GAS than JSON
            const response = await axios.post(`${API_URL}`,
                JSON.stringify({ action: "updateStage", id, stage }),
                { headers: { "Content-Type": "text/plain;charset=utf-8" } }
            );
            return response.data;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: error.message };
        }
    }
};
