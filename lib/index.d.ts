declare type EveryMinutesType = 1 | 5 | 10 | 15 | 30;
declare type ExecScopeType = "user" | "script" | "document";
export declare type SetupOptions = {
    execScope: ExecScopeType;
    taskCount: number;
    maxRuntime: number;
    triggerEveryNMinutes: EveryMinutesType;
};
export declare class LongRun {
    private static _instance;
    static PREFIX_RUNNING: string;
    static PREFIX_TRIGGER_ID: string;
    static PREFIX_START_POS: string;
    static PREFIX_CURRENT_POS: string;
    static PREFIX_OPTION: string;
    static PREFIX_OPTION_EXEC_SCOPE: string;
    static PREFIX_OPTION_TASK_COUNT: string;
    static PREFIX_OPTION_MAX_RUNTIME: string;
    static PREFIX_OPTION_TRIGGER_EVERY_N_MINS: string;
    static PREFIX_FUNC_ARGS: string;
    static PREFIX_TASK_COUNT: string;
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
    setup(funcName: string, options: SetupOptions, funcArgs?: any[]): void;
    /**
     *
     *
     * @returns start index ( 0 for the first time )
     */
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
     * @param funcName
     * @param currentIndex - start position when resuming
     * @return true - it should be suspended
     */
    checkShouldSuspend(funcName: string, currentIndex: number): boolean;
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
     * Returns if there is next trigger.
     * @param funcName
     */
    existsNextTrigger(funcName: string): boolean;
    /**
     * register the next trigger and set running-flag off
     * @param funcName
     * @param nextIndex - start position when resuming
     */
    registerNextTrigger(funcName: string, nextIndex: number): void;
    /**
     * Deletes the trigger
     *
     * @param triggerKey
     */
    private deleteTrigger;
    /**
     * Sets a trigger
     * @param triggerKey
     * @param funcName
     */
    private setTrigger;
}
export {};
