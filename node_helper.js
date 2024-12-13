/* MMM-EnphaseBattery/node_helper.js */
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
            const url = `https://api.enphaseenergy.com/api/v4/systems/${this.config.systemId}/latest_telemetry`;
            console.log("MMM-EnphaseBattery: Making API request to:", url);

            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'key': this.config.apiKey
                }
            });

            console.log("MMM-EnphaseBattery: Raw API response:", response.data);

            // Process the data from v4 API format
            const telemetryData = response.data.data.data;
            const batteryData = {
                status: telemetryData.grid_status,
                battery_power: telemetryData.battery_power,
                battery_soc: telemetryData.battery_soc,
                grid_status: telemetryData.grid_status,
                timestamp: telemetryData.timestamp_utc
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