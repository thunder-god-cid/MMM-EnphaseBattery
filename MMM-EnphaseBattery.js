/* MMM-EnphaseBattery/MMM-EnphaseBattery.js */
Module.register("MMM-EnphaseBattery", {
    defaults: {
        apiKey: "",
        accessToken: "",  // OAuth access token
        systemId: "",
        updateInterval: 5 * 60 * 1000,
        animationSpeed: 1000,
        showStatus: true,
        showLastUpdate: true,
        showBatteryIcon: true,
        debug: true
    },

    start: function() {
        Log.info("MMM-EnphaseBattery: Starting module");
        this.loaded = false;
        this.batteryData = null;
        this.lastUpdate = null;
        this.errorMessage = null;
        
        Log.info("MMM-EnphaseBattery: Configuration loaded");
        this.sendSocketNotification("ENPHASE_CONFIG", this.config);
        this.scheduleUpdate();
    },

    scheduleUpdate: function() {
        Log.info("MMM-EnphaseBattery: Scheduling updates");
        setInterval(() => {
            this.sendSocketNotification("GET_BATTERY_DATA");
        }, this.config.updateInterval);
        
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
            return wrapper;
        }

        if (this.errorMessage) {
            wrapper.innerHTML = `Error: ${this.errorMessage}`;
            wrapper.className += " error";
            return wrapper;
        }

        const container = document.createElement("div");
        container.className = "battery-container";

        // Status
        if (this.config.showStatus && this.batteryData.status) {
            const status = document.createElement("div");
            status.className = "battery-status";
            status.innerHTML = `Status: ${this.batteryData.status}`;
            container.appendChild(status);
        }

        // Battery Power
        if (this.batteryData.battery_power !== undefined) {
            const power = document.createElement("div");
            power.className = "battery-power";
            const powerValue = Math.abs(this.batteryData.battery_power);
            const powerDirection = this.batteryData.battery_power > 0 ? "Charging" : "Discharging";
            power.innerHTML = `${powerDirection}: ${powerValue}W`;
            container.appendChild(power);
        }

        // Battery State of Charge
        if (this.batteryData.battery_soc !== undefined) {
            const soc = document.createElement("div");
            soc.className = "battery-soc";
            soc.innerHTML = `Charge: ${this.batteryData.battery_soc}%`;
            container.appendChild(soc);
        }

        // Last Update
        if (this.config.showLastUpdate && this.lastUpdate) {
            const update = document.createElement("div");
            update.className = "battery-update";
            update.innerHTML = `Updated: ${this.lastUpdate.toLocaleTimeString()}`;
            container.appendChild(update);
        }

        wrapper.appendChild(container);
        return wrapper;
    }
});