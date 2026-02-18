'use client';

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

interface LogoutItemProps {
    logoutAction: () => Promise<void>;
}

export function LogoutItem({ logoutAction }: LogoutItemProps) {
    return (
        <DropdownMenuItem
            className="text-red-500 focus:text-red-500 focus:bg-red-50 cursor-pointer"
            onSelect={(event) => {
                // We can allow the menu to close, but we must ensure the action fires.
                // Calling the server action directly.
                logoutAction();
            }}
        >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Déconnexion</span>
        </DropdownMenuItem>
    );
}
