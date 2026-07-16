'use client';

import { useEffect } from 'react';

export function useBodyClass(className: string) {
  useEffect(() => {
    const classes = className.split(' ').filter(Boolean);
    document.body.classList.add(...classes);
    return () => {
      document.body.classList.remove(...classes);
    };
  }, [className]);
}
