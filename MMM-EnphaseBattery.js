/* MMM-EnphaseBattery/MMM-EnphaseBattery.js */
Module.register("MMM-EnphaseBattery", {
    defaults: {
        apiKey: "",
        userId: "",
        systemId: "",
        updateInterval: 5 * 60 * 1000, // 5 minutes
        animationSpeed: 1000,
        showStatus: true,
        showLastUpdate: true,
        showBatteryIcon: true
    },

    getStyles: function() {
        return ["MMM-EnphaseBattery.css"];
    },

    getScripts: function() {
        return [];
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.batteryData = null;
        this.lastUpdate = null;
        
        this.sendSocketNotification("ENPHASE_CONFIG", this.config);
        this.scheduleUpdate();
    },

    scheduleUpdate: function() {
        setInterval(() => {
            this.sendSocketNotification("GET_BATTERY_DATA");
        }, this.config.updateInterval);
        
        // Get initial data
        this.sendSocketNotification("GET_BATTERY_DATA");
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "BATTERY_DATA") {
            this.batteryData = payload;
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
            return wrapper;
        }

        // Main container
        const container = document.createElement("div");
        container.className = "battery-container";

        // Battery icon and level
        if (this.config.showBatteryIcon) {
            const batteryIcon = document.createElement("div");
            batteryIcon.className = "battery-icon";
            
            // Battery shell
            const batteryShell = document.createElement("div");
            batteryShell.className = "battery-shell";
            
            // Battery level
            const batteryLevel = document.createElement("div");
            batteryLevel.className = "battery-level";
            batteryLevel.style.height = `${this.batteryData.charge_level}%`;
            
            // Set color based on level
            if (this.batteryData.charge_level > 70) {
                batteryLevel.className += " high";
            } else if (this.batteryData.charge_level > 30) {
                batteryLevel.className += " medium";
            } else {
                batteryLevel.className += " low";
            }
            
            batteryShell.appendChild(batteryLevel);
            batteryIcon.appendChild(batteryShell);
            container.appendChild(batteryIcon);
        }

        // Battery percentage
        const percentage = document.createElement("div");
        percentage.className = "battery-percentage";
        percentage.innerHTML = `${this.batteryData.charge_level}%`;
        container.appendChild(percentage);

        // Status
        if (this.config.showStatus) {
            const status = document.createElement("div");
            status.className = "battery-status";
            status.innerHTML = this.batteryData.status;
            if (this.batteryData.status !== "normal") {
                status.className += " warning";
            }
            container.appendChild(status);
        }

        // Last update
        if (this.config.showLastUpdate && this.lastUpdate) {
            const update = document.createElement("div");
            update.className = "battery-update";
            update.innerHTML = "Updated: " + this.lastUpdate.toLocaleTimeString();
            container.appendChild(update);
        }

        wrapper.appendChild(container);
        return wrapper;
    }
});