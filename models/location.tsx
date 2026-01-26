export interface LocationData {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  name: string;
  isFavorite?: boolean;
  boulderCircuits?: {
    id: string;
    name: string;
    description?: string | null;
    hasZones?: boolean | null;
    // Internal estimate by io
    gradeEstimate?: number | null;
    // Stated corresponding grade
    gradeRange?: [number, number] | [number] | null;
    labelColor?: string | null;
    holdColor?: string | null;
    holdColorSecondary?: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
  }[];
}
