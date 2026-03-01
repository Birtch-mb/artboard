import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { notFound, redirect } from 'next/navigation';
import { Role } from '@/lib/types';
import NewLocationForm from './components/NewLocationForm';

export default async function NewLocationPage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

    try {
        const client = createApiClient(session.accessToken);
        const production: any = await client.get(`/productions/${params.id}`);
        const myMember = production.members.find((m: any) => m.user.id === session.user?.id);

        const canCreate =
            myMember?.role === Role.ART_DIRECTOR ||
            myMember?.role === Role.PRODUCTION_DESIGNER;

        if (!canCreate) {
            redirect(`/productions/${params.id}/locations`);
        }
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto w-full">
            <div className="border-b border-neutral-800 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Add New Location</h1>
                <p className="text-sm text-neutral-400">
                    Create a new stage, exterior, base, or practical set.
                </p>
            </div>

            <NewLocationForm productionId={params.id} token={session.accessToken} />
        </div>
    );
}
