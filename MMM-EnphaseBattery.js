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

        // Battery State of Charge
        if (this.batteryData.battery_soc !== null) {
            const soc = document.createElement("div");
            soc.className = "battery-soc";
            
            // Add battery icon if enabled
            if (this.config.showBatteryIcon) {
                const batteryLevel = Math.floor(this.batteryData.battery_soc / 20); // 0-5 levels
                soc.innerHTML = `<span class="fa fa-battery-${batteryLevel}"></span> `;
            }
            
            soc.innerHTML += `${this.batteryData.battery_soc}%`;
            container.appendChild(soc);
        }

        // Battery Power
        const power = document.createElement("div");
        power.className = "battery-power";
        
        if (this.batteryData.battery_power.charge > 0) {
            power.innerHTML = `Charging: ${this.batteryData.battery_power.charge}Wh`;
        } else if (this.batteryData.battery_power.discharge > 0) {
            power.innerHTML = `Discharging: ${this.batteryData.battery_power.discharge}Wh`;
        } else {
            power.innerHTML = "Idle";
        }
        container.appendChild(power);

        // Battery Capacity
        if (this.config.showCapacity && this.batteryData.battery_capacity_wh) {
            const capacity = document.createElement("div");
            capacity.className = "battery-capacity";
            capacity.innerHTML = `Capacity: ${(this.batteryData.battery_capacity_wh / 1000).toFixed(1)}kWh`;
            container.appendChild(capacity);
        }

        // Devices Reporting
        if (this.config.showDevicesReporting) {
            const devices = document.createElement("div");
            devices.className = "devices-reporting";
            devices.innerHTML = `Batteries reporting: ${Math.max(
                this.batteryData.devices_reporting.charge,
                this.batteryData.devices_reporting.discharge
            )}`;
            container.appendChild(devices);
        }

        // Last Update
        if (this.config.showLastUpdate && this.batteryData.last_report_at) {
            const update = document.createElement("div");
            update.className = "battery-update";
            const lastReport = new Date(this.batteryData.last_report_at * 1000);
            update.innerHTML = `Updated: ${lastReport.toLocaleTimeString()}`;
            container.appendChild(update);
        }

        wrapper.appendChild(container);
        return wrapper;
    },

    getStyles: function() {
        return [
            'font-awesome.css',
            'MMM-EnphaseBattery.css'
        ];
    }
});
