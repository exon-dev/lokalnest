import { createContext, useState, useContext, ReactNode } from 'react';

// Define drawer types to help track which content should be shown
export type DrawerContentType = 'main' | 'buyer';

type MobileMenuContextType = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setIsOpen: (isOpen: boolean) => void;
  drawerType: DrawerContentType;
  setDrawerType: (type: DrawerContentType) => void;
};

const MobileMenuContext = createContext<MobileMenuContextType | undefined>(undefined);

export const MobileMenuProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerContentType>('main');

  const toggle = () => setIsOpen(prev => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <MobileMenuContext.Provider value={{ 
      isOpen, 
      toggle, 
      open, 
      close, 
      setIsOpen,
      drawerType,
      setDrawerType
    }}>
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