import {
    Button,
    Checkbox,
    Grid,
    IconButton,
    Link,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    MenuItem,
    Select,
} from "@material-ui/core";
import React, { useState } from "react";
import Container from "@material-ui/core/Container";
import styles from "components/general/OrderTables/OrderTables.module.scss";
import hardwareImagePlaceholder from "assets/images/placeholders/no-hardware-image.svg";
import {
    GeneralOrderTableTitle,
    GeneralOrderTitle,
} from "components/general/OrderTables/OrderTables";
import { Formik, FormikValues } from "formik";
import Info from "@material-ui/icons/Info";
import { useDispatch, useSelector } from "react-redux";
import {
    checkedOutOrdersSelector,
    errorSelector,
    isReturnedLoadingSelector,
    returnItems,
    updateOrderStatus,
} from "slices/order/teamOrderSlice";
import {
    getUpdatedHardwareDetails,
    hardwareSelectors,
} from "slices/hardware/hardwareSlice";
import { displaySnackbar, openProductOverview } from "slices/ui/uiSlice";
import { sortCheckedOutOrders } from "api/helpers";

const createDropdownList = (number: number) => {
    let entry = [];

    for (let i = 1; i <= number; i++) {
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
        orderInitialValues[`${orderItem.id}-condition`] = "Healthy";
    });
    return orderInitialValues;
};

