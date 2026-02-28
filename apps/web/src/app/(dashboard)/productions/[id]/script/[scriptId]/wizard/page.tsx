import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Role } from '@artboard/shared';
import WizardClient from './components/WizardClient';

export default async function WizardPage({
    params,
}: {
    params: { id: string; scriptId: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') {
        redirect('/login');
    }

    try {
        const client = createApiClient(session.accessToken);

        const [production, script, scenes, sets, assets, characters] = await Promise.all([
            client.get<any>(`/productions/${params.id}`),
            client.get<any>(`/productions/${params.id}/scripts/${params.scriptId}`),
            client.get<any[]>(`/productions/${params.id}/scripts/${params.scriptId}/scenes`),
            client.get<any[]>(`/productions/${params.id}/sets`),
            client.get<any[]>(`/productions/${params.id}/assets`),
            client.get<any[]>(`/productions/${params.id}/characters`),
        ]);

        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        const role = myMember?.role;
        const canEdit = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER].includes(role);

        if (!canEdit) {
            redirect(`/productions/${params.id}/script/${params.scriptId}`);
        }

        // If wizard is already complete, redirect to breakdown view
        if (script.wizardComplete) {
            redirect(`/productions/${params.id}/script/${params.scriptId}`);
        }

        return (
            <WizardClient
                script={script}
                initialScenes={scenes}
                productionId={params.id}
                sets={sets.filter((s: any) => !s.deletedAt)}
                assets={assets.filter((a: any) => !a.deletedAt)}
                characters={characters}
                token={session.accessToken}
            />
        );
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }
}
