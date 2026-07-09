import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../../store/types';
import { Image, ButtonGroup, ToggleButton } from 'react-bootstrap';
import { COMPLETED_MESSAGE, cpanelMessage } from '../../../../../store/slices/viewSlice';
import * as styles from '../../../../../styles/roletoggler.module.css';
const badge = new URL('../../../../../Images/badge.png', import.meta.url).href;
import { capitalizeFirstLetter, formatBytes, getCurAppName } from '../../../../../utils';
import { mutateRole, mutateShowRoles, toggleShortcuts } from '../../../../../store/slices/sessionSlice';

interface RoleTogglerProps {
    isRolePicker?: boolean;
    convCss?: string;
}

const styleProps = {
    btn: styles["btn"],
    role: styles["role"],
    cpanel: styles["cpanel"],
    public: styles["public"],
    private: styles["private"],
    closeBtn: styles["closeBtn"],
    btnGroup: styles["btn-group"],
    twoButtons: styles["two-buttons"],
    notRolePicker: styles["notRolePicker"],
    closeBtnContainer: styles["closeBtn-Container"],
}

interface RolePickerProps {
    roles: string[];
    classes: string;
    roleIndex: number;
    showRolesToggler: boolean;
    message: string | undefined;
    setMessage: (msg?: string) => void;
    toggleShowRolesToggler: (show: boolean) => void;
    radios: Array<{ name: string; value: string; index: number }>;
    roleMutator: (payload: { roleIndex: number; mutateRole: string }) => void;
}

const RolePicker: React.FC<RolePickerProps> = ({
    roles,
    radios,
    message,
    classes,
    roleIndex,
    setMessage,
    roleMutator,
    showRolesToggler,
    toggleShowRolesToggler,
}) => {
    const [radioValue, setRadioValue] = useState(roleIndex.toString());

    return (
        <div className={styleProps.notRolePicker}>
            {showRolesToggler ? (
                <React.Fragment>
                    <ButtonGroup className={styleProps.btnGroup}>
                        {radios.map((radio, idx) => (
                            <ToggleButton
                                key={idx}
                                id={`role-radio-${idx}`}
                                type="radio"
                                name="radio"
                                variant="secondary"
                                value={radio.value}
                                checked={radioValue === radio.value}
                                onChange={(e) => {
                                    const indexer = parseInt(e.currentTarget.value);
                                    setRadioValue(e.currentTarget.value);
                                    roleMutator({
                                        roleIndex: indexer,
                                        mutateRole: roles[indexer],
                                    });
                                }}
                            >
                                {radio.name}
                            </ToggleButton>
                        ))}
                    </ButtonGroup>
                    <div
                        className={
                            roles.length < 3
                                ? `closeBtn-Container two-buttons ${styleProps.closeBtnContainer} ${styleProps.twoButtons}`
                                : `closeBtn-Container ${styleProps.closeBtnContainer}`
                        }
                        onClick={(e) => {
                            setMessage();
                            e.preventDefault();
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            toggleShowRolesToggler(!showRolesToggler);
                        }}
                    >
                        <Image className={`closeBtn ${styleProps.closeBtn}`} src={badge} roundedCircle />
                    </div>
                </React.Fragment>
            ) : (
                <div
                    className={classes}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                        toggleShowRolesToggler(!showRolesToggler);
                    }}
                >
                    <span>{message}</span>
                </div>
            )}
        </div>
    );
};

const getRoleIndex = (radiObj: { name: string; value: string }, roles: string[] | undefined) => {
    const pred = (role: string) => role.includes(radiObj.name);
    const index = roles ? roles.findIndex(pred) : 0;
    return { ...radiObj, value: index.toString(), index };
};

const radiosArr = [
    { name: "USER", value: "0" },
    { name: "MODE", value: "1" },
    { name: "ADMIN", value: "2" },
];