export const TeamCheckedOutOrderTable = () => {
    const unsorted_orders = useSelector(checkedOutOrdersSelector);
    const orders = unsorted_orders.slice().sort(sortCheckedOutOrders);
    const fetchOrdersError = useSelector(errorSelector);
    const returnIsLoading = useSelector(isReturnedLoadingSelector);
    const hardware = useSelector(hardwareSelectors.selectEntities);
    const [visibility, setVisibility] = useState(true);
    const toggleVisibility = () => {
        setVisibility(!visibility);
    };

    // Local state for selected return quantities
    const [selectedReturnQuantities, setSelectedReturnQuantities] = useState<
        Record<number, number>
    >({});

    const dispatch = useDispatch();
    const openProductOverviewPanel = (hardwareId: number) => {
        dispatch(getUpdatedHardwareDetails(hardwareId));
        dispatch(openProductOverview());
    };

    // Update both local state and Formik's state on quantity change
    const handleQuantityChange = (
        rowId: number,
        value: unknown,
        setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void
    ) => {
        const parsedValue =
            typeof value === "string"
                ? parseInt(value, 10) || 0
                : typeof value === "number"
                ? value
                : 0;

        // Update local state
        setSelectedReturnQuantities((prev) => ({
            ...prev,
            [rowId]: parsedValue,
        }));

        // Sync with Formik's state
        setFieldValue(`${rowId}-quantity`, parsedValue.toString());
    };

    const handleReturnOrder = (values: FormikValues, orderId: number) => {
        try {
            // Find the order by ID
            const checkedOutOrder = orders.find((order) => order.id === orderId);
            if (!checkedOutOrder) {
                throw new Error("Order not found.");
            }

            // Convert Formik values to the correct format, but filter out hardware that is already fully returned.
            const hardwareReturnData: {
                id: number;
                quantity: number;
                part_returned_health: string;
            }[] = [];
            const keys = Object.keys(values);
            for (let i = 0; i < keys.length; i += 3) {
                const id = parseInt(keys[i].split("-")[0]);
                // Only process if the checkbox (or whatever flag) is checked
                if (values[keys[i + 1]]) {
                    const quantityToReturn = parseInt(values[keys[i]] as string, 10);

                    // Look up the hardware row in the checked out order
                    const hardwareRow = checkedOutOrder.hardwareInTableRow.find(
                        (row) => row.id === id
                    );
                    // If the hardwareRow exists and its remaining quantity is greater than zero, include it.
                    if (hardwareRow && hardwareRow.quantityGranted > 0) {
                        // You might also want to ensure that quantityToReturn does not exceed the remaining quantity.
                        hardwareReturnData.push({
                            id,
                            quantity: Math.min(
                                quantityToReturn,
                                hardwareRow.quantityGranted
                            ),
                            part_returned_health: values[keys[i + 2]] as string,
                        });
                    }
                }
            }

            // Only dispatch returnItems if there's at least one valid hardware return.
            if (hardwareReturnData.length > 0) {
                dispatch(returnItems({ hardware: hardwareReturnData, order: orderId }));
            } else {
                // Otherwise, you might choose to directly update the order status
                dispatch(updateOrderStatus({ id: orderId, status: "Returned" }));
                return;
            }

            // Check if all items in the order have been returned.
            const allItemsReturned = checkedOutOrder.hardwareInTableRow.every((row) => {
                // Calculate how many of this hardware have been returned (from the current request)
                const returnedQuantity =
                    hardwareReturnData.find((h) => h.id === row.id)?.quantity || 0;
                const remainingQty = (row.quantityGranted || 0) - returnedQuantity;
                return remainingQty === 0;
            });

            if (allItemsReturned) {
                dispatch(updateOrderStatus({ id: orderId, status: "Returned" }));
            }
        } catch (e) {
            dispatch(
                displaySnackbar({
                    message: "There was an error processing the return.",
                    options: { variant: "error" },
                })
            );
        }
    };

    return (
        <Container
            className={styles.tableContainer}
            maxWidth={false}
            disableGutters={true}
        >
            <GeneralOrderTitle
                title="Checked Out Items"
                isVisible={visibility}
                toggleVisibility={toggleVisibility}
            />
            {visibility &&
                (!orders.length || fetchOrdersError ? (
                    <Paper elevation={2} className={styles.empty} square={true}>
                        {fetchOrdersError
                            ? `Unable to view checked out items.`
                            : "You have no items checked out yet. View our inventory."}
                    </Paper>
                ) : (
                    orders.map((checkedOutOrder) => (
                        <Formik
                            initialValues={setInitialValues(
                                checkedOutOrder.hardwareInTableRow
                            )}
                            onSubmit={(values) => {
                                handleReturnOrder(values, checkedOutOrder.id);
                            }}
                            key={checkedOutOrder.id}
                        >
                            {(props) => {
                                // Compute the credit subtotal for the order.
                                const orderTotalCredits =
                                    checkedOutOrder.hardwareInTableRow.reduce(
                                        (sum, row) => {
                                            // Convert the Formik value to a number.
                                            const formikQuantity = Number(
                                                props.values[`${row.id}-quantity`]
                                            );
                                            // Determine the selected quantity:
                                            const selectedQuantity =
                                                selectedReturnQuantities[row.id] !==
                                                undefined
                                                    ? selectedReturnQuantities[row.id]
                                                    : isNaN(formikQuantity)
                                                    ? row.quantityGranted
                                                    : formikQuantity;
                                            const creditsPerUnit =
                                                hardware[row.id]?.credits ?? 0;
                                            // Get the condition from Formik; default to "Healthy" if not set.
                                            const selectedCondition =
                                                (props.values[
                                                    `${row.id}-condition`
                                                ] as string) || "Healthy";
                                            // If the condition is "Broken" or "Lost", then row total is 0; otherwise, compute normally.
                                            const rowTotal =
                                                selectedCondition === "Broken" ||
                                                selectedCondition === "Lost"
                                                    ? 0
                                                    : selectedQuantity * creditsPerUnit;
                                            return sum + rowTotal;
                                        },
                                        0
                                    );
                                return (
                                    <form onSubmit={props.handleSubmit}>
                                        <div key={checkedOutOrder.id}>
                                            <GeneralOrderTableTitle
                                                orderId={checkedOutOrder.id}
                                                orderStatus={checkedOutOrder.status}
                                                createdTime={
                                                    checkedOutOrder.createdTime
                                                }
                                                updatedTime={
                                                    checkedOutOrder.updatedTime
                                                }
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
                                                                className={
                                                                    styles.width6
                                                                }
                                                            >
                                                                Name
                                                            </TableCell>
                                                            <TableCell
                                                                className={`${styles.width1} ${styles.noWrap}`}
                                                            >
                                                                Info
                                                            </TableCell>
                                                            <TableCell
                                                                className={`${styles.width1} ${styles.noWrap}`}
                                                            >
                                                                💳 Credits
                                                            </TableCell>
                                                            <TableCell
                                                                className={`${styles.width1} ${styles.noWrap}`}
                                                            >
                                                                Qty to return
                                                            </TableCell>
                                                            <TableCell
                                                                className={`${styles.width6} ${styles.noWrap}`}
                                                                align={"right"}
                                                            >
                                                                Qty remaining
                                                            </TableCell>
                                                            <TableCell
                                                                className={`${styles.width1} ${styles.noWrap}`}
                                                            >
                                                                Condition
                                                            </TableCell>
                                                            <TableCell
                                                                className={`${styles.width1} ${styles.noWrap}`}
                                                            >
                                                                <Checkbox
                                                                    color="primary"
                                                                    data-testid={`checkall-${checkedOutOrder.id}`}
                                                                    onChange={(e) => {
                                                                        checkedOutOrder.hardwareInTableRow.forEach(
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
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {checkedOutOrder.hardwareInTableRow.map(
                                                            (row) => {
                                                                // Use local state if available; otherwise, default to Formik's value.
                                                                // Here we type-cast the value from Formik as a string.
                                                                const selectedQuantity =
                                                                    selectedReturnQuantities[
                                                                        row.id
                                                                    ] ??
                                                                    parseInt(
                                                                        props.values[
                                                                            `${row.id}-quantity`
                                                                        ] as string,
                                                                        10
                                                                    );
                                                                const creditsPerUnit =
                                                                    hardware[row.id]
                                                                        ?.credits ?? 0;
                                                                const selectedCondition =
                                                                    (props.values[
                                                                        `${row.id}-condition`
                                                                    ] as string) ||
                                                                    "Healthy";

                                                                // Calculate total credits (set to 0 if condition is Broken or Lost)
                                                                const totalCredits =
                                                                    selectedCondition ===
                                                                        "Broken" ||
                                                                    selectedCondition ===
                                                                        "Lost"
                                                                        ? 0
                                                                        : selectedQuantity *
                                                                          creditsPerUnit;

                                                                return (
                                                                    <TableRow
                                                                        key={row.id}
                                                                        data-testid={`table-${checkedOutOrder.id}-${row.id}`}
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
                                                                                    ]
                                                                                        ?.name
                                                                                }
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {
                                                                                hardware[
                                                                                    row
                                                                                        .id
                                                                                ]?.name
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <IconButton
                                                                                color="inherit"
                                                                                aria-label="Info"
                                                                                data-testid="info-button"
                                                                                onClick={() =>
                                                                                    openProductOverviewPanel(
                                                                                        row.id
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Info />
                                                                            </IconButton>
                                                                        </TableCell>
                                                                        <TableCell
                                                                            style={{
                                                                                textAlign:
                                                                                    "right",
                                                                                fontWeight:
                                                                                    "bold",
                                                                                color: "#28a745",
                                                                            }}
                                                                        >
                                                                            {
                                                                                totalCredits
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell>
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
                                                                                        // Update both Formik and local state with the full quantity
                                                                                        props.setFieldValue(
                                                                                            `${row.id}-quantity`,
                                                                                            row.quantityGranted.toString()
                                                                                        );
                                                                                        setSelectedReturnQuantities(
                                                                                            (
                                                                                                prev
                                                                                            ) => ({
                                                                                                ...prev,
                                                                                                [row.id]:
                                                                                                    row.quantityGranted,
                                                                                            })
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
                                                                                    ) =>
                                                                                        handleQuantityChange(
                                                                                            row.id,
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                            props.setFieldValue
                                                                                        )
                                                                                    }
                                                                                    label="Qty"
                                                                                    labelId="qtyLabel"
                                                                                    name={`${row.id}-quantity`}
                                                                                    id={`${row.id}-quantity`}
                                                                                    data-testid={`select`}
                                                                                >
                                                                                    {createDropdownList(
                                                                                        row.quantityGranted
                                                                                    )}
                                                                                </Select>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell
                                                                            align={
                                                                                "right"
                                                                            }
                                                                        >
                                                                            {
                                                                                row.quantityGranted
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Select
                                                                                value={
                                                                                    selectedCondition
                                                                                }
                                                                                onChange={
                                                                                    props.handleChange
                                                                                }
                                                                                label="Condition"
                                                                                labelId="conditionLabel"
                                                                                name={`${row.id}-condition`}
                                                                                id={`${row.id}-condition`}
                                                                                defaultValue={
                                                                                    "Healthy"
                                                                                }
                                                                            >
                                                                                <MenuItem value="Healthy">
                                                                                    Healthy
                                                                                </MenuItem>
                                                                                <MenuItem value="Heavily Used">
                                                                                    Heavily
                                                                                    Used
                                                                                </MenuItem>
                                                                                <MenuItem value="Broken">
                                                                                    Broken
                                                                                </MenuItem>
                                                                                <MenuItem value="Lost">
                                                                                    Lost
                                                                                </MenuItem>
                                                                            </Select>
                                                                        </TableCell>
                                                                        <TableCell align="center">
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
                                                    Credits to Refund: 💳{" "}
                                                    {orderTotalCredits}
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
                                                        Note: participants will receive
                                                        an email every time you change
                                                        the status of their order.
                                                    </Typography>
                                                </Grid>
                                                <Grid item>
                                                    <Button
                                                        color="primary"
                                                        variant="contained"
                                                        type="submit"
                                                        disableElevation
                                                        disabled={
                                                            returnIsLoading ||
                                                            Object.keys(
                                                                props.values
                                                            ).find(
                                                                (key) =>
                                                                    key.includes(
                                                                        "checkbox"
                                                                    ) &&
                                                                    props.values[
                                                                        key
                                                                    ] === true
                                                            ) === undefined
                                                        }
                                                        data-testid={`return-button-${checkedOutOrder.id}`}
                                                    >
                                                        Return Items
                                                    </Button>
                                                </Grid>
                                            </Grid>
                                        </div>
                                    </form>
                                );
                            }}
                        </Formik>
                    ))
                ))}
        </Container>
    );
};

export default TeamCheckedOutOrderTable;
