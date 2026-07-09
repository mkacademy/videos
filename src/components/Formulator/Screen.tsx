import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { Carousel, Col, Container, Form, Row } from "react-bootstrap";
import { FieldValues } from "react-hook-form";
import FormFields from "./FormFields";
import useMediaQuery, { setProgrammaticNavigation } from "../../Hooks/useQueryMedia";
import useFormsBuilder, { Entity } from "../../Hooks/useFormsBuilder";
import useScreensBuilder, { ScreenBuilderTypes } from "../../Hooks/useScreensBuilder";
import { globalVars } from "../../utils";
import { appendRowz, appendRows } from "../../store/slices/rowSlice";
import { updateTexts, UpdateTextsPayload } from "../../store/slices/textSlice";
import { SaveAndCancelBtns } from "../Tabulator/Authenticated/private/TableWidgets/SaveAndResumeBtns";
import { fetchRows } from "../../library/actions";
import { RootState } from "../../store/types";
import * as styles from "../../styles/Formulator.module.css";
import * as indicatorsStyles from "../../styles/indicators.module.css";
import { EntityTypeMap } from "../../store/slices/rowSlice";
import { DataRow } from "../Core/types";
import { AppGlobal } from "../views/wrappers/appGlobal";

const isDev = process.env.NODE_ENV === 'development';

const stylesProps = {
    formulator: styles["formulator"],
    entityName: styles["entityName"],
    colXl4: styles["col-xl-4"],
    tooLarge: styles["tooLarge"],
    greyBar: styles["greyBar"],
    forms: styles["forms"],
    carousel: styles["carousel"],
    formScreenIndicatorsCSS: indicatorsStyles["formScreenIndicatorsCSS"],
    largeScreenIndicators: indicatorsStyles["largeScreenIndicatorsCSS"],
}

const chunkSizes = [1, 1, 1, 2, 3, 3, 3];

interface LocationState {
    editID?: string;
}

