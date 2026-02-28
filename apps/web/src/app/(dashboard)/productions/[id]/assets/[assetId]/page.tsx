import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Role } from '@artboard/shared';
import AssetDetailClient from './components/AssetDetailClient';

export default async function AssetDetailPage({
    params,
}: {
    params: { id: string; assetId: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let asset = null;
    let allTags = [];
    let allSets = [];
    let isAdOrPd = false;
    let canEdit = false;
    let canSeeBudget = false;

    try {
        const client = createApiClient(session.accessToken);

        // 1. Fetch Production for roles
        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        const role = myMember?.role;

        isAdOrPd = role === Role.ART_DIRECTOR || role === Role.PRODUCTION_DESIGNER;
        canEdit = isAdOrPd || role === Role.SET_DECORATOR || role === Role.PROPS_MASTER;

        if (isAdOrPd) {
            canSeeBudget = true;
        } else if (role === Role.COORDINATOR && myMember?.coordinatorVisibility?.showBudget) {
            canSeeBudget = true;
        }

        // 2. Fetch Asset and Production Context (Tags, Sets)
        const [assetData, tagsData, setsData] = await Promise.all([
            client.get<any>(`/productions/${params.id}/assets/${params.assetId}`),
            client.get<any[]>(`/productions/${params.id}/tags`),
            client.get<any[]>(`/productions/${params.id}/sets`),
        ]);

        asset = assetData;
        allTags = tagsData;
        allSets = setsData;

    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <AssetDetailClient
            asset={asset}
            allTags={allTags}
            allSets={allSets}
            productionId={params.id}
            isAdOrPd={isAdOrPd}
            canEdit={canEdit}
            canSeeBudget={canSeeBudget}
            token={session.accessToken}
        />
    );
}
