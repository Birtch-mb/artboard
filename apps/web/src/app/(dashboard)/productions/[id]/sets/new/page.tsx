import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { Role } from '@artboard/shared';
import NewSetForm from './components/NewSetForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NewSetPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    let production;
    let availableParents = [];

    try {
        const client = createApiClient(session.accessToken);

        // Fetch production
        production = await client.get<any>(`/productions/${params.id}`);

        // Verify user has permission to create sets
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);
        const hasPermission = [Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR].includes(myMember?.role);

        if (!hasPermission) {
            redirect(`/productions/${params.id}/sets`);
        }

        // Fetch all sets to populate parent select (filtered to level 1 and 2 on client)
        availableParents = await client.get<any[]>(`/productions/${params.id}/sets`);
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
            <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4">
                <Link
                    href={`/productions/${params.id}/sets`}
                    className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors w-fit"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sets
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">New Set</h1>
                    <p className="text-sm text-neutral-400 text-balance">
                        Create a new set for {production.name}. You can nest sets up to 3 levels deep.
                    </p>
                </div>
            </div>

            <NewSetForm productionId={params.id} availableParents={availableParents} />
        </div>
    );
}
