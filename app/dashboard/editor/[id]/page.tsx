import { getPost } from '@/server/actions/creation-actions';
import { CreationView } from '@/components/creation/creation-view';
import { redirect } from 'next/navigation';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const res = await getPost(id);

    if (res.error || !res.post) {
        redirect('/dashboard');
    }

    return (
        <CreationView initialPost={res.post} />
    );
}
