import { IncommingButtonLabel, OutgoingButtonLabel, inBanners, inVariants, outBanners, outVariants, btnVariants } from '../../../library/commsUtils';
import { IncomingMessage, OutgoingMessage, Tutor } from '../../../store/slices/commsSlice';
import * as commsStyles from '../../../styles/comms.module.css';
import { Alert, Button, Card } from 'react-bootstrap';
import LinkifiedText from '../../LinkifiedText';
import React from 'react';

const styleProps = {
  highlighted: commsStyles["highlighted"],
  messages: commsStyles["message"],
}

interface IncomingMessagesProps {
  tutors?: Tutor[];
  authenticated: boolean;
  messages: IncomingMessage[];
  clickHandler: (payload: { id: string; btnLabel: IncommingButtonLabel; source: string }) => void;
  outlineHandler: (payload: { ids: string[] }) => void;
  dismissHandler: (payload: string) => void;
}

interface OutgoingMessagesProps {
  authenticated: boolean;
  messages: OutgoingMessage[];
  clickHandler: (payload: { id: string; btnLabel: OutgoingButtonLabel }) => void;
  outlineHandler: (payload: { ids: string[] }) => void;
  dismissHandler: (payload: string) => void;
}

export const Incoming: React.FC<IncomingMessagesProps> = ({
  messages,
  tutors = [],
  clickHandler,
  authenticated,
  dismissHandler,
  outlineHandler,
}) => {
  return (
    <div className={`hasBorders ${styleProps.messages}`}>
      {messages.map(({ id, title, text, footer, type, status, mailer, isHighlighted, mailers }) => {
        const { primary, danger, source } = status;
        const from = source.split("FROM").pop() || '';
        const Banner = inBanners[type + from as keyof typeof inBanners];
        const cardType = inVariants[type + from as keyof typeof inVariants];
        const textColor = cardType === "light" ? "dark" : "white";
        const classes = isHighlighted ? `mb-2 highlighted ${styleProps.highlighted}` : `mb-2`;
        const dpayload = { id: id + type, btnLabel: danger.label as IncommingButtonLabel, source };
        const ppayload = { id: id + type, btnLabel: primary.label as IncommingButtonLabel, source };
        const CurMailers = (mailers ?? [mailer]).map((id: number) => tutors.find(({ id: tutorId }) => tutorId === id)?.title).join(", ");
        return (
          <Alert
            dismissible
            key={id + type}
            variant={cardType}
            onClose={() => dismissHandler(id + type)}
          >
            <Alert.Heading>{Banner}</Alert.Heading>
            <Card
              bg={cardType}
              text={textColor}
              className={classes}
              onClick={() => outlineHandler({ ids: [id + type] })}
            >
              <Card.Header>
                {CurMailers}
              </Card.Header>
              <Card.Body>
                <Card.Title>{title}</Card.Title>
                <Card.Text>
                  <LinkifiedText text={text} />
                </Card.Text>
              </Card.Body>
              <Card.Footer className={`text-${textColor}`}>{footer}</Card.Footer>
            </Card>
            <hr />
            {authenticated && (
              <div className="d-flex justify-content-end">
                <Button
                  onClick={() => clickHandler(dpayload)}
                  variant={btnVariants[danger.label as keyof typeof btnVariants]}
                  disabled={danger.disabled}
                  className="mr-2"
                >
                  {danger.label}
                </Button>
                <Button
                  onClick={() => clickHandler(ppayload)}
                  variant={btnVariants[primary.label as keyof typeof btnVariants]}
                  disabled={primary.disabled}
                >
                  {primary.label}
                </Button>
              </div>
            )}
          </Alert>
        );
      })}
    </div>
  );
};

export const Outgoing: React.FC<OutgoingMessagesProps> = ({
  messages,
  clickHandler,
  authenticated,
  dismissHandler,
  outlineHandler,
}) => {
  return (
    <div className={`hasBorders ${styleProps.messages}`}>
      {messages.map(({
        id,
        text,
        type,
        title,
        status,
        footer,
        reciepients,
        isHighlighted,
      }) => {
        const { primary, danger } = status;
        const Banner = outBanners[type as keyof typeof outBanners];
        const cardType = outVariants[type as keyof typeof outVariants];
        const textColor = cardType === "light" ? "dark" : "white";
        const classes = isHighlighted ? `mb-2 highlighted ${styleProps.highlighted}` : `mb-2`;
        const dpayload = { id: id + type, btnLabel: danger.label as OutgoingButtonLabel };
        const ppayload = { id: id + type, btnLabel: primary.label as OutgoingButtonLabel };
        return (
          <Alert
            dismissible
            key={id + type}
            variant={cardType}
            onClose={() => dismissHandler(id + type)}
          >
            <Alert.Heading>{Banner}</Alert.Heading>
            <Card
              text={textColor}
              border={cardType}
              className={classes}
              onClick={() => outlineHandler({ ids: [id + type] })}
            >
              <Card.Header>{reciepients?.join(", ")}</Card.Header>
              <Card.Body>
                <Card.Title>{title}</Card.Title>
                <Card.Text>
                  <LinkifiedText text={text} />
                </Card.Text>
              </Card.Body>
              <Card.Footer className={`text-${textColor}`}>{footer}</Card.Footer>
            </Card>
            <hr />
            {authenticated && id > -1 && (
              <div className="d-flex justify-content-end">
                <Button
                  onClick={() => clickHandler(dpayload)}
                  variant={btnVariants[danger.label as keyof typeof btnVariants]}
                  disabled={danger.disabled}
                  className="mr-2"
                >
                  {danger.label}
                </Button>
                <Button
                  onClick={() => clickHandler(ppayload)}
                  variant={btnVariants[primary.label as keyof typeof btnVariants]}
                  disabled={primary.disabled}
                >
                  {primary.label}
                </Button>
              </div>
            )}
          </Alert>
        );
      })}
    </div>
  );
};

export default { Incoming, Outgoing }; 