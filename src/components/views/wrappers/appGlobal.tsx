import { useEffect } from 'react';

export const AppGlobal = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        document.documentElement.classList.add('app-html');
        return () => {
            document.documentElement.classList.remove('app-html');
        };
    }, []);
    return (
        <>
            {children}
        </>
    );
};
