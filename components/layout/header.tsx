"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Menu, Settings, HelpCircle, LogOut, Brain, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { UserMenu } from "@/components/auth/user-menu"

interface HeaderProps {
  onLoginClick?: () => void
}

export function Header({ onLoginClick }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { setIsSettingsOpen, coreMemory, currentUser, setCurrentUser, hasPermission } = useHRStore()

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "px-6 py-4",
        "bg-white/60 backdrop-blur-xl",
        "border-b border-slate-200/50",
      )}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">HR</span>
          </div>
          <div>
            <h1 className="font-semibold text-slate-900">HR Manager</h1>
            <p className="text-xs text-slate-500">Super Assistant</p>
          </div>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8">
          {isSearchOpen ? (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "100%", opacity: 1 }}
              className="relative w-full"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search documents, tasks, or conversations..."
                className="pl-10 h-10 bg-slate-100/50 border-0 rounded-xl"
                autoFocus
                onBlur={() => setIsSearchOpen(false)}
              />
            </motion.div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setIsSearchOpen(true)}
              className="gap-2 text-slate-500 hover:text-slate-700"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search...</span>
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-xl"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {(!currentUser || hasPermission("canEditSettings")) && (
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="rounded-xl relative">
              <Settings className="w-5 h-5" />
              {coreMemory.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                  <Brain className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </Button>
          )}

          {currentUser ? (
            <UserMenu />
          ) : (
            <Button variant="outline" size="sm" onClick={onLoginClick} className="rounded-xl gap-2 bg-transparent">
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              {(!currentUser || hasPermission("canEditSettings")) && (
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="w-4 h-4" />
                  Settings
                  {coreMemory.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {coreMemory.length} memories
                    </Badge>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <HelpCircle className="w-4 h-4" />
                Help & Support
              </DropdownMenuItem>
              {currentUser && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 cursor-pointer text-red-600" onClick={() => setCurrentUser(null)}>
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  )
}
