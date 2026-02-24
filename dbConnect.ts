import { mongoClient } from "./mongodb";

export const getDB = async () => (await mongoClient.connect()).db();
