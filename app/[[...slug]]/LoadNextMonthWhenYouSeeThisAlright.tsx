"use client";

import { startOfMonth, subMonths } from "date-fns";
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

  useEffect(() => {
    if (inView) {
      const url = new URL(window.location.href);
      url.searchParams.set("from", prevMonth.toISOString().split("T")[0]!);

      router.replace(url.href as unknown as "/", { scroll: false });
    }
  }, [inView, prevMonth, router]);

  return (
    <article className="now" ref={ref}>
      <div className="content">
        We are <b>loading</b>
      </div>
    </article>
  );
}
