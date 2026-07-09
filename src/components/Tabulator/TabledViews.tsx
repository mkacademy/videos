import React, { useEffect } from "react";
import { getSingular } from "../../utils";
import AnonymousTabulator from "./Anonymous/Screen";
import { useParams, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import PublicTabulator from "./Authenticated/public/Screen";
import PrivateTabulator from "./Authenticated/private/Screen";
import { ViewPayload, viewPayload as escrowPayload } from "../../store/slices/viewSlice";
import { mutateOperation } from "../../store/slices/sessionSlice";
import { RootState } from "../../store/types";

interface TabulatorProps {
    operation: string;
}

export const TabledViews: React.FC<TabulatorProps> = ({ operation }) => {
    const { target } = useParams<{ target: string }>();
    const dispatch = useDispatch();

    // Use one useSelector per prop as requested
    const isIncognito = useSelector((state: RootState) => state.session.isIncognito);
    const isPrivate = useSelector((state: RootState) => state.session.isPrivate);

    useEffect(() => {
        dispatch(mutateOperation(operation));
    }, [operation]);

    const cacheTarget = (payload: ViewPayload) => dispatch(escrowPayload(payload));
    const isEntity = target ? getSingular(target) !== undefined : false;

    useEffect(() => {
        if (isEntity && target) setTimeout(() => cacheTarget({ entity: target }));
    }, [isEntity, target]);
    if (isEntity && isIncognito && target)
        return <AnonymousTabulator key={target} />;
    else if (isEntity && !isIncognito && !isPrivate && target)
        return <PublicTabulator key={target} />;
    else if (isEntity && !isIncognito && isPrivate && target)
        return <PrivateTabulator key={target} operation={operation} />;
    else
        return <Navigate to="/settings" replace />;

};
