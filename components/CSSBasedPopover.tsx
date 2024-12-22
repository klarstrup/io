import { useId } from "react";

export default function CSSBasedPopover({
  children,
  control,
  className,
}: {
  children: React.ReactNode | React.ReactNode[];
  control: React.ReactNode | React.ReactNode[];
  className?: string;
}) {
  const id = useId();

  return (
    <div className={className}>
      <style>
        {`
        #${CSS.escape(id)}:checked + div {
          display: block !important; 
        }
        #${CSS.escape(id)}:checked + div + label {
          display: block !important; 
        }
      `}
      </style>
      <label htmlFor={id} className="cursor-pointer select-none">
        {control}
      </label>
      <input type="checkbox" id={id} className="hidden" />
      {children}
      <label
        htmlFor={id}
        className="fixed inset-0 -z-10 hidden bg-black/50 backdrop-blur-sm"
      ></label>
    </div>
  );
}
