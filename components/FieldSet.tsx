import type { HTMLProps } from "react";

export const FieldSetY = ({
  children,
  legend,
  className,
  ...props
}: HTMLProps<HTMLFieldSetElement> & {
  legend: HTMLProps<HTMLFieldSetElement>["children"];
}) => {
  return (
    <fieldset
      {...props}
      className={
        "flex-1 rounded-lg border-x-0 border-y-4 border-gray-900/20 px-1 pt-1 pb-2 " +
        className
      }
    >
      <legend className="ml-2">{legend}</legend>
      {children}
    </fieldset>
  );
};

export const FieldSetX = ({
  children,
  legend,
  className,
  ...props
}: HTMLProps<HTMLFieldSetElement> & {
  legend: HTMLProps<HTMLFieldSetElement>["children"];
}) => {
  return (
    <fieldset
      {...props}
      className={
        "flex-1 rounded-lg border-x-4 border-y-0 border-gray-900/20 px-2 py-1 " +
        className
      }
    >
      <legend className="ml-2">{legend}</legend>
      {children}
    </fieldset>
  );
};
