/// <reference types="google-apps-script" />
/**
 * Long-Running Support
 */
import Properties = GoogleAppsScript.Properties.Properties;
export declare class LongRun {
    private static _instance;
    static PREFIX_RUNNING: string;
    static PREFIX_TRIGGER_KEY: string;
    static PREFIX_START_POS: string;
    static PREFIX_OPTION: string;
    static RUNNING_MAX_SECONDS: number;
    static RUNNING_DELAY_MINUTES: number;
    properties: Properties;
    /**
     * Private constructor
     * @private
     */
    private constructor();
    /**
     * Returns singleton instance.
     */
    static get instance(): LongRun;
    /** start time map */
    startTimeMap: any;
    /**
     * Returns if function is running now.
     * @param funcName
     */
    isRunning(funcName: string): boolean;
    /**
     * Sets the function is running
     * @param funcName
     * @param running
     */
    setRunning(funcName: string, running: boolean): void;
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
    getParameters(funcName: string): string[];
    /**
     * Sets the function parameters.
     * @param funcName
     * @param parameters
     */
    setParameters(funcName: string, parameters: string[]): void;
    /**
     * Starts or Resume Long-Run process.
     * @returns start index ( 0 for the first time )
     */
    startOrResume(funcName: string): number;
    /**
     * Determines whether the process should be suspended.
     * If it should be suspended, the next trigger will be registered.
     * @param funcName
     * @param nextIndex - start position when resuming
     * @return true - it should be suspended
     */
    checkShouldSuspend(funcName: string, nextIndex: number): boolean;
    /**
     * Resets Long-Running variables
     * @param funcName
     */
    reset(funcName: string): void;
    /**
     * Resets Long-Running variables if there is no next trigger.
     * Returns whether the command has finished or not.
     * @param funcName
     */
    end(funcName: string): boolean;
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
