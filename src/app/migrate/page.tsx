"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, CheckCircle, XCircle } from 'lucide-react';

export default function MigratePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    updatedCount: number;
    errors: number;
  } | null>(null);

  const handleMigration = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/migrate-users-authenticated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: `Migration failed: ${error}`,
        updatedCount: 0,
        errors: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            User Migration Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This tool will update all existing users in the database to include the new 
            <code className="bg-muted px-1 rounded">displayName</code> field in the format 
            <code className="bg-muted px-1 rounded">"UserName,Number"</code>.
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Important Notes:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• This will only update users that don't already have a displayName</li>
              <li>• The migration is safe and won't affect existing user data</li>
              <li>• Users will still be able to log in normally after migration</li>
              <li>• This operation cannot be undone</li>
            </ul>
          </div>

          <Button 
            onClick={handleMigration} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Migration...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Start User Migration
              </>
            )}
          </Button>

          {result && (
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                  <strong>{result.success ? 'Migration Successful!' : 'Migration Failed!'}</strong>
                  <br />
                  {result.message}
                  {result.updatedCount > 0 && (
                    <div className="mt-2 text-sm">
                      <strong>Updated Users:</strong> {result.updatedCount}
                    </div>
                  )}
                  {result.errors > 0 && (
                    <div className="mt-2 text-sm">
                      <strong>Errors:</strong> {result.errors}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

