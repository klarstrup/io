import { FieldSetY } from "../../components/FieldSet";

export default function Loading() {
  return (
    <div className="max-h-screen min-h-screen">
      <div className="mx-auto max-h-screen max-w-2xl self-stretch border-black/25 px-2">
        <FieldSetY
          legend={null}
          className="mx-auto max-w-2xl self-stretch border-black/50 bg-gray-500/25 px-2"
        >
          <center className="text-white">Loading journal...</center>
        </FieldSetY>
      </div>
    </div>
  );
}
