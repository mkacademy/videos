import { useEffect } from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import { Action } from "@reduxjs/toolkit";
import { modifyTimestamp } from "../../../store/slices/stashSlice";
import { useForm, SubmitHandler, FieldErrors } from "react-hook-form";
import * as styles from "../../../styles/settings.module.css";

const styleProps = {
  colSm12: styles["col-sm-12"],
  btnBlock: styles["btn-block"],
  formText: styles["form-text"],
};

interface TimestampEditProps {
  approute?: string;
  timestamp?: string;
  handleSubmitBtn: (action: Action) => void;
}

interface FormData {
  timestampedit_txb: string;
}

interface CustomErrors extends FieldErrors<FormData> {
  timestampValidator?: {
    message: string;
  };
}

export default function TimestampEdit({
  approute,
  timestamp,
  handleSubmitBtn,
}: TimestampEditProps) {
  const defaultValues: FormData = { timestampedit_txb: timestamp || "" };
  const disabled = approute === undefined || timestamp === undefined;
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    reset, 
    setError, 
    clearErrors 
  } = useForm<FormData>({ defaultValues });
  
  useEffect(() => {
    reset({ timestampedit_txb: timestamp || "" });
  }, [timestamp, reset]);
  
  const onSubmit: SubmitHandler<FormData> = (formData) => {
    const { timestampedit_txb } = formData;
    if (timestampedit_txb?.toLowerCase() === "undefined") {
      const message = "undefined name is not allowed";
      setError("root.timestampValidator", { message });
      setTimeout(() => clearErrors(), 5000);
    } else {
      handleSubmitBtn(
        modifyTimestamp({
          newtimestamp: timestampedit_txb,
          oldtimestamp: timestamp || "",
          approute: approute || "",
        })
      );
    }
  };

  const customErrors = errors as CustomErrors;

  return (
    <Row className="mt-2">
      <Col sm={12} className={styleProps.colSm12}>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Form.Group className="mb-2">
            <Form.Control
              size="lg"
              type="text"
              readOnly={disabled}
              placeholder="Enter timestamp name"
              {...register("timestampedit_txb", { required: true })}
            />
          </Form.Group>
          <Button
            size="lg"
            type="submit"
            variant="primary"
            disabled={disabled}
            className={styleProps.btnBlock + " " + "w-100"}
          >
            Rename Timestamp
          </Button>
          <Form.Text className={styleProps.formText + " " + "text-muted"}>
            {errors.timestampedit_txb && (
              <span>timestamp name is required</span>
            )}
            {customErrors.timestampValidator && (
              <span>{customErrors.timestampValidator.message}</span>
            )}
          </Form.Text>
        </Form>
      </Col>
    </Row>
  );
}
