"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User, Shield, Users, Briefcase, LogIn, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useHRStore, type UserRole, type User as UserType } from "@/lib/store"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

const roleOptions: { role: UserRole; label: string; description: string; icon: React.ElementType }[] = [
  {
    role: "admin",
    label: "Administrator",
    description: "Full access to all features and user management",
    icon: Shield,
  },
  {
    role: "hr_manager",
    label: "HR Manager",
    description: "Manage documents, workflows, and core memory",
    icon: Users,
  },
  {
    role: "hr_staff",
    label: "HR Staff",
    description: "Upload documents and run workflows",
    icon: Briefcase,
  },
  {
    role: "employee",
    label: "Employee",
    description: "View-only access to assigned documents",
    icon: User,
  },
]

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [selectedRole, setSelectedRole] = useState<UserRole>("hr_manager")
  const [isLoading, setIsLoading] = useState(false)
  const { setCurrentUser } = useHRStore()

  const handleLogin = async () => {
    if (!name.trim() || !email.trim()) return

    setIsLoading(true)

    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const user: UserType = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: selectedRole,
      createdAt: Date.now(),
    }

    setCurrentUser(user)
    setIsLoading(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-violet-500">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h2 className="text-xl font-semibold">Welcome to HR Assistant</h2>
                  <p className="text-sm text-white/80 mt-1">Sign in to access your workspace</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-xl text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Select Your Role</Label>
                <div className="grid grid-cols-2 gap-3">
                  {roleOptions.map(({ role, label, description, icon: Icon }) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={cn(
                        "p-3 rounded-xl text-left transition-all",
                        "border-2",
                        selectedRole === role
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("w-4 h-4", selectedRole === role ? "text-blue-600" : "text-slate-500")} />
                        <span
                          className={cn(
                            "font-medium text-sm",
                            selectedRole === role ? "text-blue-900" : "text-slate-900",
                          )}
                        >
                          {label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleLogin}
                disabled={!name.trim() || !email.trim() || isLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-slate-500">
                This is a demo authentication. In production, integrate with your identity provider.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
