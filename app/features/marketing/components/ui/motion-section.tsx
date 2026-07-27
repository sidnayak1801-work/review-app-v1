import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { fadeUp } from "../../lib/motion";
import { cn } from "@/lib/utils";

type MotionSectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "div";
  delay?: number;
};

export function MotionSection({
  children,
  className,
  id,
  as = "section",
  delay = 0,
}: MotionSectionProps) {
  const reduceMotion = useReducedMotion();
  const Component = as === "div" ? motion.div : motion.section;

  if (reduceMotion) {
    const Tag = as;
    return (
      <Tag id={id} className={className}>
        {children}
      </Tag>
    );
  }

  return (
    <Component
      id={id}
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        ...fadeUp,
        visible: {
          ...fadeUp.visible,
          transition: {
            ...fadeUp.visible.transition,
            delay,
          },
        },
      }}
    >
      {children}
    </Component>
  );
}
