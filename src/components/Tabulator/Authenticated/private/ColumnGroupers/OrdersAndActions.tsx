import React from "react";
import CrudColumn from "../TableColumns/CrudColumn";
import OrderColumn from "../TableColumns/OrderColumn";
import * as descendantsWrapper from "../../../../../styles/descendantsWrapper.module.css";
import * as orderAndActions from "../../../../../styles/orderAndActions.module.css";

const tablesCSS = (classNames: string) => {
  return `${classNames === orderAndActions["FlexTablePlusActions"]
    ? orderAndActions["FlexTablePlusActions"]
    : orderAndActions["notFlexTablePlusActions"]
    }`
}

interface OrdersAndActionsProps {
  entity: string;
  padCount: number;
  FlexTable?: string;
}

const OrdersAndActions: React.FC<OrdersAndActionsProps> = (props) => {
  const { FlexTable, entity, padCount } = props;
  const styles = descendantsWrapper["HorizantolFlex"] + " " + orderAndActions["tablesCSS"]
  const isFlexTable = FlexTable && FlexTable.includes(orderAndActions["FlexTablePlusActions"])
  return (
    <React.Fragment>
      {FlexTable && isFlexTable && (
        <div className={styles + " " + tablesCSS(FlexTable)}>
          <div>
            <OrderColumn title="Order" padCount={padCount} />
          </div>
          <div>
            <CrudColumn entity={entity} padCount={padCount} />
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default OrdersAndActions;
