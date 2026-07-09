import React, { useEffect, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { Button, Col, Form, Row } from "react-bootstrap";
import { queryString } from "../../utils";
import { useVerifier } from "../../Hooks/useAuthenticator";
import { ANONYMOUS } from "../../utils";
import { VerifyFormData } from "../../library/types";
import * as styles from "../../styles/verifyOrRegister.module.css";

const stylesProps = {
    formGroup: styles["form-group"],
    textMuted: styles["text-muted"],
    formText: styles["form-text"],
    row: styles["row"],
}
interface VerifyProps {
  actor: number;
  verifyAttempts: number;
  verifyAccount: (formData: VerifyFormData) => void;
}

export default function Verify({ actor, verifyAttempts, verifyAccount }: VerifyProps): React.ReactElement {
    const [isVerifieng, onSubmit] = useVerifier({
    attempts: verifyAttempts,
    verifyAccount,
  });
  
  const formRef = useRef<HTMLFormElement>(null);
  const { search } = useLocation();
  const { code = "" } = queryString(search);
  const defaultValues: VerifyFormData = { verificationcode_txb: code };
  
  const { register, handleSubmit, formState: { errors } } = useForm<VerifyFormData>({ defaultValues });
  const disabled: boolean = actor !== ANONYMOUS || isVerifieng ;
  useEffect(() => {
    if (code === "" || !formRef.current) return;
    const eventInitDict: EventInit = { cancelable: true, bubbles: true };
    formRef.current.dispatchEvent(new Event("submit", eventInitDict));
  }, [code, formRef]);

  const onSubmitHandler: SubmitHandler<VerifyFormData> = (formData) => {
    onSubmit(formData);
  };

  return (
    <Row className={stylesProps.row}>
      <Col sm={12}>
        <Form
          ref={formRef}
          onSubmit={handleSubmit(onSubmitHandler)}
        >
          <Form.Group controlId="accesscode" className={stylesProps.formGroup}>
            <Form.Text className={stylesProps.textMuted + " " + stylesProps.formText}>
              <span>
                please enter verification code(s) you received in your email
              </span>
            </Form.Text>
            <Form.Control
              size="lg"
              type="text"
              readOnly={disabled}
              placeholder="Enter verification code"
              {...register("verificationcode_txb", { required: true })}
            />
          </Form.Group>
          <Button
            size="lg"
            type="submit"
            variant="primary"
            disabled={disabled}
            className="w-100"
          >
            {verifyAttempts === -1
              ? "Account Verified"
              : isVerifieng
              ? "Please wait..."
              : "Verify Account"}
          </Button>
          <Form.Text className={stylesProps.textMuted + " " + stylesProps.formText}>
            {errors.verificationcode_txb && (
              <span>verification code is required</span>
            )}
          </Form.Text>
        </Form>
      </Col>
    </Row>
  );
}
