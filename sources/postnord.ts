export namespace PostNord {
  export interface ShipmentInformation {
    shipmentId: string;
    showSplitShipmentOverview: boolean;
    actualReturnedId: string;
    serviceName: string;
    serviceCode: string;
    references: Reference[];
    items: Item[];
    additionalServices: AdditionalService[];
    receiver: Receiver;
    sender: Sender;
    servicePoint?: ServicePoint;
  }

  export interface AdditionalService {
    name: string;
  }

  export interface Item {
    itemId: string;
    deliveryInformation: DeliveryInformation;
    events: Event[];
    status: Status;
    measurements: Measurement[];
    isPayableCustomsVat: boolean;
    returnDate?: Date;
    senderReference?: string;
  }

  export interface DeliveryInformation {
    deliveryTo: string;
    deliveryToInfo: string;
  }

  export interface Event {
    eventDescription: string;
    eventTime: Date;
    status: string;
    location: Location;
  }

  export interface Location {
    countryCode?: string;
    locationType?: LocationType;
    name?: string;
  }

  export enum LocationType {
    Depot = "DEPOT",
    Hub = "HUB",
    ServicePoint = "SERVICE_POINT",
    Undef = "UNDEF",
  }

  export interface Measurement {
    name: string;
    unit: string;
    value: number;
  }

  export enum Code {
    AvailableForDelivery = "AVAILABLE_FOR_DELIVERY",
    Delivered = "DELIVERED",
    EnRoute = "EN_ROUTE",
    Informed = "INFORMED",
    Other = "OTHER",
  }

  export interface Status {
    code: Code;
    header: string;
    description?: string;
  }

  export interface Receiver {
    address: ReceiverAddress;
  }

  export interface ReceiverAddress {
    country: string;
    countryCode: string;
    postCode: string;
    city?: string;
  }

  export interface Reference {
    name: string;
    value: string;
  }

  export interface Sender {
    name: string;
    address: ReceiverAddress;
  }

  export interface ServicePoint {
    name: string;
    mapLink: string;
    address: ServicePointAddress;
    openingHours: CurrentStatus[];
    rawOpeningHours: RawOpeningHour[];
    currentStatus: CurrentStatus;
    coordinates: Coordinates;
  }

  export interface ServicePointAddress {
    city: string;
    postalCode: string;
    countryCode: string;
    street: string;
  }

  export interface Coordinates {
    northing: string;
    easting: string;
  }

  export interface CurrentStatus {
    open: boolean;
    day: string;
    spans: Span[];
    current?: boolean;
  }

  export interface Span {
    openTime: string;
    closeTime: string;
  }

  export interface RawOpeningHour {
    openFrom: string;
    openTo: string;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
  }
}
