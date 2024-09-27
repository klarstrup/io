import { mongoClient } from "./mongodb";

export const getDB = async () => {
  const DB = (await mongoClient.connect()).db();

  if (!DB) {
    throw new Error("Failed to connect to the database.");
  }

  return DB;
};
