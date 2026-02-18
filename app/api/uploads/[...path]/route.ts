import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile, stat } from 'fs/promises';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ path: string[] }> }
) {
    const params = await props.params;
    // Use spread to join path segments correctly for the OS
    const fullPath = join(process.cwd(), 'public', 'uploads', ...params.path);

    console.log(`[API] Serving image from: ${fullPath}`);

    try {
        await stat(fullPath);
        const fileBuffer = await readFile(fullPath);

        // Simple mime type detection
        const ext = params.path[params.path.length - 1].split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        if (ext === 'png') contentType = 'image/png';
        if (ext === 'webp') contentType = 'image/webp';
        if (ext === 'gif') contentType = 'image/gif';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            },
        });
    } catch (e) {
        console.error(`[API] Error reading file: ${e}`);
        return new NextResponse('File not found', { status: 404 });
    }
}
