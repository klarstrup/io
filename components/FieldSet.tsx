import { HTMLProps } from "react";

export const FieldSetY = (props: HTMLProps<HTMLFieldSetElement>) => {
  return (
    <fieldset
      {...props}
      className={
        "flex-1 rounded-lg border-x-0 border-y-4 border-gray-900/20 px-1 py-2 " +
        props.className
      }
    />
  );
};

export const FieldSetX = (props: HTMLProps<HTMLFieldSetElement>) => {
  return (
    <fieldset
      {...props}
      className={
        "flex-1 rounded-lg border-x-4 border-y-0 border-gray-900/20 px-2 py-1 " +
        props.className
      }
    />
  );
};
