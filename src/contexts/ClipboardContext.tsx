import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ClipboardItem {
  key: string;
  name: string;
  isFolder: boolean;
}

interface ClipboardContextType {
  clipboard: ClipboardItem[];
  clipboardOperation: 'copy' | 'move' | null;
  addToClipboard: (items: ClipboardItem[], operation: 'copy' | 'move') => void;
  clearClipboard: () => void;
}

const ClipboardContext = createContext<ClipboardContextType | undefined>(undefined);

export function ClipboardProvider({ children }: { children: ReactNode }) {
  const [clipboard, setClipboard] = useState<ClipboardItem[]>([]);
  const [clipboardOperation, setClipboardOperation] = useState<'copy' | 'move' | null>(null);

  const addToClipboard = (items: ClipboardItem[], operation: 'copy' | 'move') => {
    setClipboard(items);
    setClipboardOperation(operation);
  };

  const clearClipboard = () => {
    setClipboard([]);
    setClipboardOperation(null);
  };

  return (
    <ClipboardContext.Provider
      value={{
        clipboard,
        clipboardOperation,
        addToClipboard,
        clearClipboard,
      }}
    >
      {children}
    </ClipboardContext.Provider>
  );
}

export function useClipboard() {
  const context = useContext(ClipboardContext);
  if (context === undefined) {
    throw new Error('useClipboard must be used within a ClipboardProvider');
  }
  return context;
}

