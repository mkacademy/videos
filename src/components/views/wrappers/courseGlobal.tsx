import { useEffect } from 'react';

export const CourseGlobal = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        document.documentElement.classList.add('course-html');
        document.body.classList.add('course-body');
        return () => {
            document.documentElement.classList.remove('course-html');
            document.body.classList.remove('course-body');
        };
    }, []);
    return (
        <>
            {children}
        </>
    );
}; 