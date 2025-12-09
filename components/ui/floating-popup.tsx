"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FloatingPopupProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultSize?: "normal" | "large" | "wide"
}

export function FloatingPopup({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  defaultSize = "normal",
}: FloatingPopupProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const sizeClasses = {
    normal: "max-w-2xl max-h-[80vh]",
    large: "max-w-4xl max-h-[85vh]",
    wide: "max-w-5xl max-h-[85vh]",
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-50 flex flex-col",
              "bg-white/95 backdrop-blur-xl",
              "border border-slate-200/50",
              "shadow-2xl shadow-black/10",
              "overflow-hidden",
              isFullscreen
                ? "inset-4 rounded-2xl"
                : cn(
                    "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                    "w-[calc(100%-2rem)] rounded-3xl",
                    sizeClasses[defaultSize],
                  ),
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200/50 flex-shrink-0 bg-gradient-to-r from-slate-50/50 to-white/50">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-slate-900">{title}</h2>
                  {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="rounded-xl hover:bg-slate-100"
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-slate-600" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-slate-600" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-600" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
