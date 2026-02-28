import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { notFound, redirect } from 'next/navigation';
import { Role } from '@artboard/shared';
import NewAssetForm from './components/NewAssetForm';

export default async function NewAssetPage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let tags = [];
    let sets = [];
    let canSeeBudget = false;

    try {
        const client = createApiClient(session.accessToken);
        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);

        const role = myMember?.role;
        const canCreate = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR, Role.PROPS_MASTER].includes(role);

        if (!canCreate) {
            redirect(`/productions/${params.id}/assets`);
        }

        if (role === Role.ART_DIRECTOR || role === Role.PRODUCTION_DESIGNER) {
            canSeeBudget = true;
        } else if (role === Role.COORDINATOR && myMember?.coordinatorVisibility?.showBudget) {
            canSeeBudget = true;
        }

        const [tagsData, setsData] = await Promise.all([
            client.get<any[]>(`/productions/${params.id}/tags`),
            client.get<any[]>(`/productions/${params.id}/sets`),
        ]);
        tags = tagsData;
        sets = setsData;
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto w-full">
            <div className="border-b border-neutral-800 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Add New Asset</h1>
                <p className="text-sm text-neutral-400">
                    Create a new prop, set dressing, graphic, or other asset.
                </p>
            </div>

            <NewAssetForm productionId={params.id} token={session.accessToken} tags={tags} sets={sets} canSeeBudget={canSeeBudget} />
        </div>
    );
}
