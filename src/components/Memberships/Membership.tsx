import React from "react";
import { Button } from "react-bootstrap";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import * as pricingTablesStyles from "../../styles/pricingTables.module.css";    

const stylesProps = {
    plan: pricingTablesStyles["plan"],
    popular: pricingTablesStyles["popular"],
    price: pricingTablesStyles["price"],
    features: pricingTablesStyles["features"],
    fas: pricingTablesStyles["fas"],
    faTimesCircle: pricingTablesStyles["fa-times-circle"],
    faCheckCircle: pricingTablesStyles["fa-check-circle"],
}

interface PredicateParams {
    approvals: string | number;
    mb: string | number;
}

interface MembershipProps {
    price: string | number;
    Active: boolean;
    btnTxt: string;
    heading: string;
    checked: number;
    features: string[];
    approvals: number;
    mb:  number;
}

const predicate =
    ({ approvals, mb }: PredicateParams) =>
        (feature: string): string =>
            feature.replace("[m]", String(mb)).replace("[n]", String(approvals));

const Membership: React.FC<MembershipProps> = ({
    price,
    Active,
    btnTxt,
    heading,
    checked,
    features,
    approvals,
    mb,
}) => {
    const included = features.slice(0, checked);
    const btnText = Active ? "Enter" : btnTxt;
    const excluded = features.slice(checked);

    return (
        <div className={Active ? stylesProps.plan + " " + stylesProps.popular : stylesProps.plan}>
            {Active && <span>Active</span>}
            <h2>{heading}</h2>
            <div className={stylesProps.price}>{price}</div>
            <ul className={stylesProps.features}>
                {included.map(predicate({ approvals, mb })).map((feature: string, i: number) => (
                    <li key={i}>
                        <FaCheckCircle color="#6ab04c" className={stylesProps.fas + " " + stylesProps.faCheckCircle} /> <i></i> {feature}
                    </li>
                ))}
                {excluded.map((feature: string, i: number) => (
                    <li key={i}>
                        <FaTimesCircle color="#eb4d4b" className={stylesProps.fas + " " + stylesProps.faTimesCircle} /> <i></i> {feature}
                    </li>
                ))}
            </ul>
            <Button>{btnText}</Button>
        </div>
    );
};

export default Membership;
