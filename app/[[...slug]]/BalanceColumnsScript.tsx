import Script from "next/script";

export function BalanceColumnsScript() {
  return (
    <Script key={String(new Date())} id={String(new Date())}>
      {`
          var balanceColumns = ${String(balanceColumns)};
          window.addEventListener("resize", () => {
            balanceColumns();
            setTimeout(() => balanceColumns(), 200);
            setTimeout(() => balanceColumns(), 400);
            setTimeout(() => balanceColumns(), 600);
          });
          window.addEventListener("popstate", () => {
            balanceColumns();
            setTimeout(() => balanceColumns(), 200);
            setTimeout(() => balanceColumns(), 400);
            setTimeout(() => balanceColumns(), 600);
          });
          window.addEventListener("navigate", () => {
            balanceColumns();
            setTimeout(() => balanceColumns(), 200);
            setTimeout(() => balanceColumns(), 400);
            setTimeout(() => balanceColumns(), 600);
          });
          balanceColumns();
          setTimeout(() => balanceColumns(), 200);
          setTimeout(() => balanceColumns(), 400);
          setTimeout(() => balanceColumns(), 600);
          `}
    </Script>
  );
}

function balanceColumns() {
  const timelines = document.querySelectorAll<HTMLElement>("#timeline");
  for (const timeline of Array.from(timelines)) {
    let leftColumnHeight = 0;
    let rightColumnHeight = 0;
    const articles = timeline.querySelectorAll<HTMLElement>(
      "#timeline > article",
    );
    for (const article of Array.from(articles)) {
      article.classList.remove("left");
      article.classList.remove("right");
      if (leftColumnHeight - rightColumnHeight > 5) {
        article.classList.add("right");
        rightColumnHeight += article.offsetHeight;
      } else {
        article.classList.add("left");
        leftColumnHeight += article.offsetHeight;
      }
    }
  }
}
