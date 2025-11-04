'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Phone, Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  shopName?: string;
  type?: string;
  storeType?: string;
  categories?: string[];
  isActiveOnThru: boolean;
  coordinates?: { lat: number; lng: number } | { _latitude: number; _longitude: number };
  location?: any;
  address?: string;
  phone?: string;
  email?: string;
  rating?: number;
}

export default function TestRouteDiscoveryPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError('');

      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // Query vendors collection
      const vendorsRef = collection(db, 'vendors');
      const snapshot = await getDocs(vendorsRef);

      const vendorsList: Vendor[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        vendorsList.push({
          id: doc.id,
          ...data
        } as Vendor);
      });

      console.log('📦 Loaded vendors:', vendorsList);
      setVendors(vendorsList);
    } catch (err) {
      console.error('❌ Error loading vendors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const getCoordinates = (vendor: Vendor) => {
    if (vendor.coordinates) {
      if ('lat' in vendor.coordinates) {
        return { lat: vendor.coordinates.lat, lng: vendor.coordinates.lng };
      }
      if ('_latitude' in vendor.coordinates) {
        return { lat: vendor.coordinates._latitude, lng: vendor.coordinates._longitude };
      }
    }
    if (vendor.location?.latitude) {
      return { lat: vendor.location.latitude, lng: vendor.location.longitude };
    }
    return null;
  };

  const filteredVendors = vendors.filter((vendor) => {
    const name = (vendor.name || vendor.shopName || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search);
  });

  const activeVendors = filteredVendors.filter((v) => v.isActiveOnThru);
  const inactiveVendors = filteredVendors.filter((v) => !v.isActiveOnThru);
  const zeosVendors = vendors.filter((v) =>
    (v.name || v.shopName || '').toLowerCase().includes('zeo')
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Route Discovery Test - Vendor Database
          </h1>
          <p className="text-gray-600">
            Verify which vendors are active and visible on routes
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total Vendors</div>
            <div className="text-2xl font-bold">{vendors.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Active on Thru</div>
            <div className="text-2xl font-bold text-green-600">
              {vendors.filter((v) => v.isActiveOnThru).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Inactive</div>
            <div className="text-2xl font-bold text-gray-400">
              {vendors.filter((v) => !v.isActiveOnThru).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Zeo's Cafes</div>
            <div className="text-2xl font-bold text-blue-600">{zeosVendors.length}</div>
          </Card>
        </div>

        {/* Zeo's Cafe Highlight */}
        {zeosVendors.length > 0 && (
          <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Zeo's Cafe Found!
            </h2>
            <div className="space-y-4">
              {zeosVendors.map((vendor) => {
                const coords = getCoordinates(vendor);
                const hasCoords = coords !== null;
                const isActive = vendor.isActiveOnThru;
                const hasCategories = vendor.categories && vendor.categories.length > 0;

                return (
                  <div key={vendor.id} className="bg-white rounded-lg p-4 border-2 border-blue-300">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {vendor.name || vendor.shopName}
                        </h3>
                        <p className="text-sm text-gray-600">ID: {vendor.id}</p>
                      </div>
                      <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={isActive ? 'text-green-700' : 'text-red-700'}>
                          isActiveOnThru: {String(isActive)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasCoords ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={hasCoords ? 'text-green-700' : 'text-red-700'}>
                          GPS Coordinates: {hasCoords ? `${coords?.lat}, ${coords?.lng}` : 'Missing'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasCategories ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={hasCategories ? 'text-green-700' : 'text-red-700'}>
                          Categories: {hasCategories ? vendor.categories?.join(', ') : 'None'}
                        </span>
                      </div>

                      {vendor.address && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{vendor.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Message */}
                    <div className="mt-4 p-3 rounded-md bg-gray-50">
                      {isActive && hasCoords && hasCategories ? (
                        <p className="text-sm text-green-700 font-medium">
                          ✅ This vendor WILL appear on routes (if location is within 5km of path)
                        </p>
                      ) : (
                        <p className="text-sm text-red-700 font-medium">
                          ❌ This vendor WILL NOT appear on routes. Fix the issues above.
                        </p>
                      )}
                    </div>

                    {/* Raw Data */}
                    <details className="mt-3">
                      <summary className="text-xs text-gray-500 cursor-pointer">Show Raw Data</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(vendor, null, 2)}
                      </pre>
                    </details>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search vendors by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Error */}
        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <p className="text-red-600">❌ {error}</p>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading vendors...</p>
          </Card>
        )}

        {/* Vendors List */}
        {!loading && (
          <>
            {/* Active Vendors */}
            {activeVendors.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Active Vendors ({activeVendors.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeVendors.map((vendor) => {
                    const coords = getCoordinates(vendor);
                    return (
                      <Card key={vendor.id} className="p-4 border-green-200">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {vendor.name || vendor.shopName}
                          </h3>
                          <Badge variant="default" className="bg-green-600">
                            Active
                          </Badge>
                        </div>
                        {coords && (
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                          </p>
                        )}
                        {vendor.categories && vendor.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {vendor.categories.map((cat, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inactive Vendors */}
            {inactiveVendors.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-gray-400" />
                  Inactive Vendors ({inactiveVendors.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inactiveVendors.map((vendor) => (
                    <Card key={vendor.id} className="p-4 bg-gray-50 border-gray-200 opacity-60">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-600">
                          {vendor.name || vendor.shopName}
                        </h3>
                        <Badge variant="secondary">Inactive</Badge>
                      </div>
                      <p className="text-xs text-gray-500">Won't appear on routes</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Reload Button */}
        <div className="mt-8 text-center">
          <Button onClick={loadVendors} disabled={loading}>
            {loading ? 'Loading...' : 'Reload Vendors'}
          </Button>
        </div>
      </div>
    </div>
  );
}


