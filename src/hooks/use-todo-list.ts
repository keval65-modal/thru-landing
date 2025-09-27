
"use client";

import { useState, useEffect, useCallback } from 'react';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

const STORAGE_KEY = 'thru-todo-list';

export function useTodoList() {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        setItems(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Failed to load to-do list from localStorage", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error("Failed to save to-do list to localStorage", error);
      }
    }
  }, [items, isInitialized]);

  const addItem = useCallback((text: string) => {
    if (text.trim() === '') return;
    const newItem: TodoItem = {
      id: new Date().toISOString(),
      text,
      completed: false,
    };
    setItems(prevItems => [...prevItems, newItem]);
  }, []);

  const toggleItem = useCallback((id: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setItems(prevItems => prevItems.filter(item => !item.completed));
  }, []);
  
  const getActiveItems = useCallback(() => {
    return items.filter(item => !item.completed);
  }, [items]);


  return { items, addItem, toggleItem, removeItem, clearCompleted, getActiveItems, isInitialized };
}
