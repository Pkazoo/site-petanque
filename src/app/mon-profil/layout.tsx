import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Mon Profil - PétanqueManager",
    description: "Gérez votre profil et consultez vos statistiques.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
