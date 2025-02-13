import {
    createAsyncThunk,
    createEntityAdapter,
    createSelector,
    createSlice,
} from "@reduxjs/toolkit";
import { OrderStatus } from "api/types";
import { AppDispatch, RootState } from "slices/store";
import { get, post, patch } from "api/api";
import {
    APIListResponse,
    Order,
    OrderInTable,
    ReturnOrderInTable,
    PartReturnedHealth,
} from "api/types";
import { displaySnackbar } from "slices/ui/uiSlice";
import { teamOrderListSerialization } from "api/helpers";

interface TeamOrderExtraState {
    isLoading: boolean;
    error: null | string;
    hardwareIdsToFetch: number[] | null;
    returnedOrders: ReturnOrderInTable[];
    returnedIsLoading: boolean;
    creditsUsed: number;
}

export interface UpdateOrderAttributes {
    id: number;
    status: OrderStatus;
    request?: {
        id: number;
        requested_quantity: number;
    }[];
    cancellation_message?: string;
}

const extraState: TeamOrderExtraState = {
    isLoading: false,
    error: null,
    hardwareIdsToFetch: null,
    returnedOrders: [],
    returnedIsLoading: false,
    creditsUsed: 0,
};

const teamOrders = createEntityAdapter<OrderInTable>();

export const teamOrderReducerName = "teamOrder";
export const initialState = teamOrders.getInitialState(extraState);
export type TeamOrderState = typeof initialState;

interface RejectValue {
    status: number;
    message: any;
}

export const getAdminTeamOrders = createAsyncThunk<
    APIListResponse<Order>,
    string,
    { state: RootState; rejectValue: RejectValue; dispatch: AppDispatch }
>(
    `${teamOrderReducerName}/getAdminTeamOrders`,
    async (team_code, { rejectWithValue, dispatch }) => {
        try {
            const response = await get<APIListResponse<Order>>(
                "/api/hardware/orders/",
                {
                    team_code,
                }
            );
            return response.data;
        } catch (e: any) {
            dispatch(
                displaySnackbar({
                    message: e.response.message,
                    options: {
                        variant: "error",
                    },
                })
            );
            return rejectWithValue({
                status: e.response.status,
                message:
                    e.response.message ?? e.response.data.status ?? e.response.data,
            });
        }
    }
);

export interface ReturnOrderRequest {
    hardware: {
        id: number;
        quantity: number;
        part_returned_health: string;
    }[];
    order: number;
}

export interface ReturnOrderResponse {
    order_id: number;
    team_code: string;
    returned_items: {
        hardware_id: number;
        quantity: number;
    }[];
    errors: {
        hardware_id: number;
        message: string;
    }[];
}

export const returnItems = createAsyncThunk<
    ReturnOrderResponse,
    ReturnOrderRequest,
    { state: RootState; rejectValue: RejectValue; dispatch: AppDispatch }
>(
    `${teamOrderReducerName}/returnItems`,
    async (returnItemsData, { rejectWithValue, dispatch }) => {
        try {
            const response = await post<ReturnOrderResponse>(
                `/api/hardware/orders/returns/`,
                returnItemsData
            );
            dispatch(
                displaySnackbar({
                    message: `Order ${response.data.order_id} has been returned.`,
                    options: {
                        variant: "success",
                    },
                })
            );
            // dispatch(getAdminTeamOrders(response.data.team_code));
            return response.data;
        } catch (e: any) {
            const message =
                e.response.statusText === "Not Found"
                    ? `Could not return order: Error ${e.response.status}`
                    : `Something went wrong: Error ${e.response.status}`;
            dispatch(
                displaySnackbar({
                    message,
                    options: {
                        variant: "error",
                    },
                })
            );
            return rejectWithValue({
                status: e.response.status,
                message: e.response.message ?? e.response.data,
            });
        }
    }
);

export const updateOrderStatus = createAsyncThunk<
    Order,
    UpdateOrderAttributes,
    { state: RootState; rejectValue: RejectValue; dispatch: AppDispatch }
