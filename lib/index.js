export class LongRun {
    /**
     * Constructor
     *
     * @private
     */
    constructor() {
        this.startTimeMap = {}; // start time map
        this.properties = PropertiesService.getUserProperties();
    }
    /**
     * Returns singleton instance.
     */
    static get instance() {
        if (!this._instance) {
            this._instance = new LongRun();
        }
        return this._instance;
    }
    /**
     * Prepares the long running function
     *
     * @param funcName Long running function name
     * @param options Setup options
     * @param funcArgs Arguments for the long running function
     */
    setup(funcName, options, funcArgs = []) {
        const { isAddon, // whether it's used in an addon or not
        execScope, // scope for properties service (only "user" is implemented currently)
        taskCount, // total task count (i.e. loop count)
        maxRuntime, // maximum acceptable run time of the long-running function in seconds
        triggerEveryNMinutes, // trigger the long-running function every n minutes
        triggerEveryNHours, // trigger the long-running function every n hours
        triggerEveryNDays, // trigger the long-running function every n days
        triggerEveryNWeeks, // trigger the long-running function every n weeks
         } = options;
        // if (execScope === 'script') {
        //   this.properties = PropertiesService.getScriptProperties();
        // } else if (execScope === 'document') {
        //   this.properties = PropertiesService.getDocumentProperties();
        // } else if (execScope === 'user') {
        //   this.properties = PropertiesService.getUserProperties();
        // }
        let triggerId = null;
        let triggerProperties = null;
        const clockTriggerBuilder = ScriptApp.newTrigger(funcName).timeBased();
        // add-on can use a time-driven trigger once per hour at most,
        // hence, triggerEveryNMinutes is not applicable.
        if (!isAddon && triggerEveryNMinutes !== null) {
            triggerId = clockTriggerBuilder
                .everyMinutes(triggerEveryNMinutes)
                .create()
                .getUniqueId();
            triggerProperties = {
                [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS]: triggerEveryNMinutes,
            };
        }
        else if (triggerEveryNHours) {
            triggerId = clockTriggerBuilder
                .everyHours(triggerEveryNHours)
                .create()
                .getUniqueId();
            triggerProperties = {
                [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_HOURS]: triggerEveryNHours,
            };
        }
        else if (triggerEveryNDays) {
            triggerId = clockTriggerBuilder
                .everyDays(triggerEveryNDays)
                .create()
                .getUniqueId();
            triggerProperties = {
                [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_DAYS]: triggerEveryNDays,
            };
        }
        else if (triggerEveryNWeeks) {
            triggerId = clockTriggerBuilder
                .everyWeeks(triggerEveryNWeeks)
                .create()
                .getUniqueId();
            triggerProperties = {
                [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_WEEKS]: triggerEveryNWeeks,
            };
        }
        if (triggerId !== null) {
            // set properties in batch.
            // (using es2015 computed property names)
            let properties = {
                [LongRun.PREFIX_OPTION_IS_ADDON]: String(isAddon),
                [LongRun.PREFIX_OPTION_EXEC_SCOPE + funcName]: execScope,
                [LongRun.PREFIX_OPTION_TASK_COUNT + funcName]: String(taskCount),
                [LongRun.PREFIX_OPTION_MAX_RUNTIME + funcName]: String(maxRuntime),
                [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS + funcName]: String(triggerEveryNMinutes),
                [LongRun.PREFIX_FUNC_ARGS + funcName]: JSON.stringify(funcArgs),
                [LongRun.PREFIX_TRIGGER_ID + funcName]: triggerId,
            };
            if (triggerProperties !== null) {
                properties = { ...properties, ...triggerProperties };
                this.properties.setProperties(properties);
            }
            else {
                throw new Error('setup failed, trigger recurrence missing.');
            }
        }
        else {
            throw new Error('setup failed');
        }
    }
    /**
     * This function is to be called from the long running function.
     * It returns the index from where the loop needs to be started.
     *
     * @param funcName name of the long running function
     * @returns index of the process or iteration
     */
    getStartIndex(funcName) {
        // save start time
        this.startTimeMap[funcName] = new Date().getTime();
        // set running flag
        this.setRunning(funcName, true);
        // if the trigger exists, delete it.
        // this.deleteTrigger(LongRun.PREFIX_TRIGGER_KEY + funcName);
        // calculate start index
        let lastCompletedProcessIndex = this.properties.getProperty(LongRun.PREFIX_TASK_COMPLETED_INDEX + funcName);
        if (lastCompletedProcessIndex !== null) {
            return parseInt(lastCompletedProcessIndex) + 1;
        }
        return 0;
    }
    /**
     * Determines whether the process should be suspended based on elapsed time.
     *
     * @param funcName
     * @param currentIndex - start position when resuming
     * @return true - it should be suspended
     */
    checkShouldSuspend(funcName, currentIndex) {
        // get the (long-running) function start time
        const startTime = this.startTimeMap[funcName];
        // calculate elapsed time (in seconds)
        const elapsedTime = (new Date().getTime() - startTime) / 1000;
        // if it's past the specified time, suspend the process
        if (elapsedTime >= LongRun.RUNNING_MAX_SECONDS) {
            // register the next trigger and set running-flag off
            // this.registerNextTrigger(funcName, nextIndex);
            // update the start index so that on next run it will
            // pick up from this index
            // this.properties.setProperty(
            //   LongRun.PREFIX_START_POS + funcName,
            //   String(currentIndex)
            // );
            // turn off running flag
            this.properties.deleteProperty(LongRun.PREFIX_RUNNING + funcName);
            return true;
        }
        else {
            // update current process index
            // this.properties.setProperty(
            //   LongRun.PREFIX_CURRENT_POS + funcName,
            //   String(currentIndex)
            // );
            return false;
        }
    }
    /**
     * Marks the task as completed
     *
     * @param funcName Long running function name
     * @param index Task index (loop index)
     */
    setTaskCompleted(funcName, index) {
        this.properties.setProperty(LongRun.PREFIX_TASK_COMPLETED_INDEX + funcName, String(index));
    }
    /**
     * Resets Long-Running variables if there is no next trigger.
     * Returns whether the command has finished or not.
     * @param funcName
     */
    end(funcName) {
        // let ret: boolean = false;
        // if (!this.existsNextTrigger(functionName)) {
        //   this.reset(functionName);
        //   ret = true;
        // }
        // return ret;
        // check if all the processes are completed
        const taskCount = this.properties.getProperty(LongRun.PREFIX_OPTION_TASK_COUNT + funcName);
        const completedTaskIndex = this.properties.getProperty(LongRun.PREFIX_TASK_COMPLETED_INDEX + funcName);
        if (taskCount !== null && completedTaskIndex !== null) {
            if (parseInt(taskCount) === parseInt(completedTaskIndex) - 1) {
                this.reset(funcName);
                return true;
            }
        }
        return false;
    }
    /**
     * Resets Long-Running variables
     * @param funcName
     */
    reset(funcName) {
        // delete trigger id from properties
        this.deleteTrigger(LongRun.PREFIX_TRIGGER_ID + funcName);
        // delete setup options from properties
        this.properties.deleteProperty(LongRun.PREFIX_OPTION_IS_ADDON + funcName);
        this.properties.deleteProperty(LongRun.PREFIX_OPTION_EXEC_SCOPE + funcName);
        this.properties.deleteProperty(LongRun.PREFIX_OPTION_TASK_COUNT + funcName);
        this.properties.deleteProperty(LongRun.PREFIX_OPTION_MAX_RUNTIME + funcName);
        this.properties.deleteProperty(LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS + funcName);
        this.properties.deleteProperty(LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_HOURS + funcName);
        this.properties.deleteProperty(LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_DAYS + funcName);
        this.properties.deleteProperty(LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_WEEKS + funcName);
        // delete function arguments from properties
        this.properties.deleteProperty(LongRun.PREFIX_FUNC_ARGS + funcName);
        this.properties.deleteProperty(LongRun.PREFIX_TASK_COMPLETED_INDEX + funcName);
        this.properties.deleteProperty(LongRun.PREFIX_RUNNING + funcName);
    }
    /**
     * Returns if function is running now.
     * @param funcName
     */
    isRunning(funcName) {
        let running = this.properties.getProperty(LongRun.PREFIX_RUNNING + funcName);
        return !(running == null || running === '');
    }
    /**
     * Sets the function is running
     *
     * @param funcName the name of the long running function
     * @param isRunning true or false
     */
    setRunning(funcName, isRunning) {
        const key = LongRun.PREFIX_RUNNING + funcName;
        if (isRunning) {
            this.properties.setProperty(key, 'running');
        }
        else {
            this.properties.deleteProperty(key);
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
    getSetupOptions(funcName) {
        // let parameters = this.properties.getProperty(LongRun.PREFIX_OPTION + funcName);
        // if (parameters != null) {
        //   return parameters.split(",");
        // } else {
        //   return [];
        // }
        const isAddon = Boolean(this.properties.getProperty(LongRun.PREFIX_OPTION_IS_ADDON + funcName));
        const execScope = this.properties.getProperty(LongRun.PREFIX_OPTION_EXEC_SCOPE + funcName);
        const taskCount = this.properties.getProperty(LongRun.PREFIX_OPTION_TASK_COUNT + funcName);
        const maxRuntime = this.properties.getProperty(LongRun.PREFIX_OPTION_MAX_RUNTIME + funcName);
        const triggerEveryNMinutes = this.properties.getProperty(LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS + funcName);
        const triggerEveryNHours = this.properties.getProperty(LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_HOURS + funcName);
        const triggerEveryNDays = this.properties.getProperty(LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_DAYS + funcName);
        const triggerEveryNWeeks = this.properties.getProperty(LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_WEEKS + funcName);
        if (execScope !== null &&
            taskCount !== null &&
            maxRuntime !== null &&
            triggerEveryNMinutes !== null) {
            return {
                isAddon: isAddon,
                execScope: execScope,
                taskCount: parseInt(taskCount),
                maxRuntime: parseInt(maxRuntime),
                triggerEveryNMinutes: triggerEveryNMinutes === null
                    ? null
                    : parseInt(triggerEveryNMinutes),
                triggerEveryNHours: triggerEveryNHours === null ? null : parseInt(triggerEveryNHours),
                triggerEveryNDays: triggerEveryNDays === null ? null : parseInt(triggerEveryNDays),
                triggerEveryNWeeks: triggerEveryNWeeks === null ? null : parseInt(triggerEveryNWeeks),
            };
        }
        return null;
    }
    /**
     * Sets the function parameters.
     * @param funcName
     * @param parameters
     */
    setParameters(funcName, parameters) {
        if (parameters != null) {
            this.properties.setProperty(LongRun.PREFIX_OPTION + funcName, parameters.join(','));
        }
        else {
            this.properties.deleteProperty(LongRun.PREFIX_OPTION + funcName);
        }
    }
    /**
     * Deletes the trigger at the end
     *
     * @param triggerKey
     */
    deleteTrigger(triggerKey) {
        const triggerId = this.properties.getProperty(triggerKey);
        if (!triggerId)
            return;
        console.log(ScriptApp.getProjectTriggers());
        // get the function execution scope
        // const execScope = this.properties.getProperty;
        ScriptApp.getProjectTriggers()
            .filter(function (trigger) {
            return trigger.getUniqueId() == triggerId;
        })
            .forEach(function (trigger) {
            ScriptApp.deleteTrigger(trigger);
        });
        this.properties.deleteProperty(triggerKey);
    }
}
// constants
LongRun.PREFIX_RUNNING = 'running_'; // in use
LongRun.PREFIX_TRIGGER_ID = 'trigger_'; // in use
LongRun.PREFIX_START_POS = 'start_';
LongRun.PREFIX_CURRENT_POS = 'current_';
LongRun.PREFIX_OPTION = 'option_';
// in use
LongRun.PREFIX_OPTION_IS_ADDON = 'option_is_addon';
LongRun.PREFIX_OPTION_EXEC_SCOPE = 'option_exec_scope_';
LongRun.PREFIX_OPTION_TASK_COUNT = 'option_task_count_';
LongRun.PREFIX_OPTION_MAX_RUNTIME = 'option_MAX_RUNTIME_';
LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS = 'option_trigger_every_n_minutes_';
LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_HOURS = 'option_trigger_every_n_hours_';
LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_DAYS = 'option_trigger_every_n_days_';
LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_WEEKS = 'option_trigger_every_n_weeks_';
LongRun.PREFIX_FUNC_ARGS = 'args_'; // in use
LongRun.PREFIX_TASK_COUNT = 'task_count_';
LongRun.PREFIX_TASK_COMPLETED_INDEX = 'task_completed_index_'; // in use
LongRun.RUNNING_MAX_SECONDS = 4 * 60;
LongRun.RUNNING_DELAY_MINUTES = 1;
