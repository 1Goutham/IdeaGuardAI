"use client";

import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { ProjectsProvider } from "@/lib/store/ProjectsProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <ProjectsProvider>{children}</ProjectsProvider>
      <Toaster
        position="bottom-center"
        mobileOffset={{ bottom: 24 }}
        toastOptions={{
          style: {
            background: "var(--ink)",
            color: "var(--on-ink)",
            border: "none",
            borderRadius: 999,
            fontFamily: "var(--font-outfit)",
            fontSize: 13,
            padding: "12px 18px",
          },
        }}
      />
    </MotionConfig>
  );
}
