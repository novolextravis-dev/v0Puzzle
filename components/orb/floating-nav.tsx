"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Upload, MessageCircle, Settings2, FilePlus, FolderOpen, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface FloatingNavProps {
  isExpanded: boolean
  onAction: (action: string) => void
}

const navItems = [
  {
    id: "upload",
    label: "Upload",
    icon: Upload,
    position: { x: -160, y: 80 },
    description: "Scan & upload files",
    color: "from-blue-500 to-cyan-500",
    glowColor: "shadow-blue-500/30",
  },
  {
    id: "file",
    label: "Filed",
    icon: FolderOpen,
    position: { x: -100, y: 140 },
    description: "Organized documents",
    color: "from-amber-500 to-orange-500",
    glowColor: "shadow-amber-500/30",
  },
  {
    id: "concerns",
    label: "Concerns",
    icon: Users,
    position: { x: -30, y: 170 },
    description: "Employee issues tracker",
    color: "from-rose-500 to-pink-500",
    glowColor: "shadow-rose-500/30",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircle,
    position: { x: 40, y: 170 },
    description: "AI assistant",
    color: "from-emerald-500 to-teal-500",
    glowColor: "shadow-emerald-500/30",
  },
  {
    id: "create",
    label: "Create",
    icon: FilePlus,
    position: { x: 110, y: 140 },
    description: "AI document creator",
    color: "from-violet-500 to-purple-500",
    glowColor: "shadow-violet-500/30",
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: Settings2,
    position: { x: 170, y: 80 },
    description: "Workflow automation",
    color: "from-indigo-500 to-blue-500",
    glowColor: "shadow-indigo-500/30",
  },
]

export function FloatingNav({ isExpanded, onAction }: FloatingNavProps) {
  return (
    <AnimatePresence>
      {isExpanded &&
        navItems.map((item, index) => (
          <motion.div
            key={item.id}
            className="absolute z-20"
            initial={{
              opacity: 0,
              x: 0,
              y: 0,
              scale: 0.3,
            }}
            animate={{
              opacity: 1,
              x: item.position.x,
              y: item.position.y,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              x: 0,
              y: 0,
              scale: 0.3,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 28,
              delay: index * 0.04,
            }}
          >
            <NavButton item={item} onAction={onAction} />
          </motion.div>
        ))}
    </AnimatePresence>
  )
}

function NavButton({
  item,
  onAction,
}: {
  item: (typeof navItems)[0]
  onAction: (action: string) => void
}) {
  const Icon = item.icon

  return (
    <motion.button
      onClick={() => onAction(item.id)}
      className={cn(
        "group relative flex flex-col items-center gap-1.5",
        "px-4 py-3 rounded-2xl",
        "bg-background/90 backdrop-blur-xl",
        "border border-border/50",
        "shadow-lg",
        "transition-all duration-300",
      )}
      whileHover={{
        scale: 1.1,
        y: -6,
        transition: { type: "spring", stiffness: 400, damping: 17 },
      }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className={cn(
          "absolute inset-0 rounded-2xl",
          "bg-gradient-to-br",
          item.color,
          "opacity-0 group-hover:opacity-20",
          "transition-opacity duration-300",
          "-z-10",
        )}
      />
      <motion.div
        className={cn(
          "absolute inset-0 rounded-2xl",
          "shadow-xl",
          item.glowColor,
          "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-300",
        )}
      />

      {/* Icon container with gradient */}
      <div
        className={cn(
          "relative flex items-center justify-center w-11 h-11 rounded-xl",
          "bg-gradient-to-br",
          item.color,
          "p-[1.5px]",
          "shadow-lg",
          item.glowColor,
        )}
      >
        <div className="flex items-center justify-center w-full h-full rounded-[10px] bg-background/95">
          <Icon
            className={cn(
              "w-5 h-5 transition-all duration-300",
              "text-muted-foreground group-hover:text-foreground",
              "group-hover:scale-110",
            )}
          />
        </div>
      </div>

      {/* Label */}
      <span className="text-xs font-semibold text-foreground/90 group-hover:text-foreground transition-colors">
        {item.label}
      </span>

      {/* Tooltip on hover */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        whileHover={{ opacity: 1, y: 0 }}
        className={cn(
          "absolute -bottom-9 left-1/2 -translate-x-1/2",
          "px-3 py-1.5 rounded-lg",
          "bg-foreground text-background",
          "text-[11px] font-medium whitespace-nowrap",
          "opacity-0 group-hover:opacity-100 pointer-events-none",
          "transition-all duration-200",
          "shadow-lg",
        )}
      >
        {item.description}
        {/* Arrow */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
      </motion.div>
    </motion.button>
  )
}
