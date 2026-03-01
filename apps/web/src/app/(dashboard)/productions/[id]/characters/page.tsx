import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Role } from '@/lib/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import CharacterListClient from './components/CharacterListClient';

export default async function CharactersPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let characters: any[] = [];
    let canCreate = false;

    try {
        const client = createApiClient(session.accessToken);
        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        const role = myMember?.role;

        canCreate = role === Role.ART_DIRECTOR || role === Role.PRODUCTION_DESIGNER;

        characters = await client.get<any[]>(`/productions/${params.id}/characters`);
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Characters</h1>
                    <p className="text-sm text-neutral-400">
                        All named characters in this production.
                    </p>
                </div>
                {canCreate && (
                    <Link
                        href={`/productions/${params.id}/characters/new`}
                        className="flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        New Character
                    </Link>
                )}
            </div>

            <CharacterListClient
                initialCharacters={characters}
                productionId={params.id}
                canCreate={canCreate}
                token={session.accessToken}
            />
        </div>
    );
}
