const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
    start: function() {
        console.log("MMM-EnphaseBattery: Starting node helper");
        this.config = null;
    },

    socketNotificationReceived: function(notification, payload) {
        console.log("MMM-EnphaseBattery: Node helper received notification:", notification);
        
        if (notification === "ENPHASE_CONFIG") {
            this.config = payload;
            console.log("MMM-EnphaseBattery: Configuration received", {
                hasApiKey: !!this.config.apiKey,
                hasUserId: !!this.config.userId,
                hasSystemId: !!this.config.systemId
            });
        } else if (notification === "GET_BATTERY_DATA") {
            if (!this.config) {
                console.error("MMM-EnphaseBattery: No configuration available");
                this.sendSocketNotification("BATTERY_DATA", { 
                    error: "Module not configured" 
                });
                return;
            }
            this.fetchBatteryData();
        }
    },

    fetchBatteryData: async function() {
        console.log("MMM-EnphaseBattery: Fetching battery data");
        
        if (!this.config.apiKey || !this.config.userId || !this.config.systemId) {
            console.error("MMM-EnphaseBattery: Missing required configuration");
            this.sendSocketNotification("BATTERY_DATA", { 
                error: "Missing API credentials" 
            });
            return;
        }

        try {
            const url = `https://api.enphaseenergy.com/api/v2/systems/${this.config.systemId}/summary`;
            console.log("MMM-EnphaseBattery: Making API request to:", url);

            const response = await axios.get(url, {
                params: {
                    key: this.config.apiKey,
                    user_id: this.config.userId
                },
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                console.error("MMM-EnphaseBattery: Authentication failed. Please verify API credentials.");
                this.sendSocketNotification("BATTERY_DATA", { 
                    error: "Authentication failed. Please verify API credentials." 
                });
                return;
            }

            console.log("MMM-EnphaseBattery: Raw API response:", response.data);

            // Process the data
            const batteryData = {
                status: response.data.status,
                charge_level: this.calculateChargeLevel(response.data)
            };

            console.log("MMM-EnphaseBattery: Processed battery data:", batteryData);
            this.sendSocketNotification("BATTERY_DATA", batteryData);

        } catch (error) {
            console.error("MMM-EnphaseBattery: API request failed:", {
                message: error.message,
                response: error.response ? {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                } : 'No response'
            });

            let errorMessage = "API Error";
            if (error.response) {
                switch (error.response.status) {
                    case 401:
                        errorMessage = "Invalid API credentials";
                        break;
                    case 403:
                        errorMessage = "Access forbidden - check API permissions";
                        break;
                    case 404:
                        errorMessage = "System ID not found";
                        break;
                    default:
                        errorMessage = `API Error: ${error.message}`;
                }
            }

            this.sendSocketNotification("BATTERY_DATA", { 
                error: errorMessage
            });
        }
    },

    calculateChargeLevel: function(data) {
        console.log("MMM-EnphaseBattery: Raw data for charge calculation:", data);
        // Adjust calculation based on actual API response structure
        if (data.size_w && data.size_w > 0) {
            return Math.round((data.energy_today / data.size_w) * 100);
        }
        return 0;
    }
});
