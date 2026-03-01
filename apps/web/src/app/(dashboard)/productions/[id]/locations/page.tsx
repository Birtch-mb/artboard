import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import LocationListClient from './components/LocationListClient';
import { Role } from '@/lib/types';

export default async function LocationsPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let locations = [];
    let isAdOrPd = false;

    try {
        const client = createApiClient(session.accessToken);
        // Fetch production to get role
        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        isAdOrPd = myMember?.role === Role.ART_DIRECTOR || myMember?.role === Role.PRODUCTION_DESIGNER;

        // Fetch locations
        locations = await client.get<any[]>(`/productions/${params.id}/locations`);
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Locations</h1>
                    <p className="text-sm text-neutral-400 text-balance">
                        Manage stages, exteriors, bases, and practical sets for this production.
                    </p>
                </div>
                {isAdOrPd && (
                    <Link
                        href={`/productions/${params.id}/locations/new`}
                        className="flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        New Location
                    </Link>
                )}
            </div>

            <LocationListClient initialLocations={locations} productionId={params.id} />
        </div>
    );
}
