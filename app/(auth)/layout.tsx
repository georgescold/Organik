export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Subtle cosmic ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] bg-primary/3 rounded-full blur-[80px] sm:blur-[120px]" />
            </div>
            <div className="relative z-10 w-full flex items-center justify-center">
                {children}
            </div>
        </div>
    )
}
