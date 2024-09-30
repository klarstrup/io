"use client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useEvent, useInView } from "../../hooks";

const LoadMore = ({
  children,
  initialCursor,
  loadMoreAction,
}: React.PropsWithChildren<{
  initialCursor: string;
  loadMoreAction: (
    cursor: string
  ) => Promise<readonly [ReactNode | null, string | null]>;
}>) => {
  const { ref, inView } = useInView();
  const [loadMoreNodes, setLoadMoreNodes] = useState<ReactNode[]>([]);

  const currentOffsetRef = useRef<string | undefined>(initialCursor);

  const loadMore = useEvent(async (abortController?: AbortController) => {
    if (currentOffsetRef.current === undefined) return;

    const [node, next] = await loadMoreAction(currentOffsetRef.current);
    if (abortController?.signal.aborted) return;

    if (node !== null) {
      setLoadMoreNodes((prev) => [...prev, node]);
    }
    if (next === null) {
      currentOffsetRef.current = undefined;
      return;
    }

    currentOffsetRef.current = next;
  });

  useEffect(
    function A() {
      const signal = new AbortController();

      if (inView) void loadMore(signal);

      return () => {
        signal.abort();
      };
    },
    [inView, loadMore, loadMoreNodes.length]
  );

  return (
    <>
      {children}
      {loadMoreNodes}
      {currentOffsetRef.current ? (
        <article className="now" ref={ref}>
          <div className="content">
            We are <b>loading</b>
          </div>
        </article>
      ) : null}
    </>
  );
};

export default LoadMore;
