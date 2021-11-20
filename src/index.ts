import Properties = GoogleAppsScript.Properties.Properties;

type EveryMinutesType = 1 | 5 | 10 | 15 | 30;
type ExecScopeType = "user" | "script" | "document";
type ScriptType = "addon" | "containerBound" | "webapp";

export type SetupOptions = {
  isAddon: boolean;
  execScope: ExecScopeType;
  taskCount: number;
  maxRuntime: number;
  triggerId?: string;
  triggerEveryNMinutes?: EveryMinutesType;
  triggerEveryNHours?: number;
  triggerEveryNDays?: number;
  triggerEveryNWeeks?: number;
};

export class LongRun {
  // singleton instance
  private static _instance: LongRun;

  static PREFIX_RUNNING: string = "running_";
  static PREFIX_TRIGGER_ID: string = "trigger_";
  static PREFIX_OPTION: string = "option_";

  // setup option prefixes
  static PREFIX_OPTION_IS_ADDON: string = "option_is_addon";
  static PREFIX_OPTION_EXEC_SCOPE: string = "option_exec_scope_";
  static PREFIX_OPTION_TASK_COUNT: string = "option_task_count_";
  static PREFIX_OPTION_MAX_RUNTIME: string = "option_MAX_RUNTIME_";
  static PREFIX_OPTION_TRIGGER_EVERY_N_MINS: string =
    "option_trigger_every_n_minutes_";
  static PREFIX_OPTION_TRIGGER_EVERY_N_HOURS: string =
    "option_trigger_every_n_hours_";
  static PREFIX_OPTION_TRIGGER_EVERY_N_DAYS: string =
    "option_trigger_every_n_days_";
  static PREFIX_OPTION_TRIGGER_EVERY_N_WEEKS: string =
    "option_trigger_every_n_weeks_";

  static PREFIX_FUNC_ARGS: string = "args_";
  static PREFIX_TASK_COMPLETED_INDEX: string = "task_completed_index_";

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

  /**
   * Prepares the long running function
   *
   * @param funcName Long running function name
   * @param options Setup options
   * @param funcArgs Arguments for the long running function
   */
  setup(funcName: string, options: SetupOptions, funcArgs: any[] = []) {
    const {
      isAddon, // whether it's used in an addon or not
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

    // reset any previous execution
    this.reset(funcName);

    let triggerId: string | null = null;
    let triggerProperties: any = null;

    if (options.triggerId) {
      triggerId = options.triggerId;
    } else {
      const clockTriggerBuilder: GoogleAppsScript.Script.ClockTriggerBuilder =
        ScriptApp.newTrigger(funcName).timeBased();
      // add-on can use a time-driven trigger once per hour at most,
      // hence, triggerEveryNMinutes is not applicable.
      if (!isAddon && triggerEveryNMinutes) {
        triggerId = clockTriggerBuilder
          .everyMinutes(triggerEveryNMinutes)
          .create()
          .getUniqueId();
      } else if (triggerEveryNHours) {
        triggerId = clockTriggerBuilder
          .everyHours(triggerEveryNHours)
          .create()
          .getUniqueId();
      } else if (triggerEveryNDays) {
        triggerId = clockTriggerBuilder
          .everyDays(triggerEveryNDays)
          .create()
          .getUniqueId();
      } else if (triggerEveryNWeeks) {
        triggerId = clockTriggerBuilder
          .everyWeeks(triggerEveryNWeeks)
          .create()
          .getUniqueId();
      }
    }

    if (!isAddon && options.triggerEveryNMinutes) {
      triggerProperties = {
        [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS + funcName]:
          triggerEveryNMinutes,
      };
    } else if (options.triggerEveryNHours) {
      triggerProperties = {
        [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_HOURS + funcName]:
          triggerEveryNHours,
      };
    } else if (options.triggerEveryNDays) {
      triggerProperties = {
        [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_DAYS + funcName]:
          triggerEveryNDays,
      };
    } else if (options.triggerEveryNWeeks) {
      triggerProperties = {
        [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_WEEKS + funcName]:
          triggerEveryNWeeks,
      };
    }

    if (triggerId !== null) {
      // set properties in batch.
      // (using es2015 computed property names)
      let properties = {
        [LongRun.PREFIX_OPTION_IS_ADDON + funcName]: String(isAddon),
        [LongRun.PREFIX_OPTION_EXEC_SCOPE + funcName]: execScope,
        [LongRun.PREFIX_OPTION_TASK_COUNT + funcName]: String(taskCount),
        [LongRun.PREFIX_OPTION_MAX_RUNTIME + funcName]: String(maxRuntime),
        [LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS + funcName]:
          String(triggerEveryNMinutes),
        [LongRun.PREFIX_FUNC_ARGS + funcName]: JSON.stringify(funcArgs),
        [LongRun.PREFIX_TRIGGER_ID + funcName]: triggerId,
      };
      if (triggerProperties !== null) {
        properties = { ...properties, ...triggerProperties };
        this.properties.setProperties(properties);
      } else {
        throw new Error("setup failed, trigger recurrence missing.");
      }
    } else {
      throw new Error("setup failed");
    }
  }

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
    let lastCompletedProcessIndex: number | string | null =
      this.properties.getProperty(
        LongRun.PREFIX_TASK_COMPLETED_INDEX + funcName
      );
    if (lastCompletedProcessIndex !== null) {
      return parseInt(lastCompletedProcessIndex) + 1;
    }
    return 0;
  }

