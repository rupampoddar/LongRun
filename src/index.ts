import Properties = GoogleAppsScript.Properties.Properties;

type EveryMinutesType = 1 | 5 | 10 | 15 | 30;
type ExecScopeType = "user" | "script" | "document";

export type SetupOptions = {
  execScope: ExecScopeType;
  taskCount: number;
  maxRuntime: number;
  triggerEveryNMinutes: EveryMinutesType;
};
class GasTrigger {
  constructor(functionName: string, everyMinutes: EveryMinutesType) {
    //
    // https://developers.google.com/apps-script/reference/script/clock-trigger-builder#everyminutesn
    return ScriptApp.newTrigger(functionName)
      .timeBased()
      .everyMinutes(everyMinutes) // trigger every n minutes. n must be 1, 5, 10, 15 or 30.
      .create();
  }
}

export class LongRun {
  // singleton instance
  private static _instance: LongRun;

  // constants
  static PREFIX_RUNNING: string = "running_"; // in use
  static PREFIX_TRIGGER_ID: string = "trigger_"; // in use
  static PREFIX_START_POS: string = "start_";
  static PREFIX_CURRENT_POS: string = "current_";
  static PREFIX_OPTION: string = "option_";

  // in use
  static PREFIX_OPTION_EXEC_SCOPE: string = "option_exec_scope_";
  static PREFIX_OPTION_TASK_COUNT: string = "option_task_count_";
  static PREFIX_OPTION_MAX_RUNTIME: string = "option_MAX_RUNTIME_";
  static PREFIX_OPTION_TRIGGER_EVERY_N_MINS: string = "option_trigger_every_n_minutes_";

  static PREFIX_FUNC_ARGS: string = "args_"; // in use

  static PREFIX_TASK_COUNT: string = "task_count_";

  static PREFIX_TASK_COMPLETED_INDEX: string = "task_completed_index_"; // in use

  static RUNNING_MAX_SECONDS: number = 4 * 60;
  static RUNNING_DELAY_MINUTES: number = 1;

  private properties: Properties;
  startTimeMap: any = {}; // start time map

  /**
   * Constructor
   *
   * @private
   */
  private constructor() {
    this.properties = PropertiesService.getUserProperties();
  }

  /**
   * Returns singleton instance.
   */
  public static get instance(): LongRun {
    if (!this._instance) {
      this._instance = new LongRun();
    }
    return this._instance;
  }

  setup(funcName: string, options: SetupOptions, funcArgs: any[] = []) {
    const {
      execScope,
      taskCount, // total task count (i.e. loop count)
      maxRuntime, // maximum acceptable run time in seconds
      triggerEveryNMinutes, // trigger the long running function every n minutes
    } = options;

    // if (execScope === 'script') {
    //   this.properties = PropertiesService.getScriptProperties();
    // } else if (execScope === 'document') {
    //   this.properties = PropertiesService.getDocumentProperties();
    // } else if (execScope === 'user') {
    //   this.properties = PropertiesService.getUserProperties();
    // }

    // https://developers.google.com/apps-script/reference/script/clock-trigger-builder#everyminutesn
    const triggerId = ScriptApp.newTrigger(funcName)
      .timeBased()
      .everyMinutes(triggerEveryNMinutes) // trigger every n minutes. n must be 1, 5, 10, 15 or 30.
      .create()
      .getUniqueId();

    // set properties in batch.
    // (using es2015 computed property names)
    this.properties.setProperties({
      [LongRun.PREFIX_OPTION_EXEC_SCOPE + funcName]: execScope,
      [LongRun.PREFIX_OPTION_TASK_COUNT + funcName]: String(taskCount),
      [LongRun.PREFIX_OPTION_MAX_RUNTIME + funcName]: String(maxRuntime),
      [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS + funcName]: String(triggerEveryNMinutes),
      [LongRun.PREFIX_FUNC_ARGS + funcName]: JSON.stringify(funcArgs),
      [LongRun.PREFIX_TRIGGER_ID + funcName]: triggerId,
    });
  }

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
  getStartIndex(funcName: string): number {
    // save start time
    this.startTimeMap[funcName] = new Date().getTime();

    // set running flag
    this.setRunning(funcName, true);

    // if the trigger exists, delete it.
    // this.deleteTrigger(LongRun.PREFIX_TRIGGER_KEY + funcName);

    // calculate start index
    let lastCompletedProcessIndex: number | string | null = this.properties.getProperty(
      LongRun.PREFIX_TASK_COMPLETED_INDEX + funcName
    );
    if (lastCompletedProcessIndex !== null) {
      return parseInt(lastCompletedProcessIndex) + 1;
    } else {
      return 0;
    }
  }

