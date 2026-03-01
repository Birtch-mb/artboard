import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Role } from '@/lib/types';
import CharacterDetailClient from './components/CharacterDetailClient';

export default async function CharacterDetailPage({
    params,
}: {
    params: { id: string; characterId: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let character: any = null;
    let allAssets: any[] = [];
    let allSets: any[] = [];
    let isAdOrPd = false;

    try {
        const client = createApiClient(session.accessToken);

        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        const role = myMember?.role;
        isAdOrPd = role === Role.ART_DIRECTOR || role === Role.PRODUCTION_DESIGNER;

        const [characterData, assetsData, setsData] = await Promise.all([
            client.get<any>(`/productions/${params.id}/characters/${params.characterId}`),
            client.get<any[]>(`/productions/${params.id}/assets`),
            client.get<any[]>(`/productions/${params.id}/sets`),
        ]);

        character = characterData;
        allAssets = assetsData;
        allSets = setsData;
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <CharacterDetailClient
            character={character}
            allAssets={allAssets}
            allSets={allSets}
            productionId={params.id}
            isAdOrPd={isAdOrPd}
            token={session.accessToken}
        />
    );
}
