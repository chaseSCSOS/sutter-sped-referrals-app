import * as React from "react"

import { cn } from "@/lib/utils"

const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border border-cream-200 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-warm-gray-700",
        className
      )}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge }
