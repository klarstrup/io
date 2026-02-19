export namespace Withings {
  export interface AccessTokenResponse {
    userid: number;
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

  export enum MeasureAttrib {
    /** The measuregroup has been captured by a device and is known to belong to this user (and is not ambiguous) */
    CapturedByDevice = 0,
    /** The measuregroup has been captured by a device but may belong to other users as well as this one (it is ambiguous) */
    CapturedByDeviceButAmbiguous = 1,
    /** The measuregroup has been entered manually for this particular user */
    Manual = 3,
    /** The measuregroup has been entered manually during user creation (and may not be accurate) */
    ManualDuringUserCreation = 4,
    /** Measure auto, it's only for the Blood Pressure Monitor. This device can make many measures and computed the best value */
    BPMAuto = 5,
    /** Measure confirmed. You can get this value if the user confirmed a detected activity */
    Confirmed = 7,
    /** Same as attrib 0 */
    CapturedByDevice2 = 8,
    /** The measure has been performed in specific guided conditions. Apply to Nerve Health Score */
    GuidedConditions = 15,
  }

  export enum MeasureCategory {
    Real = 1,
    UserObjective = 2,
  }

  export interface MeasureGroup {
    /** Unique identifier of the measure group. */
    grpid: number;
    /** The way the measure was attributed to the user: */
    attrib: MeasureAttrib;
    /** UNIX timestamp when measures were taken. */
    date: number;
    /** UNIX timestamp when measures were stored. */
    created: number;
    /** UNIX timestamp when measures were last updated.. */
    modified: number;
    /** Category for the measures in the group */
    category: MeasureCategory;
    /** ID of device that tracked the data. To retrieve information about this device, refer to : User v2 - Getdevice. */
    deviceid: string | null;
    /** ID of device that tracked the data. To retrieve information about this device, refer to : User v2 - Getdevice. */
    hash_deviceid: string | null;
    /** List of measures in the group. */
    measures: Measure[];
    /** Device model.  */
    model: string | null;
    /** Model ID */
    modelid: number | null;
    /** @deprecated */
    comment: null;
    timezone: string | null;
  }

  export enum MeasureType {
    Weight = 1,
    Height = 4,
    FatFreeMass = 5,
    FatRatio = 6,
    FatMassWeight = 8,
    DiastolicBloodPressure = 9,
    SystolicBloodPressure = 10,
    HeartPulse = 11,
    Temperature = 12,
    SpO2 = 54,
    BodyTemperature = 71,
    SkinTemperature = 73,
    MuscleMass = 76,
    Hydration = 77,
    BoneMass = 88,
    PulseWaveVelocity = 91,
    VO2Max = 123,
    AtrialFibrillation = 130,
    QRSInterval = 135,
    PRInterval = 136,
    QTInterval = 137,
    QTIntervalDuration = 138,
    AtrialFibrillationFromPPG = 139,
    VasularAge = 155,
    NerveHealthConductance = 167,
    ExtraCellularWater = 168,
    IntraCellularWater = 169,
    VisceralFat = 170,
    FatFreeMassForSegments = 173,
    FatMassForSegments = 174,
    MuscleMassForSegments = 175,
    ElectroDermalActivity = 196,
    BMR = 226,
    MetabolicAge = 227,
    ESC = 229,
  }

  export enum MeasurePosition {
    RightWrist = 0,
    LeftWrist = 1,
    RightArm = 2,
    LeftArm = 3,
    RightFoot = 4,
    LeftFoot = 5,
    BetweenLegs = 6,
    LeftPartOfTheBody = 8,
    RightPartOfTheBody = 9,
    LeftLeg = 10,
    RightLeg = 11,
    Torso = 12,
    LeftHand = 13,
    RightHand = 14,
    CardioVascularAorticArea = 15,
    CardioVascularPulmonicArea = 16,
    CardioVascularTricuspidArea = 17,
    CardioVascularMitralArea = 18,
    CardioVascularApexArea = 19,
    PulmonaryFrontUpperRightArea = 20,
    PulmonaryFrontUpperLeftArea = 21,
    PulmonaryFrontBottomRightArea = 22,
    PulmonaryFrontBottomLeftArea = 23,
    PulmonaryBackUpperLeftArea = 24,
    PulmonaryBackUpperRightArea = 25,
    PulmonaryBackBottomLeftArea = 26,
    PulmonaryBackBottomRightArea = 27,
    WideModeArea = 28,
    BetweenArms = 29,
  }
  export interface Measure {
    /** Value for the measure in S.I. units (kilograms, meters etc...). Value should be multiplied by 10 to the power of units to get the real value. */
    value: number;
    /** Type of the measure. */
    type: MeasureType;
    /** Power of ten to multiply the value field to get the real value. Formula: value * 10^unit = real value. Eg: value = 20 and unit = -1 => real value = 2. */
    unit: number;
    /** @deprecated */
    algo?: number;
    /** @deprecated */
    fm?: number;
    apppfmid?: number;
    appliver?: number;
    position?: MeasurePosition;
  }

  export interface MeasureResponse {
    /** Response status. See https://developer.withings.com/api-reference/#tag/response_status */
    status: number;
    /** Response data. */
    body: MeasureBody;
  }

  export interface MeasureBody {
    /** For every measure/measurement made, a measure group is created. The measure group purpose is to group together measures that have been taken at the same time. For instance, when measuring blood pressure you will have a measure group with a systole measure, a diastole measure, and a heartrate measure. Every time a measure is create/updated/deleted, the corresponding measure group is updated. */
    measuregrps: MeasureGroup[];
    /** To know if there is more data to fetch or not. */
    more: boolean;
    /** Offset to use to retrieve the next data. */
    offset: number;
    /** Server time at which the answer was generated. */
    updatetime: number;
    /** Timezone for the date. */
    timezone: string;
  }
}
