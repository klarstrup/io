"use client";

import {
  Children,
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  createContext,
  ElementType,
  isValidElement,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

type BreakPoints = Record<number, number> | Array<number | undefined>;
type BreakPointsArray = Array<number | undefined>;

type BreakPointSpec = BreakPoints;
type Columns = number | BreakPointSpec;

type AsProp<T extends ElementType> = { as?: T };

type PropsToOmit<T extends ElementType, P> = keyof (AsProp<T> & P);

type PolymorphicComponentProp<
  T extends ElementType,
  Props = object,
> = PropsWithChildren<Props & AsProp<T>> &
  Omit<ComponentPropsWithoutRef<T>, PropsToOmit<T, Props>>;

type PolymorphicComponentPropWithRef<
  T extends ElementType,
  Props = object,
> = PolymorphicComponentProp<T, Props> & { ref?: PolymorphicRef<T> };

type PolymorphicRef<T extends ElementType> = ComponentPropsWithRef<T>["ref"];

type MasonryOwnProps<T extends ElementType> = {
  rows?: Columns;
  gap?: number;
  rowProps?: PolymorphicComponentPropWithRef<T>;
};
type MasonryProps<T extends ElementType> = PolymorphicComponentPropWithRef<
  T,
  MasonryOwnProps<T>
>;

interface MasonryItemContextValues {
  row: number;
  position: number;
}

const MasonryItemContext = createContext<MasonryItemContextValues>({
  row: NaN,
  position: NaN,
});

const isBrowser = typeof window !== "undefined";

const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

const useWindowHeight = (isResponsive: boolean = true): number => {
  const [windowHeight, setWindowHeight] = useState(
    isBrowser ? window.innerHeight : 0,
  );

  const updateWindowHeight = useCallback(() => {
    setWindowHeight(window.innerHeight);
  }, []);

  useEffect(() => {
    if (isResponsive) window.addEventListener("resize", updateWindowHeight);

    return () => {
      window.removeEventListener("resize", updateWindowHeight);
    };
  }, [isResponsive, updateWindowHeight]);

  useIsomorphicLayoutEffect(() => {
    updateWindowHeight();
  }, [updateWindowHeight]);

  return windowHeight;
};

const defaultBreakpoints = [640, 786, 1024, 1280, 1536];

const arrayToBreakpoints = (breakPoints: BreakPointsArray): BreakPoints =>
  breakPoints.reduce((obj, bpValue, bpIndex) => {
    if (typeof bpValue !== "number") return obj;

    return { ...obj, [defaultBreakpoints[bpIndex]!]: bpValue };
  }, {});

const normalizeBreakPoints = (breakPoints: BreakPointSpec): BreakPoints => {
  if (!Array.isArray(breakPoints)) return breakPoints;

  return arrayToBreakpoints(breakPoints);
};

const findBreakpoint = (
  breakpoints: BreakPointSpec,
  windowHeight: number,
): number => {
  const sortedBreakPoints = Object.keys(normalizeBreakPoints(breakpoints))
    .map(Number)
    .sort((a, b) => a - b);

  let bp: number | null = null;

  for (const breakPoint of sortedBreakPoints) {
    if (windowHeight >= breakPoint) bp = breakPoint;
  }

  return bp ?? sortedBreakPoints[0]!;
};

const createEmptyRows = (count: number): Array<[]> =>
  Array.from({ length: count }, () => []);

const DEFAULT_ROWS = 3;

const useRowsCount = (rows?: Columns): number => {
  const isResponsive = typeof rows === "object";

  const windowHeight = useWindowHeight(isResponsive);

  const rowsCount = useMemo(() => {
    if (!isResponsive) {
      return rows ?? DEFAULT_ROWS;
    }

    const breakPoint = findBreakpoint(rows, windowHeight);
    return rows[breakPoint] ?? DEFAULT_ROWS;
  }, [isResponsive, windowHeight, rows]);

  return rowsCount;
};

const useMasonry = (children: ReactNode, rows?: Columns): ReactNode[][] => {
  const noOfRows = useRowsCount(rows);

  const rowsChildren = useMemo(() => {
    const group: ReactNode[][] = createEmptyRows(noOfRows);

    Children.forEach(children, (child, index) => {
      if (isValidElement(child)) group[index % noOfRows]!.push(child);
    });

    return group;
  }, [noOfRows, children]);

  return rowsChildren;
};

export const Masonry = <T extends ElementType = "div">(
  props: MasonryProps<T>,
) => {
  const { gap, as: Component = "div", rowProps, rows, ref, ...rest } = props;

  const uniq = useId();
  const rowsChildren = useMasonry(props.children, rows);

  return (
    <Component
      {...rest}
      className={twMerge("flex flex-col", rest.className)}
      style={{ gap, ...rest.style }}
      ref={ref}
    >
      {rowsChildren.map((row, index) => (
        <Component
          key={`Masonry__Row_${uniq}_${index}`}
          {...rowProps}
          className={twMerge("flex flex-1", rowProps?.className)}
          style={rowProps?.style}
        >
          {row.map((child, childIndex) => (
            <MasonryItemContext
              value={{ row: index, position: childIndex }}
              key={`Masonry__Row_Child_${uniq}_${childIndex}`}
            >
              {child}
            </MasonryItemContext>
          ))}
        </Component>
      ))}
    </Component>
  );
};
