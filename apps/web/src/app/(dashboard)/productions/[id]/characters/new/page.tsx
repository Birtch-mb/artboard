import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Role } from '@/lib/types';
import CreateCharacterForm from './components/CreateCharacterForm';

export default async function NewCharacterPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    try {
        const client = createApiClient(session.accessToken);
        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        const role = myMember?.role;
        const canCreate = role === Role.ART_DIRECTOR || role === Role.PRODUCTION_DESIGNER;

        if (!canCreate) {
            redirect(`/productions/${params.id}/characters`);
        }
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        redirect(`/productions/${params.id}/characters`);
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-xl mx-auto w-full">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                <Link
                    href={`/productions/${params.id}/characters`}
                    className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Characters
                </Link>
            </div>

            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">New Character</h1>
                <p className="text-sm text-neutral-400">Add a named character to this production.</p>
            </div>

            <CreateCharacterForm
                productionId={params.id}
                token={session.accessToken}
            />
        </div>
    );
}
