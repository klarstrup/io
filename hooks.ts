import {
  type RefObject,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
} from "react";
import useInterval from "./hooks/useInterval";

type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Similar to useCallback, with a few subtle differences:
 * - The returned function is a stable reference, and will always be the same between renders
 * - No dependency lists required
 * - Properties or state accessed within the callback will always be "current"
 */
export function useEvent<TCallback extends AnyFunction>(
  callback: TCallback,
): TCallback {
  // Keep track of the latest callback:
  const latestRef = useRef<TCallback>(
    process.env.NODE_ENV === "production"
      ? (useEvent_shouldNotBeInvokedBeforeMount as TCallback)
      : (undefined as unknown as TCallback),
  );
  useInsertionEffect(() => {
    latestRef.current = callback;
  }, [callback]);

  // Create a stable callback that always calls the latest callback:
  // using useRef instead of useCallback avoids creating and empty array on every render
  const stableRef = useRef<TCallback>(null as unknown as TCallback);
  if (!stableRef.current) {
    // eslint-disable-next-line react-hooks/unsupported-syntax
    stableRef.current = function (this: unknown) {
      // eslint-disable-next-line prefer-rest-params
      return latestRef.current.apply(this, arguments) as unknown;
    } as TCallback;
  }

  return stableRef.current;
}

/**
 * Render methods should be pure, especially when concurrency is used,
 * so we will throw this error if the callback is called while rendering.
 */
function useEvent_shouldNotBeInvokedBeforeMount() {
  throw new Error(
    "INVALID_USEEVENT_INVOCATION: the callback from useEvent cannot be invoked before the component has mounted.",
  );
}

const observerMap = new Map<
  string,
  {
    id: string;
    observer: IntersectionObserver;
    elements: Map<Element, Array<ObserverInstanceCallback>>;
  }
>();

const RootIds: WeakMap<Element | Document, string> = new WeakMap();
let rootId = 0;

/**
 * Generate a unique ID for the root element
 * @param root
 */
function getRootId(root: IntersectionObserverInit["root"]) {
  if (!root) return "0";
  if (RootIds.has(root)) return RootIds.get(root);
  rootId += 1;
  RootIds.set(root, rootId.toString());
  return RootIds.get(root);
}

/**
 * Convert the options to a string Id, based on the values.
 * Ensures we can reuse the same observer when observing elements with the same options.
 * @param options
 */
function optionsToId(options: IntersectionObserverInit) {
  return Object.keys(options)
    .sort()
    .filter(
      (key): key is keyof IntersectionObserverInit =>
        options[key as keyof IntersectionObserverInit] !== undefined,
    )
    .map(
      (key) =>
        `${key}_${
          key === "root"
            ? getRootId(options.root)
            : JSON.stringify(options[key as keyof IntersectionObserverInit])
        }`,
    )
    .toString();
}

function createObserver(options: IntersectionObserverInit) {
  // Create a unique ID for this observer instance, based on the root, root margin and threshold.
  const id = optionsToId(options);
  let instance = observerMap.get(id);

  if (!instance) {
    // Create a map of elements this observer is going to observe. Each element has a list of callbacks that should be triggered, once it comes into view.
    const elements = new Map<Element, Array<ObserverInstanceCallback>>();
    let thresholds: number[] | readonly number[] = [];

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // While it would be nice if you could just look at isIntersecting to determine if the component is inside the viewport, browsers can't agree on how to use it.
        // -Firefox ignores `threshold` when considering `isIntersecting`, so it will never be false again if `threshold` is > 0
        const inView =
          entry.isIntersecting &&
          thresholds.some((threshold) => entry.intersectionRatio >= threshold);

        // @ts-expect-error - support IntersectionObserver v2.
        if (options.trackVisibility && typeof entry.isVisible === "undefined") {
          // @ts-expect-error - The browser doesn't support Intersection Observer v2, falling back to v1 behavior.
          entry.isVisible = inView;
        }

        elements.get(entry.target)?.forEach((callback) => {
          callback(inView, entry);
        });
      });
    }, options);

    // Ensure we have a valid thresholds array. If not, use the threshold from the options
    thresholds =
      observer.thresholds ||
      (Array.isArray(options.threshold)
        ? options.threshold
        : [options.threshold || 0]);

    instance = {
      id,
      observer,
      elements,
    };

    observerMap.set(id, instance);
  }

  return instance;
}

