import { TZDate } from "@date-fns/tz";
import { expect, test } from "bun:test";
import { describe } from "node:test";
import {
  dayStartHour,
  endOfDayButItRespectsDayStartHour,
  startOfDayButItRespectsDayStartHour,
} from "../utils";

await describe("dayStartHour", () => {
  test("dayStartHour", () => {
    expect(dayStartHour).toBe(5);
  });
});

await describe("startOfDayButItRespectsDayStartHour", () => {
  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T04:00:00Z", "UTC"),
      ).getDate(),
    ).toBe(31);
  });
  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T05:00:00Z", "UTC"),
      ).getDate(),
    ).toBe(1);
  });
  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T05:01:00Z", "UTC"),
      ).getDate(),
    ).toBe(1);
  });
  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T05:00:00Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(1);
  });
  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T02:00:00Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(31);
  });

  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T00:00:00Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(31);
  });

  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-05-31T23:59:59Z", "UTC"),
      ).getDate(),
    ).toBe(31);
  });

  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-05-31T23:59:59Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(31);
  });

  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-05-31T11:59:59Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(31);
  });

  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T02:59:59Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(31);
  });

  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T03:00:00Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(1);
  });
  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T05:00:00Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(1);
  });

  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T04:59:59Z", "UTC"),
      ).getDate(),
    ).toBe(31);
  });

  test("startOfDayButItRespectsDayStartHour", () => {
    expect(
      startOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T05:00:00Z", "UTC"),
      ).getDate(),
    ).toBe(1);
  });

  test("startOfDayButItRespectsDayStartHour idempotency", () => {
    const date = TZDate.tz("Europe/Copenhagen");
    expect(date).toEqual(date);
    expect(startOfDayButItRespectsDayStartHour(date)).toEqual(
      startOfDayButItRespectsDayStartHour(date),
    );
    expect(
      startOfDayButItRespectsDayStartHour(
        startOfDayButItRespectsDayStartHour(date),
      ),
    ).toEqual(startOfDayButItRespectsDayStartHour(date));
    expect(
      startOfDayButItRespectsDayStartHour(
        startOfDayButItRespectsDayStartHour(
          startOfDayButItRespectsDayStartHour(date),
        ),
      ),
    ).toEqual(startOfDayButItRespectsDayStartHour(date));
  });
});

await describe("endOfDayButItRespectsDayStartHour", () => {
  test("endOfDayButItRespectsDayStartHour", () => {
    expect(
      endOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T02:59:59Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(1);
  });
  test("endOfDayButItRespectsDayStartHour", () => {
    expect(
      endOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T03:00:00Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(2);
  });
  test("endOfDayButItRespectsDayStartHour", () => {
    expect(
      endOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T05:00:00Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(2);
  });
  test("endOfDayButItRespectsDayStartHour", () => {
    expect(
      endOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T05:01:00Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(2);
  });
  test("endOfDayButItRespectsDayStartHour", () => {
    expect(
      endOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T00:00:00Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(1);
  });
  test("endOfDayButItRespectsDayStartHour", () => {
    expect(
      endOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T23:59:59Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(2);
  });
  test("endOfDayButItRespectsDayStartHour", () => {
    expect(
      endOfDayButItRespectsDayStartHour(
        new TZDate("2024-06-01T05:00:00Z", "Europe/Copenhagen"),
      ).getDate(),
    ).toBe(2);
  });

  test("endOfDayButItRespectsDayStartHour idempotency", () => {
    const date = new Date();
    expect(date).toEqual(date);
    expect(endOfDayButItRespectsDayStartHour(date)).toEqual(
      endOfDayButItRespectsDayStartHour(date),
    );
    expect(
      endOfDayButItRespectsDayStartHour(
        endOfDayButItRespectsDayStartHour(date),
      ),
    ).toEqual(endOfDayButItRespectsDayStartHour(date));
    expect(
      endOfDayButItRespectsDayStartHour(
        endOfDayButItRespectsDayStartHour(
          endOfDayButItRespectsDayStartHour(date),
        ),
      ),
    ).toEqual(endOfDayButItRespectsDayStartHour(date));
  });
});
