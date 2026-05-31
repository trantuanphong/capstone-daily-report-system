/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function DarkToggle() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Default to dark mode is false (light mode default as mandated) unless preferred
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    // Respect system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  return (
    <button
      id="btn-dark-toggle"
      onClick={() => setDarkMode(!darkMode)}
      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
      aria-label="Toggle theme mode"
    >
      {darkMode ? <Sun id="svg-dark-toggle-solar" className="h-5 w-5 text-amber-400" /> : <Moon id="svg-dark-toggle-luna" className="h-5 w-5 text-slate-700" />}
    </button>
  );
}
