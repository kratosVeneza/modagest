"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ReactNode } from "react"

type AnimatedModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export default function AnimatedModal({
  open,
  title,
  onClose,
  children,
  footer,
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-box"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">{title}</h3>

              <button onClick={onClose} className="icon-btn" type="button">
                ×
              </button>
            </div>

            <div className="modal-body">{children}</div>

            {footer && <div className="modal-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}