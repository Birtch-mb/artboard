import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import AssetListClient from './components/AssetListClient';
import { Role } from '@/lib/types';

export default async function AssetsPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let initialData: { assets: any[]; departmentCounts: Record<string, number>; departmentStats?: any } = {
        assets: [],
        departmentCounts: {} as Record<string, number>,
    };
    let tags: any[] = [];
    let sets: any[] = [];
    let canCreate = false;
    let canSeeBudget = false;
    let canBulkReassign = false;
    let userRole: string | undefined;

    try {
        const client = createApiClient(session.accessToken);
        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);

        const role = myMember?.role;
        userRole = role;

        canCreate = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR, Role.PROPS_MASTER].includes(role);
        canBulkReassign = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR, Role.PROPS_MASTER].includes(role);

        if (role === Role.ART_DIRECTOR || role === Role.PRODUCTION_DESIGNER) {
            canSeeBudget = true;
        } else if (role === Role.COORDINATOR && myMember?.coordinatorVisibility?.showBudget) {
            canSeeBudget = true;
        }

        const [assetsData, tagsData, setsData] = await Promise.all([
            client.get<any>(`/productions/${params.id}/assets`),
            client.get<any[]>(`/productions/${params.id}/tags`),
            client.get<any[]>(`/productions/${params.id}/sets`),
        ]);

        initialData = assetsData;
        tags = tagsData;
        sets = setsData;

    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
            <div className="border-b border-neutral-800 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Assets</h1>
                <p className="text-sm text-neutral-400">
                    Manage props, set dressing, graphics, and other production assets.
                </p>
            </div>

            <AssetListClient
                initialData={initialData}
                productionId={params.id}
                tags={tags}
                sets={sets}
                canSeeBudget={canSeeBudget}
                canCreate={canCreate}
                canBulkReassign={canBulkReassign}
                userRole={userRole}
                token={session.accessToken}
            />
        </div>
    );
}
