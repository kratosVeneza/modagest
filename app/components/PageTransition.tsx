"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { usePathname } from "next/navigation"

type Props = {
  children: ReactNode
}

export default function PageTransition({ children }: Props) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}