export default function UserLayout({ children }: LayoutProps<"/user">) {
  return (
    <div className="max-h-screen min-h-screen">
      <div className="mx-auto max-h-screen max-w-xl self-stretch border-black/25 px-2">
        {children}
      </div>
    </div>
  );
}
