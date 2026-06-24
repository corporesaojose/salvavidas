"use client";

import { useEffect, useState } from "react";

export function useStepTransition(stepKey: string | number) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, [stepKey]);

  return visible;
}
