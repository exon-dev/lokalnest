import { createContext, useState, useContext, ReactNode } from 'react';

type MobileMenuContextType = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setIsOpen: (isOpen: boolean) => void;
};

const MobileMenuContext = createContext<MobileMenuContextType | undefined>(undefined);

export const MobileMenuProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(prev => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <MobileMenuContext.Provider value={{ isOpen, toggle, open, close, setIsOpen }}>
      {children}
    </MobileMenuContext.Provider>
  );
};

export const useMobileMenu = () => {
  const context = useContext(MobileMenuContext);
  if (context === undefined) {
    throw new Error('useMobileMenu must be used within a MobileMenuProvider');
  }
  return context;
};