const Screen: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const navigationType = useNavigationType();
    const { entity: urlEntity } = useParams<{ entity: string }>();

    // Individual useSelector hooks for each prop
    const isAppend = useSelector((state: RootState) => state.session.isAppend);
    const IDs = useSelector((state: RootState) => state.view.parentData?.IDs);
    const crudUrl = useSelector((state: RootState) => state.session.crudUrl);
    const parent = useSelector((state: RootState) => state.view.parent);
    const entity = useSelector((state: RootState) => state.view.entity);
    const texts = useSelector((state: RootState) => state.text);
    const rows = useSelector((state: RootState) => state.row);

    const [isWaiting, setIsWaiting] = useState<boolean>(false);
    const paddingForm = useMemo(() => ({ length: 0 }), []);

    const { globallyUniqueIDs } = globalVars;
    const { screen: screenIndex } = useMediaQuery();
    const pred = (row: Entity, i: number) => ({ ["_" + i]: row });
    const { editID } = (location.state as LocationState) ?? {};
    const restoreData = () => dispatch(fetchRows({ type: appendRowz.type }));
    // Restore data effect
    useEffect(() => { if (crudUrl) restoreData(); }, [crudUrl]);
    const formEntity = urlEntity ?? entity;
    // Redirect if browser back/forward button used
    if (navigationType === 'POP' || !formEntity) return <Navigate to="/settings" />;
    // Custom append function that combines the mergeProps logic
    const appendData = (entity: string, parent: string | undefined, payload: DataRow[]) => {
        dispatch(appendRows({ entity: entity as keyof EntityTypeMap, parent, payload, isAppend }));
    };
    const updateData = (payload: UpdateTextsPayload[]) => dispatch(updateTexts(payload));


    const parameters = {
        IDs,
        rows,
        texts,
        parent,
        editID,
        appendData,
        updateData,
        paddingForm,
        entity: formEntity,
    };

    const builds = useFormsBuilder(parameters);
    const [selecteds, isTooLarge, submit, formKeys, formhooks, isMted] = builds;
    const contents = useMemo(() => selecteds.map(pred), [selecteds]);
    const [chunks, activeIndex, handleSelect] = useScreensBuilder(
        screenIndex,
        chunkSizes,
        contents
    );
    const goBackUrl = () => {
        setProgrammaticNavigation();
        navigate(-1);
    };
    const { register, handleSubmit, errors, watch } = formhooks;
    const isRequired = selecteds.length ? true : false;
    const lastChunkLen =
        chunks.length > 0 ? Object.keys(chunks[chunks.length - 1]).length : 0;
    paddingForm.length = Math.abs(lastChunkLen - chunkSizes[screenIndex]);
    const onSubmit = async (data: FieldValues) => {
        setIsWaiting(true);
        const result = await submit(data);
        if (isDev && isMted.current > 1 || !isDev && isMted.current > 0) return;
        return result ? goBackUrl() : setIsWaiting(false);
    };
    const classes = [stylesProps.formulator, stylesProps.formScreenIndicatorsCSS, stylesProps.largeScreenIndicators];
    watch();
    return (
        <AppGlobal>
            <Container>
                <Form onSubmit={handleSubmit(onSubmit)} className={classes.join(" ")}>
                    <span className={stylesProps.entityName}>{entity}</span>
                    <div className={stylesProps.greyBar}></div>
                    <Carousel
                        indicatorLabels={chunks.map(() => 'carousel-indicator')}
                        indicators={chunks.length > 1}
                        activeIndex={activeIndex}
                        onSelect={handleSelect}
                        controls={false}
                        interval={null}
                        touch={false}
                        slide={false}
                        className={stylesProps.carousel}
                    >
                        {chunks.length > 0 ? (
                            chunks.map((rows: Record<string, ScreenBuilderTypes>, k: number) => {
                                const forms = Object.keys(rows);
                                return (
                                    <Carousel.Item key={k}>
                                        <Row className={stylesProps.forms}>
                                            <React.Fragment>
                                                {forms.map((key: string, i: number) => (
                                                    <Col key={i} sm={12} lg={6} xl={4} className={stylesProps.colXl4}>
                                                        <FormFields
                                                            {...formKeys}
                                                            errors={errors}
                                                            register={register}
                                                            required={isRequired}
                                                            {...texts[(rows[key] as Entity).index ?? 0]}
                                                            id={texts[(rows[key] as Entity).index ?? 0]?.id?.toString() || ""}
                                                        />
                                                    </Col>
                                                ))}
                                            </React.Fragment>
                                            <React.Fragment>
                                                {forms.length - chunkSizes[screenIndex] < 0 &&
                                                    Array.from(paddingForm).map((_, i: number) => (
                                                        <Col key={i} sm={12} lg={6} xl={4} className={stylesProps.colXl4}>
                                                            <FormFields
                                                                {...formKeys}
                                                                errors={errors}
                                                                required={false}
                                                                register={register}
                                                                id={(globallyUniqueIDs - i - 1).toString()}
                                                            />
                                                        </Col>
                                                    ))}
                                            </React.Fragment>
                                        </Row>
                                    </Carousel.Item>
                                );
                            })
                        ) : (
                            <Carousel.Item>
                                <Row className={stylesProps.forms}>
                                    <React.Fragment>
                                        {Array.from(paddingForm).map((_, i: number) => (
                                            <Col key={i} sm={12} lg={6} xl={4} className={stylesProps.colXl4}>
                                                <FormFields
                                                    {...formKeys}
                                                    errors={errors}
                                                    required={false}
                                                    register={register}
                                                    id={(globallyUniqueIDs - i - 1).toString()}
                                                />
                                            </Col>
                                        ))}
                                    </React.Fragment>
                                </Row>
                            </Carousel.Item>
                        )}
                    </Carousel>
                    {isTooLarge && (
                        <div className={stylesProps.tooLarge}>
                            <span>{isTooLarge.max}</span>
                            <span>{isTooLarge.total}</span>
                        </div>
                    )}
                    <div className={stylesProps.greyBar}></div>
                    <SaveAndCancelBtns disabled={isWaiting} onCancel={goBackUrl} />
                </Form>
            </Container>
        </AppGlobal>
    );
};

export default Screen;