  /**
   * Determines whether the process should be suspended based on elapsed time.
   *
   * @param funcName
   * @param currentIndex - start position when resuming
   * @return true - it should be suspended
   */
  checkShouldSuspend(funcName: string, currentIndex: number): boolean {
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
    } else {
      // update current process index
      // this.properties.setProperty(
      //   LongRun.PREFIX_CURRENT_POS + funcName,
      //   String(currentIndex)
      // );
      return false;
    }
  }

  setTaskCompleted(funcName: string, index: number): void {
    this.properties.setProperty(LongRun.PREFIX_TASK_COMPLETED_INDEX + funcName, String(index));
  }

  /**
   * Resets Long-Running variables if there is no next trigger.
   * Returns whether the command has finished or not.
   * @param funcName
   */
  end(funcName: string): boolean {
    // let ret: boolean = false;
    // if (!this.existsNextTrigger(functionName)) {
    //   this.reset(functionName);
    //   ret = true;
    // }
    // return ret;
    // check if all the processes are completed
    const taskCount = this.properties.getProperty(LongRun.PREFIX_OPTION_TASK_COUNT + funcName);
    const completedTaskIndex = this.properties.getProperty(
      LongRun.PREFIX_TASK_COMPLETED_INDEX + funcName
    );
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
  reset(funcName: string): void {
    // delete trigger
    this.deleteTrigger(LongRun.PREFIX_TRIGGER_ID + funcName);

    // delete properties
    this.properties.deleteProperty(LongRun.PREFIX_OPTION_EXEC_SCOPE + funcName);
    this.properties.deleteProperty(LongRun.PREFIX_OPTION_TASK_COUNT + funcName);
    this.properties.deleteProperty(LongRun.PREFIX_OPTION_MAX_RUNTIME + funcName);
    this.properties.deleteProperty(LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS + funcName);
    this.properties.deleteProperty(LongRun.PREFIX_FUNC_ARGS+funcName)
    this.properties.deleteProperty(LongRun.PREFIX_TASK_COMPLETED_INDEX+funcName)
    this.properties.deleteProperty(LongRun.PREFIX_RUNNING + funcName);
    this.properties.deleteProperty(LongRun.PREFIX_TRIGGER_ID + funcName);
  }

  /**
   * Returns if function is running now.
   * @param funcName
   */
  isRunning(funcName: string): boolean {
    let running: string | null = this.properties.getProperty(LongRun.PREFIX_RUNNING + funcName);
    return !(running == null || running === "");
  }

  /**
   * Sets the function is running
   *
   * @param funcName the name of the long running function
   * @param isRunning true or false
   */
  setRunning(funcName: string, isRunning: boolean): void {
    const key = LongRun.PREFIX_RUNNING + funcName;
    if (isRunning) {
      this.properties.setProperty(key, "running");
    } else {
      this.properties.deleteProperty(key);
    }
  }

  /**
   * Sets max execution seconds
   * @param seconds
   */
  setMaxExecutionSeconds(seconds: number) {
    LongRun.RUNNING_MAX_SECONDS = seconds;
  }
  /**
   * Sets the trigger's delay minutes
   * @param minutes
   */
  setTriggerDelayMinutes(minutes: number) {
    LongRun.RUNNING_DELAY_MINUTES = minutes;
  }

  /**
   * Returns the function parameters
   * @param funcName
   */
  getSetupOptions(funcName: string): SetupOptions | null {
    // let parameters = this.properties.getProperty(LongRun.PREFIX_OPTION + funcName);
    // if (parameters != null) {
    //   return parameters.split(",");
    // } else {
    //   return [];
    // }
    const execScope = this.properties.getProperty(LongRun.PREFIX_OPTION_EXEC_SCOPE + funcName);
    const taskCount = this.properties.getProperty(LongRun.PREFIX_OPTION_TASK_COUNT + funcName);
    const maxRuntime = this.properties.getProperty(LongRun.PREFIX_OPTION_MAX_RUNTIME + funcName);
    const triggerEveryNMinutes = this.properties.getProperty(
      LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS + funcName
    );
    if (
      execScope !== null &&
      taskCount !== null &&
      maxRuntime !== null &&
      triggerEveryNMinutes !== null
    ) {
      return {
        execScope: execScope as ExecScopeType,
        taskCount: parseInt(taskCount),
        maxRuntime: parseInt(maxRuntime),
        triggerEveryNMinutes: parseInt(triggerEveryNMinutes) as EveryMinutesType,
      };
    }
    return null;
  }
  /**
   * Sets the function parameters.
   * @param funcName
   * @param parameters
   */
  setParameters(funcName: string, parameters: string[]): void {
    if (parameters != null) {
      this.properties.setProperty(LongRun.PREFIX_OPTION + funcName, parameters.join(","));
    } else {
      this.properties.deleteProperty(LongRun.PREFIX_OPTION + funcName);
    }
  }

  /**
   * Returns if there is next trigger.
   * @param funcName
   */
  existsNextTrigger(funcName: string): boolean {
    let triggerId = this.properties.getProperty(LongRun.PREFIX_TRIGGER_ID + funcName);
    return triggerId != null;
  }

  /**
   * register the next trigger and set running-flag off
   * @param funcName
   * @param nextIndex - start position when resuming
   */
  registerNextTrigger(funcName: string, nextIndex: number): void {
    this.properties.setProperty(LongRun.PREFIX_START_POS + funcName, String(nextIndex)); // save next start position
    this.setTrigger(LongRun.PREFIX_TRIGGER_ID + funcName, funcName); // set trigger

    // turn off running-flag
    this.properties.deleteProperty(LongRun.PREFIX_RUNNING + funcName);
  }

  /**
   * Deletes the trigger
   *
   * @param triggerKey
   */
  private deleteTrigger(triggerKey: string): void {
    const triggerId = this.properties.getProperty(triggerKey);

    if (!triggerId) return;

    console.log(ScriptApp.getProjectTriggers())
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

  /**
   * Sets a trigger
   * @param triggerKey
   * @param funcName
   */
  private setTrigger(triggerKey: string, funcName: string) {
    this.deleteTrigger(triggerKey); // delete if exists.
    let dt: Date = new Date();
    dt.setMinutes(dt.getMinutes() + LongRun.RUNNING_DELAY_MINUTES); // will execute after the specified time
    let triggerId = ScriptApp.newTrigger(funcName).timeBased().at(dt).create().getUniqueId();
    // save the trigger id to delete the trigger later.
    this.properties.setProperty(triggerKey, triggerId);
  }
}
