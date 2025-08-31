export interface LocationData {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  name: string;
  boulderCircuits?: {
    id: string;
    name: string;
    description?: string;
    hasZones?: boolean;
    // Internal estimate by io
    gradeEstimate?: number;
    // Stated corresponding grade
    gradeRange?: [number, number];
    labelColor?: string;
    holdColor?: string;
    holdColorSecondary?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
  }[];
}
