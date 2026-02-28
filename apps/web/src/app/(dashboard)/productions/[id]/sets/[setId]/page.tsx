import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Role } from '@artboard/shared';
import SetDetailClient from './components/SetDetailClient';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';

export default async function SetDetailPage({
    params,
}: {
    params: { id: string, setId: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let set: any = null;
    let production: any = null;
    let availableLocations: any[] = [];
    let isEditingAllowed = false;
    let isAdOrPd = false;

    try {
        const client = createApiClient(session.accessToken);

        // Fetch production
        production = await client.get(`/productions/${params.id}`);

        // Check permissions
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        isEditingAllowed = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR].includes(myMember?.role);
        isAdOrPd = myMember?.role === Role.ART_DIRECTOR || myMember?.role === Role.PRODUCTION_DESIGNER;

        // Fetch set details and locations in parallel
        [set, availableLocations] = await Promise.all([
            client.get<any>(`/productions/${params.id}/sets/${params.setId}`),
            client.get<any[]>(`/productions/${params.id}/locations`),
        ]);
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
            <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/productions/${params.id}/sets`}
                        className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Sets
                    </Link>
                </div>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold tracking-tight text-white">{set.name}</h1>
                            <span className="inline-flex rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-300">
                                Level {set.level}
                            </span>
                        </div>
                        {set.parent && (
                            <p className="text-sm text-neutral-400">
                                Parent Set: <Link href={`/productions/${params.id}/sets/${set.parent.id}`} className="text-brand-primary hover:underline">{set.parent.name}</Link>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <Suspense fallback={<div className="animate-pulse bg-neutral-900 rounded-xl h-96 w-full"></div>}>
                <SetDetailClient
                    initialSet={set}
                    productionId={params.id}
                    isEditingAllowed={isEditingAllowed}
                    isAdOrPd={isAdOrPd}
                    availableLocations={availableLocations}
                />
            </Suspense>
        </div>
    );
}