  /**
   * Determines whether the process should be suspended based on elapsed time.
   *
   * @param funcName The long running function name
   * @param currentIndex - start position when resuming
   * @return boolean
   */
  checkShouldSuspend(funcName: string, currentIndex: number): boolean {
    // get the (long-running) function start time
    const startTime = this.startTimeMap[funcName];
    // calculate elapsed time (in seconds)
    const elapsedTime = (new Date().getTime() - startTime) / 1000;

    // if it's past the specified time, suspend the process
    if (elapsedTime >= LongRun.RUNNING_MAX_SECONDS) {
      this.setRunning(funcName, false);
      return true;
    }
    return false;
  }

  /**
   * Marks the task as completed
   *
   * @param funcName Long running function name
   * @param index Task index (loop index)
   */
  setTaskCompleted(funcName: string, index: number): void {
    const key = LongRun.PREFIX_TASK_COMPLETED_INDEX + funcName;
    this.properties.setProperty(key, String(index));
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
    const taskCount = this.properties.getProperty(
      LongRun.PREFIX_OPTION_TASK_COUNT + funcName
    );
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
    // delete trigger id from properties
    this.deleteTrigger(LongRun.PREFIX_TRIGGER_ID + funcName);

    // delete setup options from properties
    this.properties.deleteProperty(LongRun.PREFIX_OPTION_IS_ADDON + funcName);
    this.properties.deleteProperty(LongRun.PREFIX_OPTION_EXEC_SCOPE + funcName);
    this.properties.deleteProperty(LongRun.PREFIX_OPTION_TASK_COUNT + funcName);
    this.properties.deleteProperty(
      LongRun.PREFIX_OPTION_MAX_RUNTIME + funcName
    );
    this.properties.deleteProperty(
      LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS + funcName
    );
    this.properties.deleteProperty(
      LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_HOURS + funcName
    );
    this.properties.deleteProperty(
      LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_DAYS + funcName
    );
    this.properties.deleteProperty(
      LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_WEEKS + funcName
    );

    // delete function arguments from properties
    this.properties.deleteProperty(LongRun.PREFIX_FUNC_ARGS + funcName);
    this.properties.deleteProperty(
      LongRun.PREFIX_TASK_COMPLETED_INDEX + funcName
    );
    this.properties.deleteProperty(LongRun.PREFIX_RUNNING + funcName);
  }

  /**
   * Returns if function is running now.
   * @param funcName
   */
  isRunning(funcName: string): boolean {
    let running: string | null = this.properties.getProperty(
      LongRun.PREFIX_RUNNING + funcName
    );
    return !(running === null || running === "");
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
    const isAddon = Boolean(
      this.properties.getProperty(LongRun.PREFIX_OPTION_IS_ADDON + funcName)
    );
    const execScope = this.properties.getProperty(
      LongRun.PREFIX_OPTION_EXEC_SCOPE + funcName
    );
    const taskCount = this.properties.getProperty(
      LongRun.PREFIX_OPTION_TASK_COUNT + funcName
    );
    const maxRuntime = this.properties.getProperty(
      LongRun.PREFIX_OPTION_MAX_RUNTIME + funcName
    );
    const triggerEveryNMinutes = this.properties.getProperty(
      LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_MINS + funcName
    );
    const triggerEveryNHours = this.properties.getProperty(
      LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_HOURS + funcName
    );
    const triggerEveryNDays = this.properties.getProperty(
      LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_DAYS + funcName
    );
    const triggerEveryNWeeks = this.properties.getProperty(
      LongRun.PREFIX_OPTION_TRIGGER_EVERY_N_WEEKS + funcName
    );
    if (
      execScope !== null &&
      taskCount !== null &&
      maxRuntime !== null &&
      triggerEveryNMinutes !== null
    ) {
      return {
        isAddon: isAddon,
        execScope: execScope as ExecScopeType,
        taskCount: parseInt(taskCount),
        maxRuntime: parseInt(maxRuntime),
        triggerEveryNMinutes:
          triggerEveryNMinutes === null
            ? undefined
            : (parseInt(triggerEveryNMinutes) as EveryMinutesType),
        triggerEveryNHours:
          triggerEveryNHours === null
            ? undefined
            : parseInt(triggerEveryNHours),
        triggerEveryNDays:
          triggerEveryNDays === null ? undefined : parseInt(triggerEveryNDays),
        triggerEveryNWeeks:
          triggerEveryNWeeks === null
            ? undefined
            : parseInt(triggerEveryNWeeks),
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
      this.properties.setProperty(
        LongRun.PREFIX_OPTION + funcName,
        parameters.join(",")
      );
    } else {
      this.properties.deleteProperty(LongRun.PREFIX_OPTION + funcName);
    }
  }

  /**
   * Deletes the trigger at the end
   *
   * @param triggerKey
   */
  private deleteTrigger(triggerKey: string): void {
    const triggerId = this.properties.getProperty(triggerKey);

    if (!triggerId) return;
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
