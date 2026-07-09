import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Col, Form, Image, Row } from "react-bootstrap";
import IconsWidget from "../navbar/IconsWidget";
import { queryString, DOWNWARDS, UPWARDS } from "../../utils";
import { RootState } from "../../store/types";
import { Row as RowItem } from "../../store/slices/rowSlice";
import { IconKey } from "../../Hooks/useIconsAssembler";

// Redux action imports
import { viewLoading, viewPage } from "../../store/slices/viewSlice";
import { selectContent as contentPicker } from "../../store/slices/contentSlice";
import {
    mutateAppend,
    togglePagination,
} from "../../store/slices/sessionSlice";
import { initLoading, InitLoadingPayload } from "../../library/actions";
import { selectRows as tabularPicker } from "../../store/slices/rowSlice";
import { removeRows as tabulatorClearer } from "../../store/slices/rowSlice";
import { removeContent as contentsClearer } from "../../store/slices/contentSlice";
import * as styles from "../../styles/TableViewPager.module.css";

const badge = new URL("../../Images/badge.png", import.meta.url).href;
const ticked = new URL("../../Images/ticked.png", import.meta.url).href;
const unticked = new URL("../../Images/unticked.png", import.meta.url).href;

const stylesProps = {
    tableviewpager: styles["tableviewpager"],
    moreBtnSyles: styles["moreBtnSyles"],
    filterBadgeContainer: styles["filterBadgeContainer"],
    paginationContainer: styles["paginationContainer"],
    skipContainer: styles["skipContainer"],
    takeContainer: styles["takeContainer"],
    btnContainer: styles["btnContainer"],
    btnFlex: styles["btnFlex"],
    filterBadge: styles["filterBadge"],
    btn: styles["btn"],
    btnOutlineLight: styles['btn-outline-light'],
    btnOutlineWarning: styles['btn-outline-warning'],
    row: styles["row"],
    colLg2: styles["col-lg-2"],
    formControlSm: styles["form-control-sm"],
}

// Types
interface QueryParams {
    seek?: string;
    skip: number;
    take: number;
}

interface FormData {
    jump: string;
    grab: string;
}

interface TableViewPagerProps {
    icons?: Record<IconKey, string>;
    operation: string;
    isLoading?: boolean;
}

export const getValidParams = (search: string, defaultTake: number): QueryParams => {
    const { seek, take, skip } = queryString(search);
    if (skip === undefined || take === undefined || isNaN(Number(skip)) || isNaN(Number(take))) {
        if (seek === undefined)
            return { skip: 0, take: defaultTake };
        return { skip: 0, take: defaultTake, seek };
    }
    const parsedtake = parseInt(take);
    const parsedskip = parseInt(skip);
    const validskip = parsedskip >= 0;
    const validtake = parsedtake > 0 && parsedtake <= 100;
    if (validskip && validtake && seek)
        return {
            seek,
            skip: parsedskip,
            take: parsedtake,
        };
    else if (validskip && validtake)
        return {
            skip: parsedskip,
            take: parsedtake,
        };
    else
        return seek
            ? { skip: 0, take: defaultTake, seek }
            : { skip: 0, take: defaultTake };
};

