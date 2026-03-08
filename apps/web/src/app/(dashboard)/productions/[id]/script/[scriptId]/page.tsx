import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Role } from '@/lib/types';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import SceneBreakdownWrapper from './components/SceneBreakdownWrapper';

export default async function SceneBreakdownPage({
    params,
}: {
    params: { id: string; scriptId: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') {
        redirect('/login');
    }

    let script: any = null;
    let scenes: any[] = [];
    let sets: any[] = [];
    let assets: any[] = [];
    let characters: any[] = [];
    let pdfUrl = '';
    let canEdit = false;
    let canReview = false;
    let canAssignAsset = false;
    let showScriptDeletions = true;

    try {
        const client = createApiClient(session.accessToken);

        const [production, scriptData, scenesData, setsData, assetsData, charactersData, urlData, userPrefs] =
            await Promise.all([
                client.get<any>(`/productions/${params.id}`),
                client.get<any>(`/productions/${params.id}/scripts/${params.scriptId}`),
                client.get<any[]>(`/productions/${params.id}/scripts/${params.scriptId}/scenes`),
                client.get<any[]>(`/productions/${params.id}/sets`),
                client.get<any[]>(`/productions/${params.id}/assets`),
                client.get<any[]>(`/productions/${params.id}/characters`),
                client.get<{ url: string }>(
                    `/productions/${params.id}/scripts/${params.scriptId}/url`,
                ),
                client.get<any>('/users/me'),
            ]);

        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        const role = myMember?.role;

        canEdit = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER].includes(role);
        canReview = role === Role.ART_DIRECTOR;
        canAssignAsset = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR].includes(role);

        script = scriptData;
        scenes = scenesData;
        sets = setsData.filter((s: any) => !s.deletedAt);
        assets = assetsData.filter((a: any) => !a.deletedAt);
        characters = charactersData;
        pdfUrl = urlData.url;
        showScriptDeletions = userPrefs.showScriptDeletions ?? true;
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-4 p-6 max-w-7xl mx-auto w-full">
            {/* Back link */}
            <Link
                href={`/productions/${params.id}/script`}
                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors w-fit"
            >
                <ChevronLeft className="h-4 w-4" />
                All Versions
            </Link>

            <SceneBreakdownWrapper
                script={script}
                scenes={scenes}
                pdfUrl={pdfUrl}
                productionId={params.id}
                sets={sets}
                assets={assets}
                productionCharacters={characters}
                canEdit={canEdit}
                canReview={canReview}
                canAssignAsset={canAssignAsset}
                token={session.accessToken}
                showScriptDeletions={showScriptDeletions}
            />
        </div>
    );
}
