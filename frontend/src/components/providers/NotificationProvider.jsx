import { createContext, useCallback, useRef, useState } from "react";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [confirmation, setConfirmation] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      if (resolver.current) {
        resolver.current(false);
      }

      resolver.current = resolve;

      setConfirmation({
        title: options.title || "Are you sure?",
        description:
          options.description || "Please confirm that you want to continue.",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        variant: options.variant || "default",
      });
    });
  }, []);

  const closeConfirmation = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setConfirmation(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ toast, confirm }}>
      {children}

      <Toaster
        position="top-right"
        closeButton
        richColors
        duration={4000}
        theme="system"
      />

      <Dialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open) closeConfirmation(false);
        }}
      >
        <DialogContent>
          {confirmation && (
            <>
              <DialogHeader>
                <DialogTitle>{confirmation.title}</DialogTitle>
                <DialogDescription>
                  {confirmation.description}
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => closeConfirmation(false)}
                >
                  {confirmation.cancelText}
                </Button>

                <Button
                  variant={confirmation.variant}
                  onClick={() => closeConfirmation(true)}
                >
                  {confirmation.confirmText}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </NotificationContext.Provider>
  );
}
