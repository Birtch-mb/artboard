'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';

interface MapViewProps {
    locations: any[];
    productionId: string;
}

export default function MapView({ locations, productionId }: MapViewProps) {
    const router = useRouter();
    const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
    const [mapLocations, setMapLocations] = useState<any[]>([]);
    const [showLabels, setShowLabels] = useState(false);

    useEffect(() => {
        // Find locations that already have coordinates
        const initLocations = locations.filter(l => l.latitude != null && l.longitude != null);
        setMapLocations(initLocations);

        // Find locations that only have an address
        const addressOnlyLocations = locations.filter(l => (l.latitude == null || l.longitude == null) && l.address);

        if (addressOnlyLocations.length > 0) {
            const geocodeAddresses = async () => {
                const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                if (!apiKey) return;

                const newlyGeocoded: any[] = [];

                for (const loc of addressOnlyLocations) {
                    try {
                        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(loc.address)}&key=${apiKey}`);
                        const data = await res.json();

                        if (data.status === 'OK' && data.results.length > 0) {
                            const { lat, lng } = data.results[0].geometry.location;
                            newlyGeocoded.push({ ...loc, latitude: lat, longitude: lng });
                        }

                        // Small delay to prevent hitting rate limits when requesting many locations
                        await new Promise(resolve => setTimeout(resolve, 200));
                    } catch (err) {
                        console.error(`Failed to geocode address for location: ${loc.name}`);
                    }
                }

                if (newlyGeocoded.length > 0) {
                    setMapLocations(prev => [...prev, ...newlyGeocoded]);
                }
            };

            geocodeAddresses();
        }
    }, [locations]);

    if (mapLocations.length === 0) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-neutral-800 bg-neutral-900/50">
                <p className="text-sm text-neutral-400">No locations with coordinates or valid addresses to display on map.</p>
            </div>
        );
    }

    // Calculate center based on first valid location
    const center = { lat: mapLocations[0].latitude, lng: mapLocations[0].longitude };
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showLabels}
                        onChange={(e) => setShowLabels(e.target.checked)}
                        className="rounded border-neutral-700 bg-neutral-900 text-brand-primary focus:ring-brand-primary focus:ring-offset-neutral-900 h-4 w-4"
                    />
                    <span className="text-sm font-medium text-neutral-300 select-none">Show Location Names</span>
                </label>
            </div>

            <div className="h-[500px] w-full rounded-md border border-neutral-800 overflow-hidden relative z-0">
                <APIProvider apiKey={apiKey}>
                    <Map
                        defaultZoom={11}
                        defaultCenter={center}
                        gestureHandling="cooperative"
                        disableDefaultUI={true}
                    >
                        {mapLocations.map((loc: any) => (
                            <Marker
                                key={loc.id}
                                position={{ lat: loc.latitude, lng: loc.longitude }}
                                onClick={() => setSelectedLocation(loc)}
                                label={showLabels ? {
                                    text: loc.name,
                                    className: "bg-white mt-8 px-2 py-1 rounded shadow-sm text-xs font-semibold text-neutral-900 border border-neutral-200 pointer-events-none whitespace-nowrap",
                                } : undefined}
                            />
                        ))}

                        {selectedLocation && (
                            <InfoWindow
                                position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
                                onCloseClick={() => setSelectedLocation(null)}
                                headerContent={
                                    <span className="font-semibold text-neutral-900 pr-4">{selectedLocation.name}</span>
                                }
                            >
                                <div className="flex flex-col gap-2 p-1 min-w-[150px]">
                                    <span className="text-xs text-neutral-500">{selectedLocation.type.replace('_', ' ')}</span>
                                    <button
                                        onClick={() => router.push(`/productions/${productionId}/locations/${selectedLocation.id}`)}
                                        className="text-xs font-medium bg-brand-primary text-white py-1.5 px-3 rounded mt-1 hover:bg-brand-primary/90 transition-colors cursor-pointer"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </InfoWindow>
                        )}
                    </Map>
                </APIProvider>
            </div>
        </div>
    );
}