>(
    `${teamOrderReducerName}/updateOrderStatus`,
    async (updateOrderData, { rejectWithValue, dispatch }) => {
        const { id, ...patchData } = updateOrderData;
        try {
            const response = await patch<Order>(
                `/api/hardware/orders/${id}/`,
                patchData
            );
            dispatch(
                displaySnackbar({
                    message: `Order status has been changed.`,
                    options: {
                        variant: "success",
                    },
                })
            );
            // dispatch(getAdminTeamOrders(response.data.team_code));
            return response.data;
        } catch (e: any) {
            const message =
                e.response.statusText === "Not Found"
                    ? `Could not update order status: Error ${e.response.status}`
                    : `Something went wrong: Error ${e.response.status}`;
            dispatch(
                displaySnackbar({
                    message,
                    options: {
                        variant: "error",
                    },
                })
            );
            return rejectWithValue({
                status: e.response.status,
                message: e.response.message ?? e.response.data,
            });
        }
    }
);

const teamOrderSlice = createSlice({
    name: teamOrderReducerName,
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(getAdminTeamOrders.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(getAdminTeamOrders.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            state.error = null;
            const {
                pendingOrders,
                checkedOutOrders,
                returnedOrders,
                hardwareIdsToFetch,
                creditsUsed,
            } = teamOrderListSerialization(payload.results);
            teamOrders.setAll(state, [...pendingOrders, ...checkedOutOrders]);
            state.returnedOrders = returnedOrders;
            state.hardwareIdsToFetch = hardwareIdsToFetch;
            state.creditsUsed = creditsUsed;
        });
        builder.addCase(getAdminTeamOrders.rejected, (state, { payload }) => {
            state.isLoading = false;
            state.error =
                payload?.message ??
                "There was a problem retrieving orders. If this continues please contact hackathon organizers.";
        });
        builder.addCase(returnItems.pending, (state) => {
            state.returnedIsLoading = true;
        });
        builder.addCase(returnItems.fulfilled, (state, { payload, meta }) => {
            // Mark that the return operation is no longer loading.
            state.returnedIsLoading = false;

            // --- Error Handling ---
            if (payload.errors && payload.errors.length > 0) {
                state.error = payload.errors.map((err) => err.message).join(" | ");
            } else {
                state.error = null;
            }

            // --- Update Returned Orders ---
            if (payload.returned_items && payload.returned_items.length > 0) {
                const returnItemsData = meta.arg; // ReturnOrderRequest

                const hardwareInOrder = payload.returned_items.map((item) => {
                    const correspondingRequestItem = returnItemsData.hardware.find(
                        (hardware) => hardware.id === item.hardware_id
                    );
                    const partReturnedHealth: PartReturnedHealth | null =
                        correspondingRequestItem
                            ? (correspondingRequestItem.part_returned_health as PartReturnedHealth)
                            : null;

                    return {
                        id: item.hardware_id,
                        hardware_id: item.hardware_id,
                        quantity: item.quantity,
                        part_returned_health: partReturnedHealth,
                        time: `${new Date().toLocaleTimeString()} (${new Date().toDateString()})`,
                    };
                });

                const existingReturnedOrder = state.returnedOrders.find(
                    (order) => order.id === payload.order_id
                );

                if (existingReturnedOrder) {
                    hardwareInOrder.forEach((newItem) => {
                        const existingHardwareItem =
                            existingReturnedOrder.hardwareInOrder.find(
                                (existingItem) =>
                                    existingItem.hardware_id === newItem.hardware_id &&
                                    existingItem.part_returned_health ===
                                        newItem.part_returned_health
                            );
                        if (existingHardwareItem) {
                            existingHardwareItem.quantity += newItem.quantity;
                        } else {
                            existingReturnedOrder.hardwareInOrder.push(newItem);
                        }
                    });
                } else {
                    state.returnedOrders.push({
                        id: payload.order_id,
                        hardwareInOrder,
                    });
                }
            }

            // --- Update Checked Out Orders in the teamOrders Adapter ---
            // Find the order entity that is being partially returned.
            const orderToUpdate = state.entities[payload.order_id];
            if (orderToUpdate) {
                // For each hardware row in the order, subtract any returned quantity.
                // Note: This example assumes that the row.id corresponds to the hardware id.
                const updatedHardwareInTableRow = orderToUpdate.hardwareInTableRow
                    .map((row) => {
                        // Sum up the total returned quantity for this hardware (regardless of part_returned_health,
                        // since the checked out order row typically doesn’t store health info).
                        const totalReturnedForHardware = payload.returned_items
                            .filter((ri) => ri.hardware_id === row.id)
                            .reduce((sum, ri) => sum + ri.quantity, 0);

                        // Subtract the returned quantity from the quantityGranted.
                        return {
                            ...row,
                            quantityGranted:
                                row.quantityGranted - totalReturnedForHardware,
                        };
                    })
                    // Remove rows that now have zero quantity.
                    .filter((row) => row.quantityGranted > 0);

                // Update the order in the adapter.
                teamOrders.updateOne(state, {
                    id: payload.order_id,
                    changes: {
                        hardwareInTableRow: updatedHardwareInTableRow,
                    },
                });
            }
        });

        builder.addCase(returnItems.rejected, (state, { payload }) => {
            state.returnedIsLoading = false;
            state.error =
                payload?.message ??
                "There was a problem returning orders. If this continues please contact hackathon organizers.";
        });

        builder.addCase(updateOrderStatus.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(updateOrderStatus.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            state.error = null;
            const { pendingOrders } = teamOrderListSerialization([payload]);
            let updateObject;
            if (pendingOrders.length > 0) {
                // Extract the hardware rows and filter out rows where quantityGranted is 0
                let { hardwareInTableRow } = pendingOrders[0];
                // Only filter out rows with quantityGranted 0 if the new status is "Picked Up".
                if (payload.status === "Ready for Pickup") {
                    hardwareInTableRow = hardwareInTableRow.filter(
                        (row) => row.quantityGranted > 0
                    );
                }

                updateObject = {
                    id: payload.id,
                    changes: {
                        status: payload.status,
                        hardwareInTableRow,
                    },
                };
            } else {
                updateObject = {
                    id: payload.id,
                    changes: {
                        status: payload.status,
                    },
                };
            }
            teamOrders.updateOne(state, updateObject);
        });
        builder.addCase(updateOrderStatus.rejected, (state, { payload }) => {
            state.isLoading = false;
            state.error =
                payload?.message ??
                "There was a problem retrieving orders. If this continues please contact hackathon organizers.";
        });
    },
});

