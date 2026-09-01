const ROWS: { cls: string; text: string }[] = [
  { cls: 'border-4 border-solid border-gray-900', text: 'Epic (root)' },
  { cls: 'border-2 border-solid border-gray-700', text: 'Issue inside the epic' },
  { cls: 'border-2 border-dashed border-gray-500', text: 'Prerequisite outside the epic' },
  { cls: 'border-2 border-dotted border-gray-500', text: 'Dependent outside the epic' },
];

export function Legend() {
  return (
    <div className="absolute bottom-3 left-3 z-10 rounded bg-white/90 p-3 text-xs text-gray-700 shadow">
      <div className="mb-1 font-semibold">Legend</div>
      {ROWS.map((r) => (
        <div key={r.text} className="flex items-center gap-2">
          <span className={`inline-block h-4 w-8 rounded bg-white ${r.cls}`} />
          <span>{r.text}</span>
        </div>
      ))}
      <div className="mt-1">Fill colour = YouTrack state colour; faded = resolved.</div>
      <div>Arrow: prerequisite → dependent. Click a card to open the issue.</div>
    </div>
  );
}
