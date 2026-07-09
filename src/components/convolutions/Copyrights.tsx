import React from 'react';
import ViewSelector from './ViewSelector';
import UiShortcuts from '../navbar/UiShortcuts';
import RoleToggler from '../Tabulator/Authenticated/private/TableWidgets/RoleToggler';

interface CopyrightsProps {
    skeletons: boolean;
    loading: boolean;
    formatter: string;
    convolution: string;
    action?: () => void;
    children: React.ReactNode;
    confirmation?: React.ReactElement<typeof ViewSelector>;
}

const Copyrights: React.FC<CopyrightsProps> = ({
    action,
    loading,
    skeletons,
    children,
    formatter,
    convolution,
    confirmation,
}) => {
    return (
        <React.Fragment>
            <UiShortcuts
                loading={loading}
                skeletons={skeletons}
                convCss={convolution}
                formatter={formatter}
                saver={action ?? (() => { })}
            />
            {children}
            {confirmation && (
                <div className="row mb-5">
                    <div className="col-lg-12">
                        <p className="text-center small copyright-text mb-0">
                            {confirmation}
                        </p>
                    </div>
                </div>
            )}
            <RoleToggler isRolePicker={false} convCss={convolution} />
        </React.Fragment>

    );
};

export default Copyrights; 