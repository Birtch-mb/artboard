import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import UserSettingsClient from './UserSettingsClient';

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') {
        redirect('/login');
    }

    let showScriptDeletions = true;

    try {
        const client = createApiClient(session.accessToken);
        const prefs = await client.get<{ showScriptDeletions: boolean }>('/users/me');
        showScriptDeletions = prefs.showScriptDeletions ?? true;
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
    }

    return (
        <div className="max-w-2xl mx-auto p-8">
            <div className="mb-8 border-b border-neutral-800 pb-6">
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-sm text-neutral-500 mt-1">Manage your personal preferences.</p>
            </div>

            <UserSettingsClient
                initialShowDeletions={showScriptDeletions}
                token={session.accessToken}
            />
        </div>
    );
}
