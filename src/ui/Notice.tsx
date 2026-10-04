import { useEffect, useRef } from "react"
import { X } from "lucide-react"

export function Notice({
  message,
  closeLabel,
  onClose,
}: {
  message: string
  closeLabel: string
  onClose: () => void
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const id = window.setTimeout(() => onCloseRef.current(), 4000)
    return () => window.clearTimeout(id)
  }, [message])

  return (
    <p className="notice" role="status">
      <span>{message}</span>
      <button type="button" className="notice-close" aria-label={closeLabel} onClick={onClose}>
        <X aria-hidden="true" size={16} strokeWidth={2.25} />
      </button>
    </p>
  )
}
