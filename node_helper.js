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
        try {
            // First get system summary to get battery info
            const summaryUrl = `https://api.enphaseenergy.com/api/v4/systems/${this.config.systemId}/summary`;
            console.log("MMM-EnphaseBattery: Making summary API request to:", summaryUrl);

            const summaryResponse = await axios.get(summaryUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'key': this.config.apiKey
                }
            });

            // Then get live status data
            const statusUrl = `https://api.enphaseenergy.com/api/v4/systems/${this.config.systemId}/live_data`;
            console.log("MMM-EnphaseBattery: Making status API request to:", statusUrl);

            const statusResponse = await axios.get(statusUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'key': this.config.apiKey,
                    'duration': '30'  // Minimum duration required by API
                }
            });

            // Process the combined data
            const summaryData = summaryResponse.data;
            const statusData = statusResponse.data.data.data;

            const batteryData = {
                status: statusData.grid_status || "Unknown",
                battery_power: statusData.battery_power || 0,
                battery_soc: statusData.battery_soc || 0,
                grid_status: statusData.grid_status || "Unknown",
                battery_capacity_wh: summaryData.battery_capacity_wh || 0,
                timestamp: statusData.timestamp_utc || new Date().toISOString()
            };

            console.log("MMM-EnphaseBattery: Processed battery data:", batteryData);
            this.sendSocketNotification("BATTERY_DATA", batteryData);

        } catch (error) {
            console.error("MMM-EnphaseBattery: API request failed:", {
                message: error.message,
                response: error.response ? {
                    status: error.response.status,
                    data: error.response.data
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
                    case 422:
                        errorMessage = "Invalid parameters - check system configuration";
                        break;
                    default:
                        errorMessage = `API Error: ${error.message}`;
                }
            }

            this.sendSocketNotification("BATTERY_DATA", { 
                error: errorMessage
            });
        }
    }
});
