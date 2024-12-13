/* MMM-EnphaseBattery/MMM-EnphaseBattery.js */
Module.register("MMM-EnphaseBattery", {
    defaults: {
        apiKey: "",
        userId: "",
        systemId: "",
        updateInterval: 5 * 60 * 1000,
        animationSpeed: 1000,
        showStatus: true,
        showLastUpdate: true,
        showBatteryIcon: true,
        debug: true  // Enable debug logging
    },

    start: function() {
        Log.info("MMM-EnphaseBattery: Starting module");
        this.loaded = false;
        this.batteryData = null;
        this.lastUpdate = null;
        this.errorMessage = null;
        
        // Log configuration (removing sensitive data)
        Log.info("MMM-EnphaseBattery: Configuration loaded", {
            updateInterval: this.config.updateInterval,
            showStatus: this.config.showStatus,
            showLastUpdate: this.config.showLastUpdate,
            hasApiKey: !!this.config.apiKey,
            hasUserId: !!this.config.userId,
            hasSystemId: !!this.config.systemId
        });

        this.sendSocketNotification("ENPHASE_CONFIG", this.config);
        this.scheduleUpdate();
    },

    scheduleUpdate: function() {
        Log.info("MMM-EnphaseBattery: Scheduling updates");
        setInterval(() => {
            Log.debug("MMM-EnphaseBattery: Requesting battery data update");
            this.sendSocketNotification("GET_BATTERY_DATA");
        }, this.config.updateInterval);
        
        // Get initial data
        this.sendSocketNotification("GET_BATTERY_DATA");
    },

    socketNotificationReceived: function(notification, payload) {
        Log.debug("MMM-EnphaseBattery: Received socket notification:", notification);
        
        if (notification === "BATTERY_DATA") {
            if (payload.error) {
                Log.error("MMM-EnphaseBattery: Error received:", payload.error);
                this.errorMessage = payload.error;
            } else {
                Log.info("MMM-EnphaseBattery: Received battery data:", payload);
                this.batteryData = payload;
                this.errorMessage = null;
            }
            this.lastUpdate = new Date();
            this.loaded = true;
            this.updateDom(this.config.animationSpeed);
        }
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-EnphaseBattery";

        if (!this.loaded) {
            wrapper.innerHTML = "Loading battery data...";
            Log.debug("MMM-EnphaseBattery: Showing loading message");
            return wrapper;
        }

        if (this.errorMessage) {
            wrapper.innerHTML = `Error: ${this.errorMessage}`;
            wrapper.className += " error";
            Log.error("MMM-EnphaseBattery: Showing error message:", this.errorMessage);
            return wrapper;
        }

        // Rest of the getDom function remains the same...
        // (Previous display code here)

        return wrapper;
    }
});

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
                }
            });

            console.log("MMM-EnphaseBattery: Received API response:", {
                status: response.status,
                dataReceived: !!response.data
            });

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
                    data: error.response.data
                } : 'No response'
            });

            this.sendSocketNotification("BATTERY_DATA", { 
                error: `API Error: ${error.message}` 
            });
        }
    },

    calculateChargeLevel: function(data) {
        console.log("MMM-EnphaseBattery: Calculating charge level from data:", data);
        // You might need to adjust this based on the actual API response structure
        return Math.round((data.energy_today / data.size_w) * 100);
    }
});
