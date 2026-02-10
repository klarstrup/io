import { FieldSetY } from "../../components/FieldSet";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col justify-center py-2">
      <div className="mx-auto max-h-screen max-w-2xl self-stretch px-2">
        <FieldSetY
          legend={null}
          className="mx-auto max-w-2xl border-black/50 bg-gray-500/25 px-2"
        >
          <center className="text-white">Loading journal...</center>
        </FieldSetY>
      </div>
    </div>
  );
}
