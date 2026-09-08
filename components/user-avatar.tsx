import React from "react"

interface UserAvatarProps {
  name?: string | null
  email?: string | null
  storageKey?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function UserAvatar({
  name,
  email,
  storageKey,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "size-7 text-xs",
    md: "size-9 text-sm",
    lg: "size-12 text-base",
    xl: "size-20 text-xl",
  }

  const displayName = name?.trim() || email?.trim() || "?"
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || displayName.substring(0, 2).toUpperCase()

  if (storageKey) {
    return (
      <img
        src={`/api/files/${storageKey}`}
        alt={displayName}
        className={`rounded-full object-cover border border-border bg-muted flex-shrink-0 ${sizeClasses[size]} ${className}`}
      />
    )
  }

  return (
    <div
      data-slot="user-avatar-fallback"
      className={`rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center border border-border/40 flex-shrink-0 select-none ${sizeClasses[size]} ${className}`}
      title={displayName}
    >
      {initials}
    </div>
  )
}
