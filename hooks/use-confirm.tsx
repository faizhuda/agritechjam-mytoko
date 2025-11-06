"use client"

import { useCallback, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type ConfirmOptions = {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions>({})
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions = {}) => {
    setOpts(options)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve)
    })
  }, [])

  const handleClose = (value: boolean) => {
    setOpen(false)
    if (resolver) resolver(value)
    setResolver(null)
  }

  const ConfirmDialog = (
    <AlertDialog open={open} onOpenChange={(v) => !v && handleClose(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts.title || "Are you sure?"}</AlertDialogTitle>
          {opts.description ? (
            <AlertDialogDescription>{opts.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleClose(false)}>
            {opts.cancelText || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleClose(true)}
            className={opts.variant === "destructive" ? "bg-red-600 text-white hover:bg-red-700" : undefined}
          >
            {opts.confirmText || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { confirm, ConfirmDialog }
}
