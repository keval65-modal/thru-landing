
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTodoList, type TodoItem } from '@/hooks/use-todo-list';
import { ListTodo, Plus, Trash2, Route, X, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


export function TodoListOverlay() {
  const { items, addItem, toggleItem, removeItem, clearCompleted, getActiveItems, isInitialized } = useTodoList();
  const [newItemText, setNewItemText] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim()) {
      addItem(newItemText);
      setNewItemText('');
    }
  };
  
  const handleStartPlanning = () => {
    const activeItems = getActiveItems();
    if (activeItems.length === 0) {
      toast({
        title: "Your list is empty",
        description: "Add some items to your list before planning your trip.",
        variant: "destructive",
      });
      return;
    }
    
    // For now, this just closes the sheet and navigates.
    // In the future, this can pass the items to the trip planner.
    // Note: The actual passing of items will be a future implementation step.
    setIsOpen(false);
    
    const itemNames = activeItems.map(item => item.text).join(', ');
     toast({
        title: "Starting Trip Plan",
        description: `Next, we'll find shops for: ${itemNames.substring(0, 50)}...`,
     });

    // A more advanced implementation would pass these items to the planner,
    // for now we just navigate to the start of the flow.
    router.push('/plan-trip/step-1');
  };

  const completedCount = items.filter(item => item.completed).length;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="default"
            className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-accent hover:bg-accent/90 text-accent-foreground"
            aria-label="Open Quick List"
          >
            <ListTodo className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <StickyNote className="h-6 w-6 text-primary" />
              My Quick List
            </SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-4">
            <form onSubmit={handleAddItem} className="flex gap-2">
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="e.g., Milk, bread, batteries..."
              />
              <Button type="submit" size="icon" disabled={!newItemText.trim()}>
                <Plus className="h-5 w-5" />
              </Button>
            </form>
          </div>
          <ScrollArea className="flex-1 px-6">
            {isInitialized && items.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    <p>Your list is empty.</p>
                    <p className="text-sm">Add items you need to buy.</p>
                </div>
            )}
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-2 transition-colors",
                    item.completed ? "bg-muted/50" : "bg-background"
                  )}
                >
                  <Checkbox
                    id={`todo-${item.id}`}
                    checked={item.completed}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="h-5 w-5"
                  />
                  <label
                    htmlFor={`todo-${item.id}`}
                    className={cn(
                      "flex-1 text-sm font-medium",
                      item.completed && "text-muted-foreground line-through"
                    )}
                  >
                    {item.text}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.text}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
          <SheetFooter className="p-6 pt-4 border-t bg-background">
             {completedCount > 0 && (
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">{completedCount} item(s) completed</span>
                    <Button variant="outline" size="sm" onClick={clearCompleted}>
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Clear Completed
                    </Button>
                </div>
             )}
            <Button className="w-full text-base py-3" onClick={handleStartPlanning} disabled={getActiveItems().length === 0}>
              <Route className="mr-2 h-5 w-5" />
              Find Shops On My Route
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
