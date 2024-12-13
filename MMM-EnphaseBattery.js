Module.register("MMM-EnphaseBattery", {
    defaults: {
        apiKey: "",
        accessToken: "",
        systemId: "",
        updateInterval: 5 * 60 * 1000,
        animationSpeed: 1000,
        showLastUpdate: true,
        showBatteryIcon: true,
        showCapacity: true,
        showDevicesReporting: false,
        debug: true
    },

    start: function() {
        Log.info("MMM-EnphaseBattery: Starting module");
        
        // Validate configuration
        if (!this.config.apiKey || !this.config.accessToken || !this.config.systemId) {
            Log.error("MMM-EnphaseBattery: Missing required configuration. Please check your config.js", {
                hasApiKey: !!this.config.apiKey,
                hasAccessToken: !!this.config.accessToken,
                hasSystemId: !!this.config.systemId
            });
            this.errorMessage = "Missing required configuration - check config.js";
            return;
        }

        Log.info("MMM-EnphaseBattery: Configuration loaded:", {
            systemId: this.config.systemId,
            hasApiKey: !!this.config.apiKey,
            hasAccessToken: !!this.config.accessToken,
            updateInterval: this.config.updateInterval
        });

        this.loaded = false;
        this.batteryData = null;
        this.lastUpdate = null;
        this.errorMessage = null;
        
        // Send configuration to node_helper
        this.sendSocketNotification("ENPHASE_CONFIG", this.config);
        this.scheduleUpdate();
    },

    scheduleUpdate: function() {
        Log.info("MMM-EnphaseBattery: Scheduling updates every", this.config.updateInterval, "ms");
        setInterval(() => {
            Log.debug("MMM-EnphaseBattery: Requesting battery data update");
            this.sendSocketNotification("GET_BATTERY_DATA");
        }, this.config.updateInterval);
        
        // Initial data request
        this.sendSocketNotification("GET_BATTERY_DATA");
    },

    socketNotificationReceived: function(notification, payload) {
        Log.debug("MMM-EnphaseBattery: Received socket notification:", notification, payload);
        
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

    // ... rest of the module code remains the same ...
});
