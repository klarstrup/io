"use client";
import { ReactNode, useEffect, useState } from "react";
import { useEvent, useInView } from "../hooks";

function LoadMore<Cursor>({
  children,
  initialCursor,
  loadMoreAction,
  params,
}: React.PropsWithChildren<{
  initialCursor: Cursor;
  loadMoreAction: (
    cursor: Cursor,
    params?: Record<string, string | string[]>,
  ) => Promise<readonly [ReactNode | null, Cursor | null]>;
  params?: Record<string, string | string[]>;
}>) {
  const { ref, inView } = useInView();
  const [loadMoreNodes, setLoadMoreNodes] = useState<ReactNode[]>([]);

  const [currentOffsetRef, setCurrentOffsetRef] = useState<Cursor | undefined>(
    initialCursor,
  );

  const loadMore = useEvent(async (abortController?: AbortController) => {
    if (currentOffsetRef === undefined) return;

    const [node, next] = await loadMoreAction(currentOffsetRef, params);
    if (abortController?.signal.aborted) return;

    if (node !== null) {
      setLoadMoreNodes((prev) => [...prev, node]);
    }
    if (next === null) {
      setCurrentOffsetRef(undefined);
      return;
    }

    setCurrentOffsetRef(next);
  });

  useEffect(() => {
    const signal = new AbortController();

    if (inView) void loadMore(signal);

    return () => signal.abort();
  }, [inView, loadMore, loadMoreNodes.length]);

  return (
    <>
      {children}
      {loadMoreNodes}
      {currentOffsetRef ? (
        <article className="now" ref={ref}>
          <div className="content">
            We are <b>loading</b>
          </div>
        </article>
      ) : null}
    </>
  );
}

export default LoadMore;
