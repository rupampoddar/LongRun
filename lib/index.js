export class LongRun {
    // singleton instance
    static _instance;
    // constants
    static PREFIX_RUNNING = 'running_';
    static PREFIX_TRIGGER_KEY = 'trigger_';
    static PREFIX_START_POS = 'start_';
    static PREFIX_OPTION = 'option_';
    static RUNNING_MAX_SECONDS = 4 * 60;
    static RUNNING_DELAY_MINUTES = 1;
    /**
     * Private constructor
     * @private
     */
    constructor() { }
    /**
     * Returns singleton instance.
     */
    static get instance() {
        if (!this._instance) {
            this._instance = new LongRun();
        }
        return this._instance;
    }
    /** start time map */
    startTimeMap = {};
    /**
     * Returns if function is running now.
     * @param funcName
     */
    isRunning(funcName) {
        // get spreadsheet properties
        let properties = PropertiesService.getScriptProperties();
        let running = properties.getProperty(LongRun.PREFIX_RUNNING + funcName);
        return !(running == null || running === '');
    }
    /**
     * Sets the function is running
     * @param funcName
     * @param running
     */
    setRunning(funcName, running) {
        let properties = PropertiesService.getScriptProperties();
        const key = LongRun.PREFIX_RUNNING + funcName;
        if (running) {
            properties.setProperty(key, 'running');
        }
        else {
            properties.deleteProperty(key);
        }
    }
    /**
     * Sets max execution seconds
     * @param seconds
     */
    setMaxExecutionSeconds(seconds) {
        LongRun.RUNNING_MAX_SECONDS = seconds;
    }
    /**
     * Sets the trigger's delay minutes
     * @param minutes
     */
    setTriggerDelayMinutes(minutes) {
        LongRun.RUNNING_DELAY_MINUTES = minutes;
    }
    /**
     * Returns the function parameters
     * @param funcName
     */
    getParameters(funcName) {
        let properties = PropertiesService.getScriptProperties();
        let parameters = properties.getProperty(LongRun.PREFIX_OPTION + funcName);
        if (parameters != null) {
            return parameters.split(',');
        }
        else {
            return [];
        }
    }
    /**
     * Sets the function parameters.
     * @param funcName
     * @param parameters
     */
    setParameters(funcName, parameters) {
        let properties = PropertiesService.getScriptProperties();
        if (parameters != null) {
            properties.setProperty(LongRun.PREFIX_OPTION + funcName, parameters.join(','));
        }
        else {
            properties.deleteProperty(LongRun.PREFIX_OPTION + funcName);
        }
    }
    /**
     * Starts or Resume Long-Run process.
     * @returns start index ( 0 for the first time )
     */
    startOrResume(funcName) {
        // save start time
        this.startTimeMap[funcName] = new Date().getTime();
        // get properties of spreadsheet
        let properties = PropertiesService.getScriptProperties();
        // set running-flag
        this.setRunning(funcName, true);
        // if the trigger exists, delete it.
        this.deleteTrigger(LongRun.PREFIX_TRIGGER_KEY + funcName);
        // get start index
        let startPos = parseInt(properties.getProperty(LongRun.PREFIX_START_POS + funcName) || '0');
        if (!startPos) {
            return 0;
        }
        else {
            return startPos;
        }
    }
    /**
     * Determines whether the process should be suspended.
     * If it should be suspended, the next trigger will be registered.
     * @param funcName
     * @param nextIndex - start position when resuming
     * @return true - it should be suspended
     */
    checkShouldSuspend(funcName, nextIndex) {
        let startTime = this.startTimeMap[funcName];
        let diff = (new Date().getTime() - startTime) / 1000;
        // If it's past the specified time, suspend the process
        if (diff >= LongRun.RUNNING_MAX_SECONDS) {
            // register the next trigger and set running-flag off
            this.registerNextTrigger(funcName, nextIndex);
            return true;
        }
        else {
            return false;
        }
    }
    /**
     * Resets Long-Running variables
     * @param funcName
     */
    reset(funcName) {
        // delete trigger
        this.deleteTrigger(LongRun.PREFIX_TRIGGER_KEY + funcName);
        // delete spreadsheet properties
        let properties = PropertiesService.getScriptProperties();
        properties.deleteProperty(LongRun.PREFIX_START_POS + funcName);
        properties.deleteProperty(LongRun.PREFIX_OPTION + funcName);
        properties.deleteProperty(LongRun.PREFIX_RUNNING + funcName);
        properties.deleteProperty(LongRun.PREFIX_TRIGGER_KEY + funcName);
    }
    /**
     * Resets Long-Running variables if there is no next trigger.
     * Returns whether the command has finished or not.
     * @param funcName
     */
    end(funcName) {
        let ret = false;
        if (!this.existsNextTrigger(funcName)) {
            this.reset(funcName);
            ret = true;
        }
        return ret;
    }
    /**
     * Returns if there is next trigger.
     * @param funcName
     */
    existsNextTrigger(funcName) {
        let triggerId = PropertiesService.getScriptProperties().getProperty(LongRun.PREFIX_TRIGGER_KEY + funcName);
        return triggerId != null;
    }
    /**
     * register the next trigger and set running-flag off
     * @param funcName
     * @param nextIndex - start position when resuming
     */
    registerNextTrigger(funcName, nextIndex) {
        // get spreadsheet properties
        let properties = PropertiesService.getScriptProperties();
        properties.setProperty(LongRun.PREFIX_START_POS + funcName, String(nextIndex)); // save next start position
        this.setTrigger(LongRun.PREFIX_TRIGGER_KEY + funcName, funcName); // set trigger
        // turn off running-flag
        properties.deleteProperty(LongRun.PREFIX_RUNNING + funcName);
    }
    /**
     * Deletes the trigger
     * @param triggerKey
     */
    deleteTrigger(triggerKey) {
        let triggerId = PropertiesService.getScriptProperties().getProperty(triggerKey);
        if (!triggerId)
            return;
        ScriptApp.getProjectTriggers()
            .filter(function (trigger) {
            return trigger.getUniqueId() == triggerId;
        })
            .forEach(function (trigger) {
            ScriptApp.deleteTrigger(trigger);
        });
        PropertiesService.getScriptProperties().deleteProperty(triggerKey);
    }
    /**
     * Sets a trigger
     * @param triggerKey
     * @param funcName
     */
    setTrigger(triggerKey, funcName) {
        this.deleteTrigger(triggerKey); // delete if exists.
        let dt = new Date();
        dt.setMinutes(dt.getMinutes() + LongRun.RUNNING_DELAY_MINUTES); // will execute after the specified time
        let triggerId = ScriptApp.newTrigger(funcName)
            .timeBased()
            .at(dt)
            .create()
            .getUniqueId();
        // save the trigger id to delete the trigger later.
        PropertiesService.getScriptProperties().setProperty(triggerKey, triggerId);
    }
}
