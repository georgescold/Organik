import { getPost } from '@/server/actions/creation-actions';
import { CreationView } from '@/components/creation/creation-view';
import { redirect } from 'next/navigation';

export default async function EditorPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // We can't access params directly in async server component like this in newer Nextjs versions without await?
    // Actually params is acceptable.

    const res = await getPost(id);

    if (res.error || !res.post) {
        redirect('/dashboard');
    }

    return (
        <CreationView initialPost={res.post} />
    );
}
