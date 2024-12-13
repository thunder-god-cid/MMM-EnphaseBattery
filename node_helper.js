/* MMM-EnphaseBattery/node_helper.js */
const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper for: " + this.name);
        this.config = null;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "ENPHASE_CONFIG") {
            this.config = payload;
        } else if (notification === "GET_BATTERY_DATA") {
            this.fetchBatteryData();
        }
    },

    fetchBatteryData: async function() {
        try {
            const response = await axios.get(
                `https://api.enphaseenergy.com/api/v2/systems/${this.config.systemId}/summary`,
                {
                    params: {
                        key: this.config.apiKey,
                        user_id: this.config.userId
                    }
                }
            );

            // Process the data
            const batteryData = {
                status: response.data.status,
                charge_level: this.calculateChargeLevel(response.data)
            };

            this.sendSocketNotification("BATTERY_DATA", batteryData);
        } catch (error) {
            console.error("Error fetching battery data:", error);
        }
    },

    calculateChargeLevel: function(data) {
        // You might need to adjust this based on the actual API response structure
        // This is a placeholder calculation
        return Math.round((data.energy_today / data.size_w) * 100);
    }
});