export const { actions, reducer } = teamOrderSlice;
export default reducer;

// Selectors
export const teamOrderSliceSelector = (state: RootState) => state[teamOrderReducerName];

export const teamOrderSelectors = teamOrders.getSelectors(teamOrderSliceSelector);

export const isLoadingSelector = createSelector(
    [teamOrderSliceSelector],
    (teamOrderSlice) => teamOrderSlice.isLoading
);

export const errorSelector = createSelector(
    [teamOrderSliceSelector],
    (teamOrderSlice) => teamOrderSlice.error
);

export const isReturnedLoadingSelector = createSelector(
    [teamOrderSliceSelector],
    (teamOrderSlice) => teamOrderSlice.returnedIsLoading
);

export const hardwareInOrdersSelector = createSelector(
    [teamOrderSliceSelector],
    (teamOrderSlice) => teamOrderSlice.hardwareIdsToFetch
);

export const pendingOrdersSelector = createSelector(
    [teamOrderSelectors.selectAll, teamOrderSliceSelector],
    (orders) =>
        orders.filter(
            (order) =>
                order.status === "Submitted" || order.status === "Ready for Pickup"
        )
);

export const checkedOutOrdersSelector = createSelector(
    [teamOrderSelectors.selectAll, teamOrderSliceSelector],
    (orders) => orders.filter((order) => order.status === "Picked Up")
);

export const returnedOrdersSelector = createSelector(
    [teamOrderSliceSelector],
    (teamOrderSlice) => teamOrderSlice.returnedOrders
);

export const getCreditsUsedSelector = createSelector(
    [teamOrderSliceSelector],
    (teamOrderSlice) => teamOrderSlice.creditsUsed
);
