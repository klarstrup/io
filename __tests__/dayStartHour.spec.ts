import { expect, test } from "bun:test";
import { dayStartHour } from "../utils";

test("dayStartHour is 5", () => {
  expect(dayStartHour).toBe(5);
});
