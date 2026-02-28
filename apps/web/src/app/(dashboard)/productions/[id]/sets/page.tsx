import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import SetListClient from './components/SetListClient';
import { Role } from '@artboard/shared';

export default async function SetsPage({
    params,
    searchParams,
}: {
    params: { id: string };
    searchParams: { topLevelOnly?: string; status?: string; locationId?: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let sets = [];
    let locations = [];
    let isAdOrPd = false;
    let isDecorator = false;

    try {
        const client = createApiClient(session.accessToken);
        // Fetch production to get role
        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        isAdOrPd = myMember?.role === Role.ART_DIRECTOR || myMember?.role === Role.PRODUCTION_DESIGNER;
        isDecorator = myMember?.role === Role.SET_DECORATOR;

        // Fetch sets and locations for filtering
        const queryParams = new URLSearchParams();
        if (searchParams.topLevelOnly === 'true') queryParams.append('topLevelOnly', 'true');
        if (searchParams.status) queryParams.append('status', searchParams.status);
        if (searchParams.locationId) queryParams.append('locationId', searchParams.locationId);

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

        [sets, locations] = await Promise.all([
            client.get<any[]>(`/productions/${params.id}/sets${queryString}`),
            client.get<any[]>(`/productions/${params.id}/locations`),
        ]);

    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    const canCreate = isAdOrPd || isDecorator;

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Sets</h1>
                    <p className="text-sm text-neutral-400 text-balance">
                        Manage sets, assign locations, and track progress for this production.
                    </p>
                </div>
                {canCreate && (
                    <Link
                        href={`/productions/${params.id}/sets/new`}
                        className="flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        New Set
                    </Link>
                )}
            </div>

            <SetListClient
                initialSets={sets}
                locations={locations}
                productionId={params.id}
                isAdOrPd={isAdOrPd}
                token={session.accessToken}
            />
        </div>
    );
}