const unsupportedValue: boolean | undefined = undefined;
/**
 * @param element - DOM Element to observe
 * @param callback - Callback function to trigger when intersection status changes
 * @param options - Intersection Observer options
 * @param fallbackInView - Fallback inView value.
 * @return Function - Cleanup function that should be triggered to unregister the observer
 */
function observe(
  element: Element,
  callback: ObserverInstanceCallback,
  options: IntersectionObserverInit = {},
  fallbackInView = unsupportedValue,
) {
  if (
    typeof window.IntersectionObserver === "undefined" &&
    fallbackInView !== undefined
  ) {
    const bounds = element.getBoundingClientRect();
    callback(fallbackInView, {
      isIntersecting: fallbackInView,
      target: element,
      intersectionRatio:
        typeof options.threshold === "number" ? options.threshold : 0,
      time: 0,
      boundingClientRect: bounds,
      intersectionRect: bounds,
      rootBounds: bounds,
    });
    return () => {
      // Nothing to cleanup
    };
  }
  // An observer with the same options can be reused, so lets use this fact
  const { id, observer, elements } = createObserver(options);

  // Register the callback listener for this element
  const callbacks = elements.get(element) || [];
  if (!elements.has(element)) elements.set(element, callbacks);

  callbacks.push(callback);
  observer.observe(element);

  return function unobserve() {
    // Remove the callback from the callback list
    callbacks.splice(callbacks.indexOf(callback), 1);

    if (callbacks.length === 0) {
      // No more callback exists for element, so destroy it
      elements.delete(element);
      observer.unobserve(element);
    }

    if (elements.size === 0) {
      // No more elements are being observer by this instance, so destroy it
      observer.disconnect();
      observerMap.delete(id);
    }
  };
}

type ObserverInstanceCallback = (
  inView: boolean,
  entry: IntersectionObserverEntry,
) => void;

interface IntersectionOptions extends IntersectionObserverInit {
  /** The IntersectionObserver interface's read-only `root` property identifies the Element or Document whose bounds are treated as the bounding box of the viewport for the element which is the observer's target. If the `root` is null, then the bounds of the actual document viewport are used.*/
  root?: Element | null;
  /** Margin around the root. Can have values similar to the CSS margin property, e.g. `10px 20px 30px 40px` (top, right, bottom, left). */
  rootMargin?: string;
  /** Number between `0` and `1` indicating the percentage that should be visible before triggering. Can also be an `array` of numbers, to create multiple trigger points. */
  threshold?: number | number[];
  /** Only trigger the inView callback once */
  triggerOnce?: boolean;
  /** Skip assigning the observer to the `ref` */
  skip?: boolean;
  /** Set the initial value of the `inView` boolean. This can be used if you expect the element to be in the viewport to start with, and you want to trigger something when it leaves. */
  initialInView?: boolean;
  /** Fallback to this inView state if the IntersectionObserver is unsupported, and a polyfill wasn't loaded */
  fallbackInView?: boolean;
  /** IntersectionObserver v2 - Track the actual visibility of the element */
  trackVisibility?: boolean;
  /** IntersectionObserver v2 - Set a minimum delay between notifications */
  delay?: number;
  /** Call this function whenever the in view state changes */
  onChange?: (inView: boolean, entry: IntersectionObserverEntry) => void;
}

/**
 * The Hook response supports both array and object destructing
 */
type InViewHookResponse = [
  (node?: Element | null) => void,
  boolean,
  IntersectionObserverEntry | undefined,
] & {
  ref: (node?: Element | null) => void;
  inView: boolean;
  entry?: IntersectionObserverEntry;
};

type State = {
  inView: boolean;
  entry?: IntersectionObserverEntry;
};

/**
 * React Hooks make it easy to monitor the `inView` state of your components. Call
 * the `useInView` hook with the (optional) [options](#options) you need. It will
 * return an array containing a `ref`, the `inView` status and the current
 * [`entry`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserverEntry).
 * Assign the `ref` to the DOM element you want to monitor, and the hook will
 * report the status.
 *
 * @example
 * ```jsx
 * import React from 'react';
 * import { useInView } from 'react-intersection-observer';
 *
 * const Component = () => {
 *   const { ref, inView, entry } = useInView({
 *       threshold: 0,
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       <h2>{`Header inside viewport ${inView}.`}</h2>
 *     </div>
 *   );
 * };
 * ```
 */
