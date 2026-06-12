"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setTimeout(() => setMounted(true), 0)
  }, [])

  if (!mounted) return (
    <button className="w-full flex items-center justify-between px-3 py-2 text-text-muted transition-colors duration-150 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5" />
        <span className="text-sm">Theme</span>
      </div>
    </button>
  )

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <button 
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-full flex items-center justify-between px-3 py-2 text-text-muted hover:text-on-surface hover:bg-surface-container transition-colors duration-150 rounded-lg"
    >
      <div className="flex items-center gap-3">
        {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        <span className="text-sm">{isDark ? "Dark Mode" : "Light Mode"}</span>
      </div>
      <div className="w-8 h-4 bg-border-subtle rounded-full relative flex items-center shadow-inner">
        <div className={`w-3 h-3 bg-on-surface rounded-full absolute transition-transform duration-200 ${isDark ? "translate-x-4" : "translate-x-1"}`} />
      </div>
    </button>
  )
}