const TableViewPager: React.FC<TableViewPagerProps> = ({
    icons,
    operation,
    isLoading,
}) => {
    const dispatch = useDispatch();
    const { pathname, search } = useLocation();
    const navigate = useNavigate();

    // Individual useSelector hooks for each prop
    const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
    const bottom = useSelector((state: RootState) => state.session.bottomPagination);
    const isFetching = useSelector((state: RootState) => state.view.isFetching);
    const top = useSelector((state: RootState) => state.session.topPagination);
    const curApp = useSelector((state: RootState) => state.session.curApp);
    const Items = useSelector((state: RootState) => state.row);

    const goBack = operation.startsWith(UPWARDS);
    const [checked, setChecked] = useState<boolean>(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<FormData>({
        defaultValues: {
            jump: "",
            grab: "",
        },
    });
    const queryParams = getValidParams(search, defaultTake);
    const selectedIds = Items.filter((key: RowItem) => key.checked).map((key: RowItem) => key.id);
    const { seek, skip, take } = queryParams;
    const showForm = goBack ? top : bottom;

    useEffect(() => {
        reset({
            jump: skip.toString(),
            grab: take.toString(),
        });
    }, [reset, skip, take]);

    const onSubmit = (data: FormData) => {
        const { jump, grab } = data;
        dispatch(viewLoading());
        dispatch(mutateAppend(!goBack));
        if (!showForm) {
            const pskip = parseInt(jump);
            const ptake = parseInt(grab);
            const nextskip = goBack ? pskip - ptake : pskip + ptake;
            const val = nextskip > 0 ? nextskip : 0;
            const curParams = seek
                ? `?seek=${seek}&skip=${val}&take=${queryParams.take}`
                : `?skip=${val}&take=${queryParams.take}`;
            navigate(`${pathname}${curParams}`, { replace: true });
            dispatch(viewPage(`${val}-${queryParams.take}`));
        } else {
            const curParams = seek
                ? `?seek=${seek}&skip=${jump}&take=${grab}`
                : `?skip=${jump}&take=${grab}`;
            navigate(`${pathname}${curParams}`, { replace: true });
            dispatch(viewPage(`${jump}-${grab}`));
        }
    };

    const onTicked = (data: FormData) =>
        setChecked((prev) => {
            const checked = !prev;
            const { start, end } = {
                start: parseInt(data.jump),
                end: parseInt(data.grab),
            };
            const range = Items.slice(start, end);
            const pred = (r: RowItem) => ({ ...r, checked: checked });
            setTimeout(() => {
                const mappedRange = range.map(pred);
                dispatch(tabularPicker(mappedRange));
                dispatch(contentPicker(mappedRange.map(item => ({ ...item, id: parseInt(item.id) }))));
            });
            return checked;
        });

    const vanquish = (selectedIds: string[]) => {
        dispatch(tabulatorClearer(selectedIds));
        dispatch(contentsClearer(selectedIds.map(id => parseInt(id))));
    };

    const showPagination = (payload: { showForm: boolean; direction: string }) => {
        dispatch(togglePagination(payload));
    };

    const preserveIngredients = (payload: InitLoadingPayload) => {
        dispatch(initLoading(payload));
    };
    return (
        <React.Fragment>
            {!showForm ? (
                <Row className={stylesProps.moreBtnSyles}>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Button
                            type="submit"
                            variant="outline-light"
                            disabled={isLoading || isFetching}
                            className={stylesProps.btn + " " + stylesProps.btnOutlineLight}
                        >
                            <div
                                className={stylesProps.filterBadgeContainer}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    showPagination({
                                        showForm: !showForm,
                                        direction: goBack ? UPWARDS : DOWNWARDS,
                                    });
                                    e.nativeEvent.stopImmediatePropagation();
                                }}
                            ></div>
                        </Button>
                        <input type="hidden" {...register("jump")} />
                        <input type="hidden" {...register("grab")} />
                    </form>
                </Row>
            ) : (
                <div className={stylesProps.tableviewpager + " " + operation}>
                    <Form onSubmit={handleSubmit(onSubmit)}>
                        <Row className={stylesProps.paginationContainer + " " + stylesProps.row}>
                            <Col className={stylesProps.skipContainer + ' ' + stylesProps.colLg2} xs={6} md={3} lg={2}>
                                <Form.Control
                                    size="sm"
                                    className={stylesProps.formControlSm}
                                    type="text"
                                    {...register("jump", {
                                        validate: (v: string) => parseInt(v) > -1,
                                    })}
                                />
                            </Col>
                            <Col className={stylesProps.takeContainer + ' ' + stylesProps.colLg2} xs={6} md={3} lg={2}>
                                <Form.Control
                                    size="sm"
                                    className={stylesProps.formControlSm}
                                    type="text"
                                    {...register("grab", {
                                        validate: {
                                            positive: (v: string) => parseInt(v) > 0,
                                            lessThanHundred: (v: string) => parseInt(v) < 100,
                                        },
                                    })}
                                />
                            </Col>
                            <Col className={stylesProps.btnContainer + ' ' + stylesProps.colLg2} xs={6} md={3} lg={2}>
                                <Button
                                    className={stylesProps.btn + " " + stylesProps.btnOutlineWarning}
                                    variant="outline-warning"
                                    onClick={() => {
                                        setChecked(false);
                                        vanquish(selectedIds);
                                    }}
                                >
                                    <div className={stylesProps.btnFlex}>
                                        <span>Clear</span>
                                        <div
                                            className={stylesProps.filterBadgeContainer}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleSubmit(onTicked)();
                                                e.nativeEvent.stopImmediatePropagation();
                                            }}
                                        >
                                            <Image
                                                className={stylesProps.filterBadge}
                                                src={checked ? ticked : unticked}
                                            />
                                        </div>
                                    </div>
                                </Button>
                            </Col>
                            <Col className={stylesProps.btnContainer + ' ' + stylesProps.colLg2} xs={6} md={3} lg={2}>
                                <Button
                                    type="submit"
                                    variant="outline-light"
                                    disabled={isLoading || isFetching}
                                    className={stylesProps.btn + " " + stylesProps.btnOutlineLight}
                                >
                                    <div className={stylesProps.btnFlex}>
                                        <span>Fetch</span>
                                        <div
                                            className={stylesProps.filterBadgeContainer}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                showPagination({
                                                    showForm: !showForm,
                                                    direction: goBack ? UPWARDS : DOWNWARDS,
                                                });
                                                e.nativeEvent.stopImmediatePropagation();
                                            }}
                                        >
                                            <Image
                                                className={stylesProps.filterBadge}
                                                src={badge}
                                                roundedCircle
                                            />
                                        </div>
                                    </div>
                                </Button>
                            </Col>
                            <Col xs={12} lg={2} className={stylesProps.colLg2}>
                                <IconsWidget
                                    inline
                                    icons={icons}
                                    curApp={curApp}
                                    defaultTake={defaultTake}
                                    preserveIngredients={preserveIngredients}
                                />
                            </Col>
                        </Row>
                        {errors.jump && (
                            <React.Fragment>
                                <span>skip value is invalid</span> <br />
                            </React.Fragment>
                        )}
                        {errors.grab && <span>take value is invalid</span>}
                    </Form>
                </div>
            )}
        </React.Fragment>
    );
};

export default TableViewPager;
