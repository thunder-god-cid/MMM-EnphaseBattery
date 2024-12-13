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
            // Get battery telemetry data
            const telemetryUrl = `https://api.enphaseenergy.com/api/v4/systems/${this.config.systemId}/telemetry/battery`;
            console.log("MMM-EnphaseBattery: Making telemetry API request to:", telemetryUrl);

            const telemetryResponse = await axios.get(telemetryUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'key': this.config.apiKey
                },
                params: {
                    granularity: 'day'  // Get latest day's data
                }
            });

            // Get system summary for additional battery info
            const summaryUrl = `https://api.enphaseenergy.com/api/v4/systems/${this.config.systemId}/summary`;
            console.log("MMM-EnphaseBattery: Making summary API request to:", summaryUrl);

            const summaryResponse = await axios.get(summaryUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'key': this.config.apiKey
                }
            });

            // Process the telemetry data
            const telemetryData = telemetryResponse.data;
            const summaryData = summaryResponse.data;
            
            // Get the most recent interval from telemetry data
            const latestInterval = telemetryData.intervals[telemetryData.intervals.length - 1];
            
            const batteryData = {
                battery_soc: latestInterval.soc ? latestInterval.soc.percent : null,
                battery_power: {
                    charge: latestInterval.charge ? latestInterval.charge.enwh : 0,
                    discharge: latestInterval.discharge ? latestInterval.discharge.enwh : 0
                },
                battery_capacity_wh: summaryData.battery_capacity_wh || null,
                last_report_at: telemetryData.meta ? telemetryData.meta.last_report_at : null,
                devices_reporting: {
                    charge: latestInterval.charge ? latestInterval.charge.devices_reporting : 0,
                    discharge: latestInterval.discharge ? latestInterval.discharge.devices_reporting : 0
                }
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
