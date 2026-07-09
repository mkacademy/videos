import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ANONYMOUS } from "../../utils";
import { Button, Col, Form, Row } from "react-bootstrap";
import { useSubstantiator } from "../../Hooks/useAuthenticator";
import { Link } from "react-router-dom";
import { FormData } from "../../library/types";
import * as styles from "../../styles/verifyOrRegister.module.css";

const stylesProps = {
    formGroup: styles["form-group"],
    textMuted: styles["text-muted"],
    formText: styles["form-text"],
    btnInfo: styles["btn-info"],
    row: styles["row"],
}


interface RegisterProps {
  actor: number;
  email: string;
  username: string;
  mutateRole: string;
  setIsLogin: React.Dispatch<React.SetStateAction<boolean>>;
  amendAttempts: number;
  mutateAccount: (data: FormData) => void;
  reloadSettings: () => void;
  registerAttempts: number;
}

const pattern = {
  value: /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){8,16}$/,
  message: `password must contain 1 number (0-9),
         password must contain 1 lowercase letters,
         password must contain 1 uppercase letters,
         password is 8-16 characters with no space,
         password must contain 1 non-alpha numeric number`,
};

export default function Register({
  actor,
  email,
  username,
  mutateRole,
  setIsLogin,
  amendAttempts,
  mutateAccount,
  reloadSettings,
  registerAttempts,
}: RegisterProps) {
  const isAuthenticated = actor !== ANONYMOUS;
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    reset 
  } = useForm<FormData>({
    defaultValues: {
      email_txb: email,
      oldpassword_txb: "",
      newpassword_txb: "",
      username_txb: username,
    },
  });
  
  const [isAuthenticating, onSubmit] = useSubstantiator({
    mutateRole,
    mutateAccount,
    reloadSettings,
    attempts: isAuthenticated ? amendAttempts : registerAttempts,
  });

  useEffect(() => {
    reset({
      email_txb: email,
      oldpassword_txb: "",
      newpassword_txb: "",
      username_txb: username,
    });
  }, [email, actor, username, reset]);

  return (
    <Row className={stylesProps.row}>
      <Col sm={12}>
        <Form onSubmit={handleSubmit((formData: FormData) => onSubmit(formData))}>
          <Form.Group controlId="email_txb" className={stylesProps.formGroup}>
            <Form.Control
              size="lg"
              type="email"
              placeholder="Enter Email"
              readOnly={isAuthenticated}
              {...register("email_txb", { required: false })}
            />
          </Form.Group>
          <Form.Group controlId="username_txb" className={stylesProps.formGroup}>
            <Form.Control
              size="lg"
              type="text"
              placeholder="Enter Username"
              readOnly={isAuthenticated}
              {...register("username_txb", { required: true })}
            />
          </Form.Group>
          <Form.Group controlId="oldpassword_txb" className={stylesProps.formGroup}>
            <Form.Control
              size="lg"
              type="password"
              placeholder="Enter Password"
              {...register("oldpassword_txb", {
                required: true,
                pattern,
              })}
            />
          </Form.Group>
          <Form.Group controlId="newpassword_txb" className={stylesProps.formGroup}>
            <Form.Control
              size="lg"
              type="password"
              placeholder={
                "Enter " + (isAuthenticated ? "new" : "Confirm") + " Password"
              }
              {...register("newpassword_txb", { required: true })}
            />
          </Form.Group>
          <Button
            size="lg"
            type="submit"
            variant="info"
            className={stylesProps.btnInfo + " w-100"}
            disabled={isAuthenticating}
          >
            {isAuthenticating
              ? "Please wait..."
              : isAuthenticated
              ? "Update Account"
              : "Create Account"}
          </Button>
          {!isAuthenticated && (
            <Form.Text className={stylesProps.textMuted + " " + stylesProps.formText}>
              <Link
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  setIsLogin((prev) => !prev);
                }}
                to={"#"}
              >
                click here switch to login form
              </Link>
            </Form.Text>
          )}
          <Form.Text className={stylesProps.textMuted + " " + stylesProps.formText}>
            {errors.username_txb && <span>Username is required</span>}
          </Form.Text>
          <Form.Text className={stylesProps.textMuted + " " + stylesProps.formText}>
            {errors.oldpassword_txb && (
              <span>{errors.oldpassword_txb.message}</span>
            )}
          </Form.Text>
          <Form.Text className={stylesProps.textMuted + " " + stylesProps.formText}>
            {errors.newpassword_txb && (
              <span>
                {(isAuthenticated ? "new" : "Confirm") +
                  " Password is required"}
              </span>
            )}
          </Form.Text>
          <Form.Text className={stylesProps.textMuted + " " + stylesProps.formText}>
            {errors.email_txb && <span>Email is required</span>}
          </Form.Text>
        </Form>
      </Col>
    </Row>
  );
}
