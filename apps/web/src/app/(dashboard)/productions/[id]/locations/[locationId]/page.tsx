import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Role } from '@artboard/shared';
import LocationDetailClient from './components/LocationDetailClient';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function LocationDetailPage({
    params,
}: {
    params: { id: string; locationId: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let location = null;
    let isAdOrPd = false;
    let isAdOrPdOrDecorator = false;

    try {
        const client = createApiClient(session.accessToken);
        // Fetch production to get role
        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);

        isAdOrPd = myMember?.role === Role.ART_DIRECTOR || myMember?.role === Role.PRODUCTION_DESIGNER;
        isAdOrPdOrDecorator = isAdOrPd || myMember?.role === Role.SET_DECORATOR;

        // Fetch location details
        location = await client.get<any>(`/productions/${params.id}/locations/${params.locationId}`);

        // Fetch files
        const files = await client.get<any[]>(`/productions/${params.id}/locations/${params.locationId}/files`);
        location.files = files; // Append to location object for the client

    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Link
                    href={`/productions/${params.id}/locations`}
                    className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors w-fit"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Locations
                </Link>
            </div>
            <LocationDetailClient
                initialLocation={location}
                productionId={params.id}
                canEditDetails={isAdOrPd}
                canEditNotes={isAdOrPdOrDecorator}
                canUploadFiles={isAdOrPdOrDecorator}
                canDeleteAndMerge={isAdOrPd}
                token={session.accessToken}
            />
        </div>
    );
}
