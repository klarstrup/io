export default function UserLayout({ children }: LayoutProps<"/user">) {
  return (
    <div className="min-H-screen p-2">
      <div className="mx-auto max-w-xl self-stretch rounded-xl border border-black/25 bg-white p-2">
        {children}
      </div>
    </div>
  );
}
