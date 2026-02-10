export default function UserLayout({ children }: LayoutProps<"/user">) {
  return (
    <div className="max-h-screen min-h-screen">
      <div className="mx-auto max-h-screen max-w-xl self-stretch rounded-xl border border-black/25 bg-white p-2">
        {children}
      </div>
    </div>
  );
}
