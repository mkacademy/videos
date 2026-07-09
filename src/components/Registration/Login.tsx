import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Col, Form, Row } from "react-bootstrap";
import { useSubstantiator } from "../../Hooks/useAuthenticator";
import { Link } from "react-router-dom";
import { ANONYMOUS } from "../../utils";
import { FormData } from "../../library/types";
import * as styles from "../../styles/verifyOrRegister.module.css";

const stylesProps = {
    formGroup: styles["form-group"],
    textMuted: styles["text-muted"],
    formText: styles["form-text"],
    btnInfo: styles["btn-info"],
    row: styles["row"],
}
interface LoginProps {
  actor: number;
  setIsLogin: (value: boolean | ((prev: boolean) => boolean)) => void;
  mutateAccount: (data: FormData) => void;
  reloadSettings: () => void;
  registerAttempts: number;
}

export default function Login({
  actor,
  setIsLogin,
  mutateAccount,
  reloadSettings,
  registerAttempts,
}: LoginProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [isAuthenticating, onSubmit] = useSubstantiator({
    mutateAccount,
    reloadSettings,
    attempts: registerAttempts,
  });

  useEffect(() => {
    if (actor !== ANONYMOUS) setIsLogin((prev) => !prev);
  }, [actor, setIsLogin]);

  return (
    <Row className={stylesProps.row}>
      <Col sm={12}>
        <Form onSubmit={handleSubmit((formData) => onSubmit(formData))}>
          <Form.Group controlId="username_txb" className={stylesProps.formGroup}>
            <Form.Control
              size="lg"
              type="text"
              placeholder="Enter your username"
              {...register("username_txb", { required: true })}
            />
          </Form.Group>
          <Form.Group controlId="oldpassword_txb" className={stylesProps.formGroup}>
            <Form.Control
              size="lg"
              type="password"
              placeholder="Enter your password"
              {...register("oldpassword_txb", { required: true })}
            />
          </Form.Group>
          <div className="d-grid">
            <Button
              size="lg"
              type="submit"
              variant="info"
              className={stylesProps.btnInfo}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? "Please wait..." : "LOGIN"}
            </Button>
          </div>
          <Form.Text className={stylesProps.textMuted + " " + stylesProps.formText}>
            <Link
              onClick={(e) => {
                e.preventDefault();
                setIsLogin((prev) => !prev);
              }}
              to={"#"}
            >
              click here to switch to registration form
            </Link>
          </Form.Text>
          <Form.Text className={stylesProps.textMuted + " " + stylesProps.formText}>
            {errors["username_txb"] && <span>Username is required</span>}
          </Form.Text>
          <Form.Text className={stylesProps.textMuted + " " + stylesProps.formText}>
            {errors["oldpassword_txb"] && <span>Password is required</span>}
          </Form.Text>
        </Form>
      </Col>
    </Row>
  );
}
