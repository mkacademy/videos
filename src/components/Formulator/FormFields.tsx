import { Col, Form, Row } from "react-bootstrap";
import React, { useRef, useState } from "react";
import { UseFormRegister, FieldErrors, FieldValues } from "react-hook-form";
import { SAVE_CHANGES, UNDO_CHANGES } from "../../utils";
import { FormDropdown, FormInput } from "../Core/types";
import { Metadata } from "../Core/types";
import * as styles from "../../styles/Formulator.module.css";

const actions = [UNDO_CHANGES, SAVE_CHANGES];

const stylesProps = {
    formLabel: styles["form-label"],
    formControl: styles["form-control"],
}

interface FormFieldsProps {
    id: string;
    required: boolean;
    register: UseFormRegister<FieldValues>;
    errors: FieldErrors<FieldValues>;
    modified?: boolean;
    metadata?: Metadata;
    textInputs?: FieldValues[];
    emailInputs?: FieldValues[];
    numberInputs?: FieldValues[];
    passInputs?: FieldValues[];
    textAreas?: FormInput[];
    fileInputs?: FormInput[];
    dropDowns?: FormDropdown[];
}

const FormFields: React.FC<FormFieldsProps> = (props) => {
    const previousText = useRef<number>(0);
    const mutatedFields = useRef<number>(0);
    const { required, register, errors, modified } = props;
    const [isRequired, setIsRequired] = useState<boolean>(required);
    const { passInputs, fileInputs, textAreas, dropDowns } = props;
    const submit_action = modified ?? true ? SAVE_CHANGES : UNDO_CHANGES;
    const { numberInputs, emailInputs, textInputs } = props;
    const actionIndex = actions.indexOf(submit_action);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (required) return;
        const curText = e.target.value.trim().length;
        if (!isRequired && curText > 0) mutatedFields.current++;
        else if (isRequired && previousText.current > 0 && curText === 0)
            mutatedFields.current--;
        else if (isRequired && previousText.current === 0 && curText > 0)
            mutatedFields.current++;
        if (!isRequired && mutatedFields.current > 0) setIsRequired(true);
        else if (isRequired && mutatedFields.current === 0) setIsRequired(false);
    };

    const notEditable = props.metadata ? props.metadata.owner === false : false;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (required) return;
        if (isRequired) previousText.current = e.target.value.trim().length;
    };

    // Create a combined handler that calls both react-hook-form's onBlur and our custom handler
    const createCombinedBlurHandler = (rhfOnBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void) => {
        return (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            handleBlur(e); // Call our custom logic first
            if (rhfOnBlur) rhfOnBlur(e); // Then call react-hook-form's handler
        };
    };

    return (
        <React.Fragment>
            <input
                type="hidden"
                readOnly={true}
                value={props.id}
                {...register(`id${props.id}`, { required: true })}
            />
            {textInputs &&
                textInputs.map((form, i) => (
                    <Row key={i}>
                        <Col>
                            <Form.Label className={stylesProps.formLabel}>{form.label}</Form.Label>
                            <Form.Control
                                className={stylesProps.formControl}
                                type="text"
                                disabled={notEditable}
                                {...(() => {
                                    const { onBlur: rhfOnBlur, ...registerProps } = register(
                                        form.name + props.id,
                                        {
                                            required: isRequired,
                                            ...(form.maxlength && { maxLength: form.maxlength })
                                        }
                                    );
                                    return {
                                        ...registerProps,
                                        onBlur: createCombinedBlurHandler(rhfOnBlur)
                                    };
                                })()}
                                defaultValue={required ? props[form.name] : ""}
                                onFocus={handleFocus}
                            />
                            {errors[form.name + props.id]?.type === "required" && (
                                <span>This field is required</span>
                            )}
                            {errors[form.name + props.id]?.type === "maxLength" && (
                                <span>Your input exceeds maxLength of {form.maxlength}</span>
                            )}
                        </Col>
                    </Row>
                ))}
            {emailInputs &&
                emailInputs.map((form, i) => (
                    <Row key={i}>
                        <Col>
                            <Form.Label className={stylesProps.formLabel}>{form.label}</Form.Label>
                            <Form.Control
                                className={stylesProps.formControl}
                                type="email"
                                disabled={notEditable}
                                {...(() => {
                                    const { onBlur: rhfOnBlur, ...registerProps } = register(form.name + props.id, { required: isRequired });
                                    return {
                                        ...registerProps,
                                        onBlur: createCombinedBlurHandler(rhfOnBlur)
                                    };
                                })()}
                                defaultValue={required ? props[form.name] : ""}
                                onFocus={handleFocus}
                            />
                            {errors[form.name + props.id] && (
                                <span>This field is required</span>
                            )}
                        </Col>
                    </Row>
                ))}
            {numberInputs &&
                numberInputs.map((form, i) => (
                    <Row key={i}>
                        <Col>
                            <Form.Label>{form.label}</Form.Label>
                            <Form.Control
                                className={stylesProps.formControl}
                                type="number"
                                disabled={notEditable}
                                {...(() => {
                                    const { onBlur: rhfOnBlur, ...registerProps } = register(form.name + props.id, { required: isRequired });
                                    return {
                                        ...registerProps,
                                        onBlur: createCombinedBlurHandler(rhfOnBlur)
                                    };
                                })()}
                                defaultValue={required ? props[form.name] : ""}
                                onFocus={handleFocus}
                            />
                            {errors[form.name + props.id] && (
                                <span>This field is required</span>
                            )}
                        </Col>
                    </Row>
                ))}
            {passInputs &&
                passInputs.map((form, i) => (
                    <Row key={i}>
                        <Col>
                            <Form.Label className={stylesProps.formLabel}>{form.label}</Form.Label>
                            <Form.Control
                                className={stylesProps.formControl}
                                type="password"
                                disabled={notEditable}
                                {...(() => {
                                    const { onBlur: rhfOnBlur, ...registerProps } = register(
                                        form.name + props.id,
                                        form.maxlength
                                            ? { required: isRequired, maxLength: form.maxlength }
                                            : { required: isRequired }
                                    );
                                    return {
                                        ...registerProps,
                                        onBlur: createCombinedBlurHandler(rhfOnBlur)
                                    };
                                })()}
                                defaultValue={required ? props[form.name] : ""}
                                onFocus={handleFocus}
                            />
                        </Col>
                        {errors[form.name + props.id]?.type === "required" && (
                            <span>This field is required</span>
                        )}
                        {errors[form.name + props.id]?.type === "maxLength" && (
                            <span>Your input exceeds maxLength of {form.maxlength}</span>
                        )}
                    </Row>
                ))}
            {textAreas &&
                textAreas.map((form, i) => (
                    <Row key={i}>
                        <Col>
                            <Form.Label className={stylesProps.formLabel}>{form.label}</Form.Label>
                            <Form.Control
                                rows={10}
                                as="textarea"
                                disabled={notEditable}
                                className={stylesProps.formControl}
                                {...(() => {
                                    const { onBlur: rhfOnBlur, ...registerProps } = register(
                                        form.name + props.id,
                                        form.maxlength
                                            ? { required: isRequired, maxLength: form.maxlength }
                                            : { required: isRequired }
                                    );
                                    return {
                                        ...registerProps,
                                        onBlur: createCombinedBlurHandler(rhfOnBlur)
                                    };
                                })()}
                                defaultValue={required ? props[form.name] : ""}
                                onFocus={handleFocus}
                            />
                            {errors[form.name + props.id]?.type === "required" && (
                                <span>This field is required</span>
                            )}
                            {errors[form.name + props.id]?.type === "maxLength" && (
                                <span>Your input exceeds maxLength of {form.maxlength}</span>
                            )}
                        </Col>
                    </Row>
                ))}
            {fileInputs &&
                fileInputs.map((form, i) => (
                    <Row key={i}>
                        <Col>
                            <Form.Label className={stylesProps.formLabel}>{form.label}</Form.Label>
                            <Form.Control
                                className={stylesProps.formControl}
                                type="file"
                                disabled={notEditable}
                                {...register(form.name + props.id, { required: false })}
                            />
                        </Col>
                    </Row>
                ))}
            {dropDowns &&
                dropDowns.map((form, i) => (
                    <Row key={i}>
                        <Col>
                            <Form.Label className={stylesProps.formLabel}>{form.label}</Form.Label>
                            <Form.Control
                                className={stylesProps.formControl}
                                as="select"
                                disabled={notEditable}
                                {...register(form.name + props.id, { required: isRequired })}
                                defaultValue={
                                    required
                                        ? form.name !== "modified"
                                            ? props[form.name]
                                            : actionIndex
                                        : ""
                                }
                            >
                                {form.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.text}
                                    </option>
                                ))}
                            </Form.Control>
                            {errors[form.name + props.id] && (
                                <span>This field is required</span>
                            )}
                        </Col>
                    </Row>
                ))}
        </React.Fragment>
    );
};

export default FormFields;
