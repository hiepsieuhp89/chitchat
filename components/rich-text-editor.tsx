"use client"

import { useRef, useEffect, useState } from "react"
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  onEnterPress?: () => void
}

export default function RichTextEditor({ value, onChange, onEnterPress }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [internalValue, setInternalValue] = useState(value)
  const isUserTyping = useRef(false)

  // Update internal value when prop changes (only if user is not currently typing)
  useEffect(() => {
    if (!isUserTyping.current && value !== internalValue) {
      setInternalValue(value)
    }
  }, [value, internalValue])

  // Update the editor content when internal value changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== internalValue) {
      // Save selection
      const selection = window.getSelection()
      const range = selection?.getRangeAt(0)
      const startContainer = range?.startContainer
      const startOffset = range?.startOffset
      const endContainer = range?.endContainer
      const endOffset = range?.endOffset
      const isEditorFocused = document.activeElement === editorRef.current

      // Update content
      editorRef.current.innerHTML = internalValue

      // Restore selection if editor was focused
      if (isEditorFocused && selection && range && startContainer && endContainer) {
        try {
          // Try to restore selection
          const newRange = document.createRange()
          newRange.setStart(startContainer, startOffset || 0)
          newRange.setEnd(endContainer, endOffset || 0)
          selection.removeAllRanges()
          selection.addRange(newRange)
        } catch (e) {
          // If restoration fails, move cursor to end
          const newRange = document.createRange()
          if (editorRef.current.lastChild) {
            newRange.selectNodeContents(editorRef.current.lastChild)
            newRange.collapse(false) // Collapse to end
          } else {
            newRange.selectNodeContents(editorRef.current)
            newRange.collapse(false) // Collapse to end
          }
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      }
    }
  }, [internalValue])

  const handleInput = () => {
    if (editorRef.current) {
      isUserTyping.current = true
      const newValue = editorRef.current.innerHTML
      setInternalValue(newValue)
      onChange(newValue)

      // Reset the typing flag after a short delay
      setTimeout(() => {
        isUserTyping.current = false
      }, 100)
    }
  }

  const execCommand = (command: string, value = "") => {
    document.execCommand(command, false, value)
    handleInput()
    editorRef.current?.focus()
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b">
        <Button variant="ghost" size="icon" onClick={() => execCommand("bold")} type="button">
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand("italic")} type="button">
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand("underline")} type="button">
          <Underline className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button variant="ghost" size="icon" onClick={() => execCommand("insertUnorderedList")} type="button">
          <List className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand("insertOrderedList")} type="button">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button variant="ghost" size="icon" onClick={() => execCommand("justifyLeft")} type="button">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand("justifyCenter")} type="button">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand("justifyRight")} type="button">
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="p-3 min-h-[100px] focus:outline-none"
        onInput={handleInput}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && onEnterPress) {
            e.preventDefault()
            onEnterPress()
          }
        }}
      />
    </div>
  )
}
