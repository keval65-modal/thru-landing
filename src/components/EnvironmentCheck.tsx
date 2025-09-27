// components/EnvironmentCheck.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function EnvironmentCheck() {
  const [envStatus, setEnvStatus] = useState<{
    googleMaps: boolean
    vendorApi: boolean
    firebase: boolean
  }>({
    googleMaps: false,
    vendorApi: false,
    firebase: false
  })

  useEffect(() => {
    // Check environment variables
    const googleMaps = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const vendorApi = !!process.env.NEXT_PUBLIC_VENDOR_API_URL
    const firebase = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY

    setEnvStatus({
      googleMaps,
      vendorApi,
      firebase
    })
  }, [])

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    )
  }

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Configured
      </Badge>
    ) : (
      <Badge variant="destructive">
        Missing
      </Badge>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Environment Variables Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(envStatus.googleMaps)}
              <div>
                <div className="font-medium">Google Maps API</div>
                <div className="text-sm text-gray-600">
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                </div>
              </div>
            </div>
            {getStatusBadge(envStatus.googleMaps)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(envStatus.vendorApi)}
              <div>
                <div className="font-medium">Vendor API URL</div>
                <div className="text-sm text-gray-600">
                  NEXT_PUBLIC_VENDOR_API_URL
                </div>
              </div>
            </div>
            {getStatusBadge(envStatus.vendorApi)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(envStatus.firebase)}
              <div>
                <div className="font-medium">Firebase API</div>
                <div className="text-sm text-gray-600">
                  NEXT_PUBLIC_FIREBASE_API_KEY
                </div>
              </div>
            </div>
            {getStatusBadge(envStatus.firebase)}
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Note:</strong> If any variables show as "Missing", check your Vercel environment variables in the dashboard.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

