"use client";

import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
      // Apply the theme class to the html element
      document.documentElement.classList.add(storedTheme);
    } else {
      // Default to light if no theme is stored
      setTheme('light'); // Set state to light
      document.documentElement.classList.add('light'); // Apply light class
    }
  }, []);

  useEffect(() => {
    // This effect ensures the correct class is on the html element
    // whenever the theme state changes *after* the initial load.
    // It also handles toggling.
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    // Save the preference to localStorage whenever theme changes
    localStorage.setItem('theme', theme);

  }, [theme]); // Depend on theme state

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // Use a simple button for now, assuming @/components/ui/button exists
  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'light' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
};

export default ThemeToggle;