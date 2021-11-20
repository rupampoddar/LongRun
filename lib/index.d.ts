declare type EveryMinutesType = 1 | 5 | 10 | 15 | 30;
declare type ExecScopeType = "user" | "script" | "document";
export declare type SetupOptions = {
    isAddon: boolean;
    execScope: ExecScopeType;
    taskCount: number;
    maxRuntime: number;
    triggerEveryNMinutes: EveryMinutesType | null;
    triggerEveryNHours: number | null;
    triggerEveryNDays: number | null;
    triggerEveryNWeeks: number | null;
};
export declare class LongRun {
    private static _instance;
    static PREFIX_RUNNING: string;
    static PREFIX_TRIGGER_ID: string;
    static PREFIX_OPTION: string;
    static PREFIX_OPTION_IS_ADDON: string;
    static PREFIX_OPTION_EXEC_SCOPE: string;
    static PREFIX_OPTION_TASK_COUNT: string;
    static PREFIX_OPTION_MAX_RUNTIME: string;
    static PREFIX_OPTION_TRIGGER_EVERY_N_MINS: string;
    static PREFIX_OPTION_TRIGGER_EVERY_N_HOURS: string;
    static PREFIX_OPTION_TRIGGER_EVERY_N_DAYS: string;
    static PREFIX_OPTION_TRIGGER_EVERY_N_WEEKS: string;
    static PREFIX_FUNC_ARGS: string;
    static PREFIX_TASK_COMPLETED_INDEX: string;
    static RUNNING_MAX_SECONDS: number;
    static RUNNING_DELAY_MINUTES: number;
    private properties;
    startTimeMap: any;
    /**
     * Constructor
     *
     * @private
     */
    private constructor();
    /**
     * Returns singleton instance.
     */
    static get instance(): LongRun;
    /**
     * Prepares the long running function
     *
     * @param funcName Long running function name
     * @param options Setup options
     * @param funcArgs Arguments for the long running function
     */
    setup(funcName: string, options: SetupOptions, funcArgs?: any[]): void;
    /**
     * This function is to be called from the long running function.
     * It returns the index from where the loop needs to be started.
     *
     * @param funcName name of the long running function
     * @returns index of the process or iteration
     */
    getStartIndex(funcName: string): number;
    /**
     * Determines whether the process should be suspended based on elapsed time.
     *
     * @param funcName The long running function name
     * @param currentIndex - start position when resuming
     * @return boolean
     */
    checkShouldSuspend(funcName: string, currentIndex: number): boolean;
    /**
     * Marks the task as completed
     *
     * @param funcName Long running function name
     * @param index Task index (loop index)
     */
    setTaskCompleted(funcName: string, index: number): void;
    /**
     * Resets Long-Running variables if there is no next trigger.
     * Returns whether the command has finished or not.
     * @param funcName
     */
    end(funcName: string): boolean;
    /**
     * Resets Long-Running variables
     * @param funcName
     */
    reset(funcName: string): void;
    /**
     * Returns if function is running now.
     * @param funcName
     */
    isRunning(funcName: string): boolean;
    /**
     * Sets the function is running
     *
     * @param funcName the name of the long running function
     * @param isRunning true or false
     */
    setRunning(funcName: string, isRunning: boolean): void;
    /**
     * Sets max execution seconds
     * @param seconds
     */
    setMaxExecutionSeconds(seconds: number): void;
    /**
     * Sets the trigger's delay minutes
     * @param minutes
     */
    setTriggerDelayMinutes(minutes: number): void;
    /**
     * Returns the function parameters
     * @param funcName
     */
    getSetupOptions(funcName: string): SetupOptions | null;
    /**
     * Sets the function parameters.
     * @param funcName
     * @param parameters
     */
    setParameters(funcName: string, parameters: string[]): void;
    /**
     * Deletes the trigger at the end
     *
     * @param triggerKey
     */
    private deleteTrigger;
}
export {};
