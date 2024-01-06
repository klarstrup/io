"use client";

import { isAfter, startOfMonth, subMonths } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useInView } from "../../hooks";

export function LoadPreviousMonthWhenYouSeeThisAlright({
  from,
}: {
  from: Date;
}) {
  const { ref, inView } = useInView();
  const router = useRouter();

  const prevMonth = useMemo(() => startOfMonth(subMonths(from, 1)), [from]);
  const isAtLimit = isAfter(new Date(2013, 10), prevMonth);

  useEffect(() => {
    if (inView && !isAtLimit) {
      const url = new URL(window.location.href);
      url.searchParams.set("from", prevMonth.toISOString().split("T")[0]!);

      router.replace(url.href as unknown as "/", { scroll: false });
    }
  }, [inView, prevMonth, isAtLimit, router]);

  if (isAtLimit) return null;

  return (
    <article className="now" ref={ref}>
      <div className="content">
        We are <b>loading</b>
      </div>
    </article>
  );
}
