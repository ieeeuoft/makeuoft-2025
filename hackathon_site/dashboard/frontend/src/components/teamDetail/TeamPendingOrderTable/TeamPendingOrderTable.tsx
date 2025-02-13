import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    Link,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@material-ui/core";
import { OrderStatus } from "api/types";
import React, { useState } from "react";
import Container from "@material-ui/core/Container";
import styles from "components/general/OrderTables/OrderTables.module.scss";
import hardwareImagePlaceholder from "assets/images/placeholders/no-hardware-image.svg";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import {
    GeneralOrderTableTitle,
    GeneralOrderTitle,
} from "components/general/OrderTables/OrderTables";
import { Formik, FormikValues } from "formik";
import { useDispatch, useSelector } from "react-redux";
import {
    getCreditsUsedSelector,
    isLoadingSelector,
    pendingOrdersSelector,
    UpdateOrderAttributes,
    updateOrderStatus,
} from "slices/order/teamOrderSlice";
import { hardwareSelectors } from "slices/hardware/hardwareSlice";
import { teamStartingCreditsSelector } from "slices/event/teamDetailSlice";

const createDropdownList = (number: number) => {
    let entry = [];

    for (let i = 0; i <= number; i++) {
        entry.push(
            <MenuItem key={i} role="quantity" value={i.toString()}>
                {i}
            </MenuItem>
        );
    }

    return entry;
};

const setInitialValues = (
    request: { id: number; quantityRequested: number; quantityGranted: number }[]
) => {
    let orderInitialValues: Record<string, string | boolean> = {};
    request.forEach((orderItem) => {
        orderInitialValues[`${orderItem.id}-quantity`] =
            orderItem.quantityGranted.toString();
        orderInitialValues[`${orderItem.id}-checkbox`] = false;
    });
    return orderInitialValues;
};

