import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    return (
        <>
            <SignedIn>{children}</SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    );
}
