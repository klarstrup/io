import { UserLayoutLinks } from "./UserLayoutLinks";

export default function UserLayout({ children }: LayoutProps<"/user">) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-3xl flex-col items-center justify-center p-2">
      <div className="relative flex w-full max-w-3xl flex-col items-stretch rounded-xl border border-t-0 border-black/25 bg-white p-2 pt-0">
        <UserLayoutLinks />
        {children}
      </div>
    </div>
  );
}
