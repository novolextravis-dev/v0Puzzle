"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, Shield, Users, Briefcase, LogOut, ChevronDown, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useHRStore, type UserRole, rolePermissions } from "@/lib/store"

const roleIcons: Record<UserRole, React.ElementType> = {
  admin: Shield,
  hr_manager: Users,
  hr_staff: Briefcase,
  employee: User,
}

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  hr_manager: "HR Manager",
  hr_staff: "HR Staff",
  employee: "Employee",
}

const roleColors: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  hr_manager: "bg-blue-100 text-blue-700",
  hr_staff: "bg-green-100 text-green-700",
  employee: "bg-slate-100 text-slate-700",
}

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { currentUser, setCurrentUser, setIsSettingsOpen } = useHRStore()

  if (!currentUser) return null

  const RoleIcon = roleIcons[currentUser.role]
  const permissions = rolePermissions[currentUser.role]

  const handleLogout = () => {
    setCurrentUser(null)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl",
          "bg-white/80 backdrop-blur-sm border border-slate-200/50",
          "hover:bg-slate-50 transition-colors",
        )}
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", roleColors[currentUser.role])}>
          <RoleIcon className="w-4 h-4" />
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-slate-900 truncate max-w-[120px]">{currentUser.name}</p>
          <p className="text-xs text-slate-500">{roleLabels[currentUser.role]}</p>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={cn(
                "absolute right-0 top-full mt-2 z-50",
                "w-72 p-4 rounded-2xl",
                "bg-white border border-slate-200/50 shadow-xl",
              )}
            >
              {/* User Info */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div
                  className={cn("w-12 h-12 rounded-xl flex items-center justify-center", roleColors[currentUser.role])}
                >
                  <RoleIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{currentUser.name}</p>
                  <p className="text-sm text-slate-500">{currentUser.email}</p>
                </div>
              </div>

              {/* Permissions */}
              <div className="py-4 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Permissions</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(permissions)
                    .slice(0, 6)
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs",
                          value ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-400 line-through",
                        )}
                      >
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace("can ", "")
                          .trim()}
                      </div>
                    ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-2">
                {permissions.canEditSettings && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-xl"
                    onClick={() => {
                      setIsSettingsOpen(true)
                      setIsOpen(false)
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
