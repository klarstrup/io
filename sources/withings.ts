export namespace Withings {
  export interface AccessTokenResponse {
    userid: string;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    csrf_token: string;
    token_type: string;
  }

  export interface UserDevicesResponse {
    status: number;
    body: UserDevicesBody;
  }

  export interface UserDevicesBody {
    devices: UserDevicesDevice[];
  }

  export interface UserDevicesDevice {
    type: string;
    model: string;
    model_id: number;
    battery: string;
    deviceid: string;
    mac_address: string;
    fw: string;
    network: string;
    last_used_network: string;
    hash_deviceid: string;
    timezone: string;
    first_session_date: number;
    last_session_date: number;
  }

  export interface SleepSummaryResponse {
    /** Response status. See https://developer.withings.com/api-reference/#tag/response_status */
    status: number;
    body: SleepSummaryBody;
  }

  export interface SleepSummaryBody {
    series: SleepSummarySeries[];
    more: boolean;
    offset: number;
  }

  export interface SleepSummarySeries {
    id: number;
    timezone: string;
    model: number;
    model_id: number;
    hash_deviceid: string;
    startdate: number;
    enddate: number;
    date: string;
    data: SleepSummarySeriesData;
    completed: boolean;
    created: number;
    modified: number;
  }

  export interface SleepSummarySeriesData {
    /** Total time spent in bed (seconds). */
    total_timeinbed: number;
    /** Total time spent asleep. Sum of light, deep and rem durations (seconds). */
    total_sleep_time: number;
    /** Duration of sleep when night comes from external source (seconds). Light, Deep and Rem sleep durations are null in this case. */
    asleepduration?: number;
    /** Duration in state light sleep (seconds). */
    lightsleepduration: number;
    /** Duration in state REM sleep (seconds). */
    remsleepduration: number;
    /** Duration in state deep sleep (seconds). */
    deepsleepduration: number;
    /** Ratio of the total sleep time over the time spent in bed. */
    sleep_efficiency: number;
    /** Time spent in bed before falling asleep (seconds). */
    sleep_latency: number;
    /** Time spent in bed after waking up (seconds). */
    wakeup_latency: number;
    /** Time spent awake (seconds). */
    wakeupduration: number;
    /** Number of times the user woke up while in bed. Does not include the number of times the user got out of bed. */
    wakeupcount: number;
    /** Time spent awake in bed after falling asleep for the 1st time during the night (seconds). */
    waso: number;
    /** Count of the REM sleep phases. */
    nb_rem_episodes: number;
    /** Time to sleep (seconds). @deprecated */
    durationtosleep: number;
    /** Time to wake up (seconds). @deprecated */
    durationtowakeup: number;
    /** Number of times the user got out of bed during the night. @deprecated */
    out_of_bed_count: number;
  }

  export interface MeasureGroup {
    grpid: number;
    attrib: number;
    date: number;
    created: number;
    modified: number;
    category: number;
    deviceid: string | null;
    hash_deviceid: string | null;
    measures: Measure[];
    modelid: number | null;
    model: string | null;
    comment: null;
    timezone: string | null;
  }

  export interface Measure {
    value: number;
    type: number;
    unit: number;
    algo?: number;
    fm?: number;
    apppfmid?: number;
    appliver?: number;
  }

  export interface MeasureResponse {
    /** Response status. See https://developer.withings.com/api-reference/#tag/response_status */
    status: number;
    body: MeasureBody;
  }

  export interface MeasureBody {
    measuregrps: MeasureGroup[];
    more: boolean;
    offset: number;
    updatetime: number;
    timezone: string;
  }
}
