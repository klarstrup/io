export namespace DSB {
  export interface AuthTokens {
    access_token: string;
    token_type: string;
    expires_in: number;
    id_token: string;
    refresh_token: string;
  }

  export interface ProductSummariesResponse {
    productSummaries: ProductSummary[];
  }

  export interface ProductSummary {
    timestamp: Date;
    checkInId: string;
    productSummary: ProductSummaryProductSummary;
    paymentStatus: PaymentStatus;
  }

  export interface PaymentStatus {
    timestamp: Date;
    orderId: string;
    state: string;
    additionalStatusText: string;
  }

  export interface ProductSummaryProductSummary {
    paymentChoice: PaymentChoice;
    trips: Trip[];
    passengers: Passengers;
    productPrice: ProductPrice;
    bonusPoints: number;
  }

  export interface Passengers {
    personal: string;
    others: Other[];
  }

  export interface Other {
    passengerType: string;
    count: number;
  }

  export interface PaymentChoice {
    paymentType: string;
    card: Card;
  }

  export interface Card {
    key: string;
    type: string;
    maskedNumber: string;
  }

  export interface ProductPrice {
    totalPrice: number;
    status: string;
    productTripPrices: ProductTripPrice[];
  }

  export interface ProductTripPrice {
    tripId: string;
    price: number;
    tripPrice: TripPrice;
  }

  export interface TripPrice {
    price: number;
    pricedZones: number[];
    pricedZoneCount: number;
    zoneCount: number;
    passengerPrices: PassengerPrice[];
    usedCalculationPrinciple: string;
    fareSet: string;
    tripLegInfos: TripLegInfo[];
    tripZoneCount: number;
  }

  export interface PassengerPrice {
    price: number;
    passengerPriceInfo: PassengerPriceInfo;
    summarySpecifications: SummarySpecification[];
    payingPassengerCount: number;
    totalPrice: number;
  }

  export interface PassengerPriceInfo {
    index: number;
    passengerType: string;
    addOns: unknown[];
  }

  export interface SummarySpecification {
    price: number;
    type: SummarySpecificationType;
  }

  export enum SummarySpecificationType {
    BasicPrice = "BASIC_PRICE",
    DiscountTime = "DISCOUNT_TIME",
    DiscountedPrice = "DISCOUNTED_PRICE",
    FinalPrice = "FINAL_PRICE",
    MetroQualityAddOn = "METRO_QUALITY_ADD_ON",
    NormalPrice = "NORMAL_PRICE",
  }

  export interface TripLegInfo {
    tripLegIndex: number;
    zoneCount: number;
    fareSet: string;
  }

  export interface Trip {
    id: string;
    changeCount: number;
    duration: string;
    tripLegs: TripLeg[];
  }

  export interface TripLeg {
    index: number;
    type: string;
    transports: Transport[];
    notes: unknown[];
    stops: Stop[];
    passedZones: number[];
    endDateTime: Date;
    startDateTime: Date;
  }

  export interface Stop {
    location: Location;
    zones: number[];
    index: number;
    actualTimeAndTrackInfo?: ActualTimeAndTrackInfo;
    board: boolean;
    plannedTimeAndTrackInfo?: PlannedTimeAndTrackInfo;
    unboard: boolean;
  }

  export interface ActualTimeAndTrackInfo {
    departureTime?: Date;
    arrivalTime?: Date;
    departureTrack?: string;
    arrivalTrack?: string;
  }

  export interface Location {
    name: string;
    type: LocationType;
    coordinate: Coordinate;
    id: string;
    stopId: number;
  }

  export interface Coordinate {
    latitude: number;
    longitude: number;
  }

  export enum LocationType {
    Stop = "STOP",
  }

  export interface PlannedTimeAndTrackInfo {
    departureTime?: Date;
    arrivalTime?: Date;
  }

  export interface Transport {
    meansOfTransportation: string;
    name: string;
    operator: string;
    badge: Badge;
    direction?: string;
    fromStopIndex: number;
    lineId: string;
    number: string;
    toStopIndex: number;
  }

  export interface Badge {
    badgeTextColor: string;
    badgeType: string;
    colorCode: string;
    icon: string;
    longBadgeText: string;
    shortBadgeText: string;
  }
}

export const isDSBAuthTokens = (obj: unknown): obj is DSB.AuthTokens =>
  Boolean(
    obj &&
    typeof obj === "object" &&
    "access_token" in obj &&
    "refresh_token" in obj &&
    "expires_in" in obj &&
    "token_type" in obj &&
    "id_token" in obj &&
    typeof obj.access_token === "string" &&
    typeof obj.refresh_token === "string" &&
    typeof obj.expires_in === "number" &&
    typeof obj.token_type === "string" &&
    typeof obj.id_token === "string",
  );
