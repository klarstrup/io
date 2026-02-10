export default function UserLayout({ children }: LayoutProps<"/user">) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-2xl flex-col items-stretch justify-center p-2">
      <div className="flex max-w-xl flex-col items-stretch self-stretch rounded-xl border border-black/25 bg-white p-2 px-2">
        {children}
      </div>
    </div>
  );
}
