export default function TodayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen w-full">{children}</div>
  );
}
