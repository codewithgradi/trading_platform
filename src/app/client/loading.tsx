export default function ClientLoading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-9 w-72 rounded-lg" />
      <div className="skeleton h-4 w-96 rounded" />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="skeleton h-40 rounded-xl" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="skeleton h-80 rounded-xl" />
        <div className="skeleton h-80 rounded-xl" />
      </div>
    </div>
  );
}
