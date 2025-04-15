'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Allow time for fade out animation
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  const baseClasses = "fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transition-all duration-300"
  const typeClasses = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white"
  }

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <p>{message}</p>
    </div>
  )
} 