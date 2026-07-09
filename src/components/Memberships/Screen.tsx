import React from "react";
import Membership from "./Membership";
import UiShortcuts from "../navbar/UiShortcuts";
import { Col, Container, Row } from "react-bootstrap";
import RoleToggler from "../Tabulator/Authenticated/private/TableWidgets/RoleToggler";
import { PricingGlobal } from "../views/wrappers/pricingGlobal";
import * as pricingTablesStyles from "../../styles/pricingTables.module.css";
import * as styles from "../../styles/shortcuts.module.css";

const stylesProps = {
  pricingTables: pricingTablesStyles["pricingTables"],
  headerTitle: pricingTablesStyles["headerTitle"],
  pricing: pricingTablesStyles["pricing"],
  col12: pricingTablesStyles["col-12"],
}

interface PricingPlan {
  mb: number;
  features: string[];
  checked: number;
  Active: boolean;
  approvals: number;
  price: string;
  btnTxt: string;
  heading: string;
}

const features: string[] = [
  "[m] MB per Month",
  "[n] approvals per day",
  "24/7 account support",
  "email notifications",
];

const state: PricingPlan[] = [
  {
    mb: 1,
    features,
    checked: 2,
    Active: true,
    approvals: 1,
    price: "FREE",
    btnTxt: "Signup",
    heading: "Student",
  },
  {
    mb: 10,
    features,
    checked: 3,
    approvals: 5,
    Active: false,
    btnTxt: "Buy Now",
    heading: "Teacher",
    price: "$1.99/month",
  },
  {
    mb: 50,
    features,
    checked: 4,
    Active: false,
    approvals: 20,
    btnTxt: "Buy Now",
    price: "$4.99/month",
    heading: "Professional",
  },
];

const Screen: React.FC = () => {
  return (
    <PricingGlobal>
      <React.Fragment>
        <Container className={stylesProps.pricingTables}>
          <Row >
            <Col xs={12} className={stylesProps.col12}>
              <h1 className={stylesProps.headerTitle}>Choose Your Pricing Plan</h1>
            </Col>
            {state.map((priceTable: PricingPlan, i: number) => (
              <Col xs={12} lg={4} key={i} className={stylesProps.pricing + " " + stylesProps.col12}>
                <Membership {...priceTable} />
              </Col>
            ))}
          </Row>
        </Container>
        <UiShortcuts convCss={styles["carders"]} loading={false} skeletons={false}/>
        <RoleToggler isRolePicker={false} />
      </React.Fragment>
    </PricingGlobal>
  );
};

export default Screen;
