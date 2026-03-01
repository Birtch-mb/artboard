import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Role } from '@/lib/types';
import ScriptVersionListClient from './components/ScriptVersionListClient';

export default async function ScriptPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') {
        redirect('/login');
    }

    let scripts: any[] = [];
    let canUpload = false;
    let canReview = false;
    let canDelete = false;

    try {
        const client = createApiClient(session.accessToken);

        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        const role = myMember?.role;

        canUpload = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER].includes(role);
        canReview = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER].includes(role);
        canDelete = role === Role.ART_DIRECTOR;

        scripts = await client.get<any[]>(`/productions/${params.id}/scripts`);
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Script</h1>
                    <p className="text-sm text-neutral-400">
                        Manage script versions and scene breakdowns.
                    </p>
                </div>
            </div>

            <ScriptVersionListClient
                initialScripts={scripts}
                productionId={params.id}
                canUpload={canUpload}
                canReview={canReview}
                canDelete={canDelete}
                token={session.accessToken}
            />
        </div>
    );
}
