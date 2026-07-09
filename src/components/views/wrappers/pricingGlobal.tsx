import { useEffect } from 'react';

export const PricingGlobal = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        document.documentElement.classList.add('pricing-html');
        document.body.classList.add('pricing-body');
        return () => {
            document.documentElement.classList.remove('pricing-html');
            document.body.classList.remove('pricing-body');
        };
    }, []);
    return (
        <>
            {children}
        </>
    );
};