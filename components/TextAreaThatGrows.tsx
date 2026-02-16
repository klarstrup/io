import { forwardRef, useLayoutEffect, useRef } from "react";
import mergeRefs from "../utils/merge-refs";

export const TextAreaThatGrows = forwardRef(function TextAreaThatGrows(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  ref: React.Ref<HTMLTextAreaElement>,
) {
  const textboxRef = useRef<HTMLTextAreaElement>(null);

  function adjustHeight() {
    const textbox = textboxRef.current;
    if (!textbox) return;
    textbox.style.height = "inherit";
    textbox.style.height = `${textbox.scrollHeight}px`;
  }

  useLayoutEffect(adjustHeight, []);

  return (
    <textarea
      {...props}
      ref={mergeRefs(textboxRef, ref)}
      onChange={(e) => {
        adjustHeight();
        props.onChange?.(e);
      }}
    />
  );
});
