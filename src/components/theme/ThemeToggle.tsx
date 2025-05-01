import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMobileMenu } from "@/context/MobileMenuContext"

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { setTheme, theme, resolvedTheme } = useTheme()
  const { isOpen: mobileMenuOpen, setIsOpen: setMobileMenuOpen } = useMobileMenu()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // When mounted on client, allow theme toggle
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle theme change
  const toggleTheme = (newTheme: string) => {
    // First, always close the dropdown
    setDropdownOpen(false)
    
    // On mobile, close the mobile menu
    if (window.innerWidth < 768) {
      // Close mobile menu if open
      if (mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
      
      // Schedule theme change after UI elements have closed
      window.setTimeout(() => {
        // Set theme through React hook
        setTheme(newTheme)
        
        // Store in localStorage
        localStorage.setItem('lokalNest-ui-theme', newTheme)
        
        // Force browser to apply all pending DOM changes
        window.requestAnimationFrame(() => {
          // Allow a brief moment for everything to settle
          window.setTimeout(() => {
            // Re-enable React event handlers by triggering a small state update
            // This helps React "reconnect" event handlers after DOM changes
            setMounted(prev => prev)
          }, 50)
        })
      }, 100)
    } else {
      // On desktop, just change the theme
      setTheme(newTheme)
      localStorage.setItem('lokalNest-ui-theme', newTheme)
    }
  }

  // If not mounted yet, render a placeholder to avoid layout shift
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          {resolvedTheme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => toggleTheme("light")}
          className={theme === 'light' ? 'bg-accent text-accent-foreground' : ''}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => toggleTheme("dark")}
          className={theme === 'dark' ? 'bg-accent text-accent-foreground' : ''}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => toggleTheme("system")}
          className={theme === 'system' ? 'bg-accent text-accent-foreground' : ''}
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}