export function useInView({
  threshold,
  delay,
  trackVisibility,
  rootMargin,
  root,
  triggerOnce,
  skip,
  initialInView,
  fallbackInView,
  onChange,
}: IntersectionOptions = {}): InViewHookResponse {
  const [ref, setRef] = useState<Element | null>(null);
  const callback = useRef<IntersectionOptions["onChange"]>(undefined);
  const [state, setState] = useState<State>({
    inView: Boolean(initialInView),
    entry: undefined,
  });

  // Store the onChange callback in a `ref`, so we can access the latest instance
  // inside the `useEffect`, but without triggering a rerender.
  callback.current = onChange;

  useEffect(
    () => {
      // Ensure we have node ref, and that we shouldn't skip observing
      if (skip || !ref) return;

      let unobserve: (() => void) | undefined;
      unobserve = observe(
        ref,
        (inView, entry) => {
          setState({
            inView,
            entry,
          });
          if (callback.current) callback.current(inView, entry);

          if (entry.isIntersecting && triggerOnce && unobserve) {
            // If it should only trigger once, unobserve the element after it's inView
            unobserve();
            unobserve = undefined;
          }
        },
        {
          root,
          rootMargin,
          threshold,
          // @ts-expect-error - Support for the v2 API
          trackVisibility,
          delay,
        },
        fallbackInView,
      );

      return () => {
        unobserve?.();
      };
    },
    // We break the rule here, because we aren't including the actual `threshold` variable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      // If the threshold is an array, convert it to a string, so it won't change between renders.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Array.isArray(threshold) ? threshold.toString() : threshold,
      ref,
      root,
      rootMargin,
      triggerOnce,
      skip,
      trackVisibility,
      fallbackInView,
      delay,
    ],
  );

  const entryTarget = state.entry?.target;
  const previousEntryTarget = useRef<Element>(undefined);
  if (
    !ref &&
    entryTarget &&
    !triggerOnce &&
    !skip &&
    previousEntryTarget.current !== entryTarget
  ) {
    // If we don't have a node ref, then reset the state (unless the hook is set to only `triggerOnce` or `skip`)
    // This ensures we correctly reflect the current state - If you aren't observing anything, then nothing is inView
    previousEntryTarget.current = entryTarget;
    setState({ inView: Boolean(initialInView), entry: undefined });
  }

  const result = [setRef, state.inView, state.entry] as InViewHookResponse;

  // Support object destructuring, by adding the specific values.
  result.ref = result[0];
  result.inView = result[1];
  result.entry = result[2];

  return result;
}

export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
) => {
  const handleClick = useEvent((event: MouseEvent) => {
    if (
      ref.current &&
      !ref.current.contains(event.target as HTMLElement) &&
      // The event target is still in the document, so the element wasn't removed
      // (e.g. by the time the click happened, the element was removed from the DOM)
      document.body.contains(event.target as HTMLElement)
    ) {
      callback();
    }
  });

  useEffect(() => {
    document.addEventListener("click", handleClick);

    return () => document.removeEventListener("click", handleClick);
  });
};

export function usePageVisibility() {
  const [isPageVisible, setIsPageVisible] = useState(
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPageVisible(document.visibilityState === "visible");

    function onVisibilityChange() {
      setIsPageVisible(document.visibilityState === "visible");
    }

    window.addEventListener("visibilitychange", onVisibilityChange);

    return () =>
      window.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return isPageVisible;
}

/**
 * Simple hook that returns undefined when the page isn't visible but otherwise returns the given number
 */
export const useVisibilityAwarePollInterval = (pollInterval: number) => {
  const isPageVisible = usePageVisibility();

  return isPageVisible ? pollInterval : undefined;
};

export const useNow = (updateInterval = 500) => {
  const [now, setNow] = useState(() => new Date());

  useInterval(
    () => setNow(new Date()),
    useVisibilityAwarePollInterval(updateInterval),
  );

  return now;
};
