const backgroundElements = ["🤘", "io", "🏳️‍⚧️", "💪", "io", "🧗‍♀️"];

export default function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 -m-24 flex flex-col text-center text-[10vmin] leading-[2.1] whitespace-nowrap select-none">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-1 flex-row flex-nowrap items-center justify-center even:ml-[-3.75em]"
        >
          {Array.from({ length: i % 2 ? 24 : 16 }).map((_, j) => (
            <span
              key={j}
              className="mx-[1em] flex w-[32em] flex-row flex-nowrap items-center justify-center"
            >
              {backgroundElements[(i + j) % backgroundElements.length]}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
