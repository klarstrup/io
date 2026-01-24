import { FieldSetY } from "../../components/FieldSet";

export default function Loading() {
  return (
    <FieldSetY
      legend={null}
      className="mx-auto max-w-2xl self-stretch border-black/50 bg-gray-500/25 px-2"
    >
      <center className="text-white">Loading todos...</center>
    </FieldSetY>
  );
}
