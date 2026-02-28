'use client';

import { useState, useEffect } from 'react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

interface MapViewSingleProps {
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
}

export default function MapViewSingle({ latitude, longitude, address }: MapViewSingleProps) {
    const [coords, setCoords] = useState<[number, number] | null>(
        latitude != null && longitude != null ? [latitude, longitude] : null
    );
    const [loading, setLoading] = useState(latitude == null || longitude == null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (latitude != null && longitude != null) {
            setCoords([latitude, longitude]);
            setLoading(false);
            return;
        }

        if (address) {
            setLoading(true);
            setError(false);

            // Geocode using Google Maps API
            const fetchGeocode = async () => {
                try {
                    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                    if (!apiKey) throw new Error('Google Maps API key missing');

                    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);
                    if (!res.ok) throw new Error('Geocoding failed');
                    const data = await res.json();

                    if (data.status === 'OK' && data.results.length > 0) {
                        const location = data.results[0].geometry.location;
                        setCoords([location.lat, location.lng]);
                    } else {
                        setError(true);
                    }
                } catch (err) {
                    setError(true);
                } finally {
                    setLoading(false);
                }
            };

            // Small delay to respect Nominatim API rate limits
            const timeout = setTimeout(fetchGeocode, 500);
            return () => clearTimeout(timeout);
        } else {
            setLoading(false);
            setError(true);
        }
    }, [latitude, longitude, address]);

    if (loading) {
        return <div className="h-48 w-full animate-pulse rounded-lg bg-neutral-900 flex items-center justify-center">
            <span className="text-sm text-neutral-500">Loading map...</span>
        </div>;
    }

    if (error || !coords) {
        return <div className="h-48 w-full rounded-lg bg-neutral-900 flex items-center justify-center border border-neutral-800">
            <span className="text-sm text-neutral-500 text-center px-4">
                Map could not be loaded for this address.
            </span>
        </div>;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    return (
        <div className="h-48 w-full rounded-lg overflow-hidden relative z-0">
            <APIProvider apiKey={apiKey}>
                <Map
                    defaultZoom={14}
                    defaultCenter={{ lat: coords[0], lng: coords[1] }}
                    disableDefaultUI={true}
                    gestureHandling="cooperative"
                >
                    <Marker position={{ lat: coords[0], lng: coords[1] }} />
                </Map>
            </APIProvider>
        </div>
    );
}
