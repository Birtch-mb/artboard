import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import AssetListClient from './components/AssetListClient';
import { Role } from '@/lib/types';

export default async function AssetsPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let assets = [];
    let tags = [];
    let sets = [];
    let canCreate = false;
    let canSeeBudget = false;

    try {
        const client = createApiClient(session.accessToken);
        // Fetch production to get role
        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);

        const role = myMember?.role;
        canCreate = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR, Role.PROPS_MASTER].includes(role);

        if (role === Role.ART_DIRECTOR || role === Role.PRODUCTION_DESIGNER) {
            canSeeBudget = true;
        } else if (role === Role.COORDINATOR && myMember?.coordinatorVisibility?.showBudget) {
            canSeeBudget = true;
        }

        // Fetch initial assets, tags, and sets
        const [assetsData, tagsData, setsData] = await Promise.all([
            client.get<any[]>(`/productions/${params.id}/assets`),
            client.get<any[]>(`/productions/${params.id}/tags`),
            client.get<any[]>(`/productions/${params.id}/sets`),
        ]);

        assets = assetsData;
        tags = tagsData;
        sets = setsData;

    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Assets</h1>
                    <p className="text-sm text-neutral-400 text-balance">
                        Manage props, set dressing, graphics, and other assets.
                    </p>
                </div>
                {canCreate && (
                    <Link
                        href={`/productions/${params.id}/assets/new`}
                        className="flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        New Asset
                    </Link>
                )}
            </div>

            <AssetListClient
                initialAssets={assets}
                productionId={params.id}
                tags={tags}
                sets={sets}
                canSeeBudget={canSeeBudget}
                token={session.accessToken}
            />
        </div>
    );
}
