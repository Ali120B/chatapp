interface DateSeparatorProps {
  label: string
}

export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-white/8" />
      <span className="shrink-0 text-[10px] text-[#A0A4A8]">{label}</span>
      <div className="h-px flex-1 bg-white/8" />
    </div>
  )
}
