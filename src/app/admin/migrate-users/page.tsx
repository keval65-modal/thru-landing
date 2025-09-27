"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function MigrateUsersPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const runMigration = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/migrate-user-format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        toast({
          title: "Migration Successful",
          description: data.message,
          variant: "default"
        });
      } else {
        toast({
          title: "Migration Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Error",
        description: "Failed to run migration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>User Format Migration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This tool will migrate all users to the "Name,Phone" format in their displayName field.
            It will only update users who don't already have the correct format.
          </p>
          
          <Button 
            onClick={runMigration} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Running Migration..." : "Run Migration"}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Migration Result:</h3>
              <p className="text-sm">Status: {result.success ? "Success" : "Failed"}</p>
              <p className="text-sm">Message: {result.message}</p>
              {result.updatedCount !== undefined && (
                <p className="text-sm">Users Updated: {result.updatedCount}</p>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-destructive">Errors:</p>
                  <ul className="text-xs text-destructive list-disc list-inside">
                    {result.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}