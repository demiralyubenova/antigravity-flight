"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <div
      className={cn(
        "flex w-16 h-8 p-1 rounded-full cursor-pointer transition-colors duration-300",
        isDark ? "bg-zinc-800" : "bg-zinc-200",
        className
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setTheme(isDark ? "light" : "dark")
        }
      }}
    >
      <div className="flex justify-between items-center w-full">
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300",
            isDark
              ? "bg-zinc-700 text-yellow-400"
              : "bg-transparent text-zinc-400"
          )}
        >
          {isDark ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </div>

        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300",
            !isDark
              ? "bg-white text-yellow-500 shadow-sm"
              : "bg-transparent text-zinc-500"
          )}
        >
          {isDark ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  )
}
