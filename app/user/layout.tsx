export default function UserLayout({ children }: LayoutProps<"/user">) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-3xl flex-col items-center justify-center p-2">
      <div className="flex w-full max-w-3xl flex-col items-stretch rounded-xl border border-black/25 bg-white p-2">
        {children}
      </div>
    </div>
  );
}