export const TeamPendingOrderTable = () => {
    const dispatch = useDispatch();
    const orders = useSelector(pendingOrdersSelector);
    const hardware = useSelector(hardwareSelectors.selectEntities);
    const isLoading = useSelector(isLoadingSelector);
    const [visibility, setVisibility] = useState(true);
    const creditsAvailable = useSelector(teamStartingCreditsSelector);
    const creditsUsed = useSelector(getCreditsUsedSelector);
    const creditsRemaining = creditsAvailable ? creditsAvailable - creditsUsed : 0;
    const [showRejectDialog, setShowRejectDialog] = useState<boolean>(false);
    const [cancelMsg, setCancelMsg] = useState<string>("");
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

    const [selectedQuantities, setSelectedQuantities] = useState<
        Record<number, number>
    >({});

    const handleQuantityChange = (rowId: number, value: unknown) => {
        const parsedValue =
            typeof value === "string"
                ? parseInt(value, 10) || 0
                : typeof value === "number"
                ? value
                : 0;

        setSelectedQuantities((prev: Record<number, number>) => ({
            ...prev,
            [rowId]: parsedValue,
        }));
    };

    const toggleVisibility = () => {
        setVisibility(!visibility);
    };

    const updateOrder = (
        orderId: number,
        status: OrderStatus,
        values: FormikValues | null = null,
        cancellationMessage?: string
    ) => {
        const updateOrderData: UpdateOrderAttributes = {
            id: orderId,
            status,
            request: [],
        };

        // If a cancellation message is provided, add it.
        if (cancellationMessage) {
            updateOrderData.cancellation_message = cancellationMessage;
        }

        if (values) {
            const request: Array<{ id: number; requested_quantity: number }> = [];
            const formikKeys = Object.keys(values);
            for (let i = 0; i < formikKeys.length; i += 2) {
                const hardwareId = parseInt(formikKeys[i].split("-")[0]);
                request.push({
                    id: hardwareId,
                    requested_quantity: values[formikKeys[i + 1]]
                        ? parseInt(values[formikKeys[i]])
                        : 0,
                });
            }
            updateOrderData.request = request;
        }

        dispatch(updateOrderStatus(updateOrderData));
    };

    return (
        <Container
            className={styles.tableContainer}
            maxWidth={false}
            disableGutters={true}
        >
            {orders.length > 0 && (
                <GeneralOrderTitle
                    title="Requested Items"
                    isVisible={visibility}
                    toggleVisibility={toggleVisibility}
                />
            )}
            {visibility &&
                orders.length > 0 &&
                orders.map((pendingOrder) => (
                    <Formik
                        initialValues={setInitialValues(
                            pendingOrder.hardwareInTableRow
                        )}
                        onSubmit={(values) =>
                            updateOrder(pendingOrder.id, "Ready for Pickup", values)
                        }
                        key={pendingOrder.id}
                    >
                        {(props) => {
                            // Calculate the order credit subtotal by iterating over each row.
                            const orderTotalCredits =
                                pendingOrder.hardwareInTableRow.reduce((sum, row) => {
                                    // Use selected quantity if available; otherwise, use the default quantityGrantedBySystem.
                                    const selectedQty =
                                        selectedQuantities[row.id] !== undefined
                                            ? selectedQuantities[row.id]
                                            : row.quantityGrantedBySystem;
                                    // Get the credits per unit for this hardware item.
                                    const creditsPerUnit =
                                        hardware[row.id]?.credits ?? 0;
                                    return sum + selectedQty * creditsPerUnit;
                                }, 0);
                            return (
                                <form onSubmit={props.handleSubmit}>
                                    <div key={pendingOrder.id}>
                                        <GeneralOrderTableTitle
                                            orderId={pendingOrder.id}
                                            orderStatus={pendingOrder.status}
                                            overLimit={creditsRemaining < 0}
                                        />
                                        <TableContainer
                                            component={Paper}
                                            elevation={2}
                                            square={true}
                                        >
                                            <Table
                                                className={styles.table}
                                                size="small"
                                            >
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell
                                                            className={
                                                                styles.widthFixed
                                                            }
                                                        />
                                                        <TableCell
                                                            className={styles.width6}
                                                        >
                                                            Name
                                                        </TableCell>
                                                        <TableCell
                                                            className={`${styles.width1} ${styles.noWrap}`}
                                                        >
                                                            Model
                                                        </TableCell>
                                                        <TableCell
                                                            className={`${styles.width1} ${styles.noWrap}`}
                                                        >
                                                            Manufacturer
                                                        </TableCell>
                                                        <TableCell
                                                            className={`${styles.width1} ${styles.noWrap}`}
                                                        >
                                                            💳 Credits
                                                        </TableCell>
                                                        <TableCell
                                                            className={`${styles.width1} ${styles.noWrap}`}
                                                        >
                                                            Qty requested
                                                        </TableCell>
                                                        <TableCell
                                                            className={`${styles.width1} ${styles.noWrap}`}
                                                        >
                                                            Qty granted by system
                                                        </TableCell>
                                                        <TableCell
                                                            className={`${styles.width6} ${styles.noWrap}`}
                                                        >
                                                            Qty granted
                                                        </TableCell>
                                                        <TableCell
                                                            className={`${styles.width1} ${styles.noWrap}`}
                                                        >
                                                            {pendingOrder.status ===
                                                                "Submitted" && (
                                                                <Checkbox
                                                                    color="primary"
                                                                    data-testid={`checkall-${pendingOrder.id}`}
                                                                    onChange={(e) => {
                                                                        pendingOrder.hardwareInTableRow.forEach(
                                                                            (row) => {
                                                                                props.setFieldValue(
                                                                                    `${row.id}-checkbox`,
                                                                                    e
                                                                                        .target
                                                                                        .checked
                                                                                );
                                                                            }
                                                                        );
                                                                    }}
                                                                />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {pendingOrder.hardwareInTableRow.map(
                                                        (row) => {
                                                            const selectedQuantity =
                                                                selectedQuantities[
                                                                    row.id
                                                                ] ??
                                                                row.quantityGrantedBySystem;
                                                            const creditsPerUnit =
                                                                hardware[row.id]
                                                                    ?.credits ?? 0;
                                                            const totalCredits =
                                                                selectedQuantity *
                                                                creditsPerUnit;

                                                            return (
                                                                <TableRow
                                                                    key={row.id}
                                                                    data-testid={`table-${pendingOrder.id}-${row.id}`}
                                                                >
                                                                    <TableCell>
                                                                        <img
                                                                            className={
                                                                                styles.itemImg
                                                                            }
                                                                            src={
                                                                                hardware[
                                                                                    row
                                                                                        .id
                                                                                ]
                                                                                    ?.picture ??
                                                                                hardware[
                                                                                    row
                                                                                        .id
                                                                                ]
                                                                                    ?.image_url ??
                                                                                hardwareImagePlaceholder
                                                                            }
                                                                            alt={
                                                                                hardware[
                                                                                    row
                                                                                        .id
                                                                                ]?.name
                                                                            }
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {
                                                                            hardware[
                                                                                row.id
                                                                            ]?.name
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {
                                                                            hardware[
                                                                                row.id
                                                                            ]
                                                                                ?.model_number
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {
                                                                            hardware[
                                                                                row.id
                                                                            ]
                                                                                ?.manufacturer
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell
                                                                        style={{
                                                                            textAlign:
                                                                                "right",
                                                                            color: "#5a6f94",
                                                                        }}
                                                                    >
                                                                        {totalCredits}
                                                                    </TableCell>
                                                                    <TableCell
                                                                        style={{
                                                                            textAlign:
                                                                                "right",
                                                                        }}
                                                                    >
                                                                        {
                                                                            row.quantityRequested
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell
                                                                        style={{
                                                                            textAlign:
                                                                                "right",
                                                                        }}
                                                                    >
                                                                        {
                                                                            row.quantityGrantedBySystem
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {pendingOrder.status ===
                                                                            "Submitted" && (
                                                                            <div
                                                                                style={{
                                                                                    display:
                                                                                        "flex",
                                                                                    alignItems:
                                                                                        "end",
                                                                                }}
                                                                            >
                                                                                <Link
                                                                                    underline="always"
                                                                                    color="textPrimary"
                                                                                    style={{
                                                                                        marginRight:
                                                                                            "15px",
                                                                                    }}
                                                                                    data-testid={`all-button`}
                                                                                    onClick={() => {
                                                                                        props.setFieldValue(
                                                                                            `${row.id}-quantity`,
                                                                                            row.quantityGrantedBySystem
                                                                                        );
                                                                                        handleQuantityChange(
                                                                                            row.id,
                                                                                            row.quantityGrantedBySystem
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    All
                                                                                </Link>
                                                                                <Select
                                                                                    value={
                                                                                        selectedQuantity
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) => {
                                                                                        props.handleChange(
                                                                                            e
                                                                                        );
                                                                                        handleQuantityChange(
                                                                                            row.id,
                                                                                            e
                                                                                                .target
                                                                                                .value ??
                                                                                                0
                                                                                        );
                                                                                    }}
                                                                                    label="Qty"
                                                                                    labelId="qtyLabel"
                                                                                    name={`${row.id}-quantity`}
                                                                                    id={`${row.id}-quantity`}
                                                                                    data-testid={`select`}
                                                                                >
                                                                                    {createDropdownList(
                                                                                        row.quantityGrantedBySystem
                                                                                    )}
                                                                                </Select>
                                                                            </div>
                                                                        )}
                                                                        {pendingOrder.status ===
                                                                            "Ready for Pickup" && (
                                                                            <p
                                                                                style={{
                                                                                    textAlign:
                                                                                        "center",
                                                                                    ...(row.quantityGranted <
                                                                                        row.quantityGrantedBySystem && {
                                                                                        fontWeight:
                                                                                            "bold",
                                                                                        backgroundColor:
                                                                                            "#c1edc1",
                                                                                    }),
                                                                                }}
                                                                            >
                                                                                {
                                                                                    row.quantityGranted
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell align="center">
                                                                        {pendingOrder.status ===
                                                                            "Submitted" && (
                                                                            <Checkbox
                                                                                color="primary"
                                                                                checked={
                                                                                    props
                                                                                        .values[
                                                                                        `${row.id}-checkbox`
                                                                                    ] ===
                                                                                    true
                                                                                }
                                                                                name={`${row.id}-checkbox`}
                                                                                onChange={
                                                                                    props.handleChange
                                                                                }
                                                                                data-testid={`${row.id}-checkbox`}
                                                                            />
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        }
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                        {/* New Credit Subtotal Display */}
                                        <Grid
                                            container
                                            justifyContent="flex-end"
                                            style={{
                                                marginTop: "10px",
                                                marginRight: "10px",
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle1"
                                                color="textPrimary"
                                            >
                                                Credits Used: 💳 {orderTotalCredits}
                                            </Typography>
                                        </Grid>
                                        <Grid
                                            container
                                            justifyContent="flex-end"
                                            spacing={1}
                                            style={{ marginTop: "10px" }}
                                        >
                                            <Grid item style={{ marginTop: "5px" }}>
                                                <Typography variant="body2">
                                                    Note: participants will receive an
                                                    email every time you change the
                                                    status of their order.
                                                </Typography>
                                            </Grid>
                                            {pendingOrder.status === "Submitted" && (
                                                <Grid item>
                                                    <Button
                                                        onClick={() => {
                                                            setSelectedOrderId(
                                                                pendingOrder.id
                                                            );
                                                            setShowRejectDialog(true);
                                                        }}
                                                        disabled={isLoading}
                                                        color="secondary"
                                                        variant="text"
                                                        disableElevation
                                                    >
                                                        Reject Order
                                                    </Button>
                                                </Grid>
                                            )}
                                            {pendingOrder.status ===
                                                "Ready for Pickup" && (
                                                <Grid item>
                                                    <Button
                                                        onClick={() =>
                                                            updateOrder(
                                                                pendingOrder.id,
                                                                "Submitted"
                                                            )
                                                        }
                                                        disabled={isLoading}
                                                        color="secondary"
                                                        variant="text"
                                                        disableElevation
                                                    >
                                                        Edit Order
                                                    </Button>
                                                </Grid>
                                            )}
                                            {pendingOrder.status === "Submitted" && (
                                                <Grid item>
                                                    <Button
                                                        color="primary"
                                                        variant="contained"
                                                        type="submit"
                                                        disableElevation
                                                        data-testid={`complete-button-${pendingOrder.id}`}
                                                        disabled={
                                                            isLoading ||
                                                            // Check if all quantity fields are zero
                                                            Object.keys(props.values)
                                                                .filter((key) =>
                                                                    key.endsWith(
                                                                        "-quantity"
                                                                    )
                                                                )
                                                                .every(
                                                                    (key) =>
                                                                        props.values[
                                                                            key
                                                                        ] === "0"
                                                                ) ||
                                                            // Check if no checkbox is selected
                                                            Object.keys(props.values)
                                                                .filter((key) =>
                                                                    key.endsWith(
                                                                        "-checkbox"
                                                                    )
                                                                )
                                                                .every(
                                                                    (key) =>
                                                                        !props.values[
                                                                            key
                                                                        ]
                                                                )
                                                        }
                                                    >
                                                        Complete Order
                                                    </Button>
                                                </Grid>
                                            )}
                                            {pendingOrder.status ===
                                                "Ready for Pickup" && (
                                                <Grid item>
                                                    <Tooltip
                                                        title="Ensure that you've collected a piece of ID before the team picks up the order"
                                                        placement="top"
                                                    >
                                                        <span>
                                                            <Button
                                                                color="secondary"
                                                                variant="contained"
                                                                disableElevation
                                                                onClick={() =>
                                                                    updateOrder(
                                                                        pendingOrder.id,
                                                                        "Picked Up"
                                                                    )
                                                                }
                                                            >
                                                                Picked Up
                                                            </Button>
                                                        </span>
                                                    </Tooltip>
                                                </Grid>
                                            )}
                                        </Grid>
                                    </div>
                                </form>
                            );
                        }}
                    </Formik>
                ))}

            <Dialog
                open={showRejectDialog}
                onClose={() => setShowRejectDialog(false)}
                fullWidth
                maxWidth="md" // you can use "sm", "md", "lg", or "xl" as needed
            >
                <DialogTitle>Cancel Order</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Cancellation Message (optional)"
                        type="text"
                        fullWidth
                        multiline
                        rows={4} // increases the input area for multiline text
                        value={cancelMsg}
                        onChange={(e) => setCancelMsg(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setShowRejectDialog(false)}
                        color="secondary"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            if (selectedOrderId !== null) {
                                updateOrder(
                                    selectedOrderId,
                                    "Cancelled",
                                    null,
                                    cancelMsg
                                );
                            }
                            setShowRejectDialog(false);
                            setCancelMsg("");
                        }}
                        color="primary"
                    >
                        Confirm Cancellation
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default TeamPendingOrderTable;
