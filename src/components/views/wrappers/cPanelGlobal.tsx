import { useEffect } from 'react';

export const CpanelGlobal = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        document.documentElement.classList.add('cpanel-html');
        document.body.classList.add('cpanel-body');
        return () => {
            document.documentElement.classList.remove('cpanel-html');
            document.body.classList.remove('cpanel-body');
        };
    }, []);
    return (
        <>
            {children}
        </>
    );
}; 