const RoleToggler: React.FC<RoleTogglerProps> = ({ isRolePicker = false, convCss }) => {
    const dispatch = useDispatch();
    const roles = useSelector((state: RootState) => state.session.roles);
    const roleIndex = useSelector((state: RootState) => state.session.roleIndex);
    const isRequestProcessing = useSelector((state: RootState) => state.view.requestIsProcessing);
    const showRolesToggler = useSelector((state: RootState) => state.session.showRolesToggler);
    const isIncognito = useSelector((state: RootState) => state.session.isIncognito);
    const isPrivate = useSelector((state: RootState) => state.session.isPrivate);
    const username = useSelector((state: RootState) => state.session.username);
    const webapp = useSelector((state: RootState) => state.session.curApp);
    const quota = useSelector((state: RootState) => state.session.quota);
    const message = useSelector((state: RootState) => state.view.message);
    const tutors = useSelector((state: RootState) => state.comms.tutors);
    const curMailer = useSelector((state: RootState) => state.session.curMailer);
    const isUnzipTutorials = useSelector((state: RootState) => state.settings.isUnzipTutorials);
    const isUnzipCourses = useSelector((state: RootState) => state.settings.isUnzipCourses);
    const isUnzipQuizzes = useSelector((state: RootState) => state.settings.isUnzipQuizzes);
    const activeShortcuts = useSelector((state: RootState) => state.settings.activeShortcuts);
    const isMaximumFeatures = !isUnzipCourses && !isUnzipQuizzes && !isUnzipTutorials;

    const app = getCurAppName(webapp).toUpperCase();
    const displayed = username ? username : "guest";
    const radioValue = roleIndex.toString();
    const alias = capitalizeFirstLetter(displayed);
    const radios = radiosArr
        .map((radio) => getRoleIndex(radio, roles))
        .filter((r) => r.index > -1);
    const role = radios.find((r) => r.value === radioValue)?.name;
    const collaborator = curMailer === -1 ? undefined : tutors?.find(({ id }) => curMailer === id)?.title;
    const shortcutProfile = activeShortcuts ? ` [${activeShortcuts.toUpperCase()}]` : '';
    const msg = isMaximumFeatures ? `${alias}'s current ${collaborator ?
        "mailer" : "workspace"} is : ${role ? collaborator ?? role : "NONE"} App: ${app} Quota : ${quota ? formatBytes(quota, 3) : "NONE"}${shortcutProfile}` : '';

    const classes = !isIncognito && isPrivate
        ? `role ${styleProps.role} ${styleProps.private}`
        : !isIncognito && !isPrivate
            ? `role ${styleProps.role} ${styleProps.public}`
            : `role ${styleProps.role}`;

    const isRequestProcessingRef = useRef({ isRequestProcessing, message });

    useEffect(() => {
        isRequestProcessingRef.current.isRequestProcessing = isRequestProcessing;
        isRequestProcessingRef.current.message = message;
    }, [isRequestProcessing, message]);
    useEffect(() => {
        const { isRequestProcessing, message } = isRequestProcessingRef.current;
        if (!isRequestProcessing || message === COMPLETED_MESSAGE) {
            const timeoutId = setTimeout(() => {
                if (!isRequestProcessing || message === COMPLETED_MESSAGE)
                    dispatch(cpanelMessage(msg));
            }, 2000);

            return () => clearTimeout(timeoutId);
        }
    }, [message, msg, isRequestProcessing]);

    const clearMessages = () => {
        dispatch(toggleShortcuts());
        dispatch(cpanelMessage(msg));
    };

    return isRolePicker && roles && roles.length > 1 ? (
        <RolePicker
            roles={roles}
            radios={radios}
            classes={classes}
            message={message}
            roleIndex={roleIndex}
            setMessage={clearMessages}
            showRolesToggler={showRolesToggler}
            roleMutator={(payload) => dispatch(mutateRole(payload))}
            toggleShowRolesToggler={(show) => dispatch(mutateShowRoles(show))}
        />
    ) : (
        <div className={`${styleProps.notRolePicker} ${convCss?.endsWith("cpanel") ? styleProps.cpanel : convCss}`}>
            <div
                className={classes}
                onClick={(e) => {
                    clearMessages();
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                }}
            >
                <span>{message}</span>
            </div>
        </div>
    );
};

export default RoleToggler; 