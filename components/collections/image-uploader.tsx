'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadImage } from '@/server/actions/image-actions';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';


interface ImageUploaderProps {
    onUploadSuccess?: () => void;
    collectionId?: string;
}

export function ImageUploader({ onUploadSuccess, collectionId }: ImageUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const cancelRef = useRef(false);
    const [uploadedCountState, setUploadedCountState] = useState(0);
    const [totalFilesState, setTotalFilesState] = useState(0);

    const handleCancel = () => {
        cancelRef.current = true;
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = async (fileList: FileList) => {
        cancelRef.current = false;
        const allFiles = Array.from(fileList);
        const total = allFiles.length;
        setTotalFilesState(total);
        setUploadedCountState(0);

        let uploadedCount = 0;
        let errors: string[] = [];

        // Batch configuration
        const BATCH_SIZE = 5;

        // Helper to process a batch
        const processBatch = async (batchFiles: File[]) => {
            const formData = new FormData();

            // Upload original files without compression to preserve quality
            // Original format (PNG, JPEG, WebP) is kept as-is
            batchFiles.forEach(f => formData.append('file', f));

            if (collectionId) {
                formData.append('collectionId', collectionId);
            }

            const result = await uploadImage(formData);
            if (result.success && result.count) {
                return result.count;
            } else if (result.error) {
                errors.push(result.error);
            }
            return 0;
        };

        setIsUploading(true);
        (async () => {
            try {
                for (let i = 0; i < total; i += BATCH_SIZE) {
                    if (cancelRef.current) {
                        toast.info("Upload annulé");
                        break;
                    }

                    const batch = allFiles.slice(i, i + BATCH_SIZE);
                    const currentProgress = Math.round((uploadedCount / total) * 100);
                    setProgress(Math.max(10, currentProgress));

                    const processed = await processBatch(batch);
                    uploadedCount += processed;
                    setUploadedCountState(uploadedCount);
                }

                setProgress(100);
                if (!cancelRef.current) {
                    if (uploadedCount > 0) {
                        toast.success(`${uploadedCount}/${total} images ajoutées avec succès !`);
                    }

                    if (errors.length > 0) {
                        // Show distinct errors (e.g. "Missing API Key")
                        const uniqueErrors = Array.from(new Set(errors));
                        uniqueErrors.forEach(err => toast.error(err));
                    } else if (uploadedCount === 0) {
                        toast.error("Échec de l'upload. Vérifiez votre connexion ou la taille des fichiers.");
                    }

                    if (onUploadSuccess) onUploadSuccess();
                }
            } finally {
                setIsUploading(false);
                setTimeout(() => {
                    setProgress(0);
                    setUploadedCountState(0);
                    setTotalFilesState(0);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }, 1000);
            }
        })();
    };

    return (
        <div className="w-full">
            <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-4 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                    ${isUploading ? 'cursor-default border-border' : 'hover:bg-muted/10 border-border'}
                    ${dragActive ? 'border-primary bg-primary/5' : ''}
                `}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full" onClick={(e) => e.stopPropagation()}>
                        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
                        <div className="space-y-1 text-center">
                            <p className="text-xs sm:text-sm font-medium">Analyse en cours...</p>
                            <p className="text-xs text-muted-foreground">{uploadedCountState}/{totalFilesState} images traitées...</p>
                        </div>
                        <Progress value={progress} className="w-full max-w-[200px] h-2 bg-secondary/20" />
                        <Button variant="destructive" size="sm" onClick={handleCancel} className="mt-2">
                            Annuler
                        </Button>
                    </div>
                ) : (
                    <>
                        <Upload className={`h-8 w-8 sm:h-10 sm:w-10 mb-3 sm:mb-4 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-xs sm:text-sm font-medium text-center px-2">Glisser-déposer ou cliquer pour uploader plusieurs images</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP jusqu'à 20MB</p>
                    </>
                )}
            </div>
        </div>
    );
}
