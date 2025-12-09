"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface OrbCoreProps {
  onClick: () => void
  isExpanded: boolean
  isDragging: boolean
}

export function OrbCore({ onClick, isExpanded, isDragging }: OrbCoreProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className="relative cursor-pointer select-none"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: isDragging ? 1.1 : 1,
        opacity: 1,
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-500",
          isDragging
            ? "bg-gradient-to-br from-cyan-400/40 to-violet-400/40 blur-xl scale-125"
            : "bg-gradient-to-br from-blue-400/20 to-violet-400/20 blur-lg scale-110",
        )}
        animate={{
          scale: isHovered ? [1.1, 1.2, 1.1] : isDragging ? 1.25 : 1.1,
          opacity: isHovered ? [0.3, 0.5, 0.3] : 0.3,
        }}
        transition={{
          duration: 1.5,
          repeat: isHovered ? Number.POSITIVE_INFINITY : 0,
          ease: "easeInOut",
        }}
      />

      {/* Main Orb */}
      <motion.div
        className={cn(
          "relative w-56 h-56 md:w-72 md:h-72 rounded-full",
          "bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500",
          "shadow-2xl shadow-blue-500/30",
          "flex items-center justify-center",
          "overflow-hidden",
          isDragging && "ring-4 ring-cyan-300/50 ring-offset-4 ring-offset-transparent",
        )}
        animate={{
          boxShadow: isHovered
            ? [
                "0 25px 50px -12px rgba(59, 130, 246, 0.3)",
                "0 25px 50px -12px rgba(139, 92, 246, 0.5)",
                "0 25px 50px -12px rgba(59, 130, 246, 0.3)",
              ]
            : "0 25px 50px -12px rgba(59, 130, 246, 0.3)",
        }}
        transition={{
          duration: 2,
          repeat: isHovered ? Number.POSITIVE_INFINITY : 0,
          ease: "easeInOut",
        }}
      >
        {/* Inner Highlights */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <motion.div
          className="absolute top-8 left-8 w-16 h-16 rounded-full bg-white/20 blur-md"
          animate={{
            x: isHovered ? [0, 5, 0] : 0,
            y: isHovered ? [0, 3, 0] : 0,
          }}
          transition={{
            duration: 2,
            repeat: isHovered ? Number.POSITIVE_INFINITY : 0,
            ease: "easeInOut",
          }}
        />

        {/* Animated Ring */}
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-white/20"
          animate={{
            rotate: 360,
            scale: isHovered ? [1, 1.02, 1] : 1,
          }}
          transition={{
            rotate: { duration: isHovered ? 10 : 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            scale: { duration: 1, repeat: isHovered ? Number.POSITIVE_INFINITY : 0 },
          }}
        />

        <motion.div
          className="absolute inset-0 rounded-full bg-white/10"
          animate={{
            scale: isHovered ? [1, 1.08, 1] : [1, 1.05, 1],
            opacity: isHovered ? [0.15, 0.3, 0.15] : [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: isHovered ? 1.5 : 3,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />

        {/* Text Content */}
        <div className="relative z-10 text-center px-8">
          <motion.p
            className="text-white/90 text-lg md:text-xl font-medium leading-relaxed text-balance"
            animate={{
              opacity: isDragging ? 0.5 : 1,
              scale: isHovered ? 1.02 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            {isDragging ? "Drop file here" : "How can I assist you today?"}
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  )
}
