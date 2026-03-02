# Phase-5 Orders, Insurance, Accounting Contracts

All actions use unified request/response protocol.

## Key execution rules
1. Order placement: in one DB transaction, validate cart stock, decrement `product_variants.stockQty`, create `orders`, `order_items`, `order_status_events`, `shipments`, and `payment_sessions`.
2. Payment session creation requires `store_payment_settings` row; else `CONFIG_MISSING`.
3. `paymentsConfirm` is idempotent by `providerSessionId` and existing `orders.paymentStatus`.
4. Invoice URL strategy: deterministic storage path `gs://invoices/{storeId}/{orderId}.pdf`.
5. Tracking events: append/delete/update through `tracking_events` + `shipments` updates.
6. Insurance state machine: `draft -> submitted -> quoted -> approved|rejected -> fulfillment`; admin must lock quote before send; delivery fee x2 flag set by `deliveryCentsX2Applied`.
7. Insurance file attachments use `insurance_files.mediaAssetId` (from `media_assets`) and expect two document types (`card`,`statement`).
8. Accounting rule: every expense/adjustment/POS sale creates `ledger_entries` with refs.
9. Drawer sessions: open only with opening balance; close only open sessions (single close invariant).
10. Returns/refunds: status transitions plus `refunds` rows for partial/full refund, linked to return.

## Client actions (payload + errors)
- checkoutCreatePaymentSession: payload `{}`; errors `CONFIG_MISSING`,`OUT_OF_STOCK`,`VALIDATION_ERROR`.
- paymentsStatus: `{ orderId }`; errors `NOT_FOUND`,`VALIDATION_ERROR`.
- paymentsConfirm: `{ providerSessionId }`; errors `NOT_FOUND`,`VALIDATION_ERROR`.
- ordersList: `{ limit?, offset? }`.
- ordersGet: `{ orderId }` returns `riskStatus`.
- ordersTracking: `{ orderId }`.
- ordersInvoiceUrl: `{ orderId }`.
- ordersReorder: `{ orderId }`.
- insuranceCreateDraft: `{}`.
- insuranceAttachFiles: `{ insuranceOrderId, files:[{type:'card'|'statement',mediaAssetId}] }`.
- insuranceSubmit: `{ insuranceOrderId }`.
- insuranceGet: `{ insuranceOrderId }`.
- insuranceApproveQuote: `{ insuranceOrderId }` (only quoted).
- insuranceRejectQuote: `{ insuranceOrderId }` (only quoted).
- insuranceListMyOrders: `{ limit?, offset? }`.

## Admin actions (payload summary)
- Orders: list/get/update status/tracking/internal note/invoice/tracking get/add/delete/update shipment.
- Insurance: list/get/add/update/remove items, lock/send quote, set shipment tracking.
- Risk: get/update rules; list/resolve flagged.
- Accounting/POS/Drawers: branches/devices/employees/drawers CRUD+disable; drawer open/close; kpis/ledger; create expense/adjustment/POS sale.
- Reports: overview/top products/orders by status/inventory/customers/returns/loyalty/cashback.
- Returns/refunds: list/get/approve/reject/refund partial/full/update status.

All admin write actions are transactional.

## Error codes
`UNAUTHENTICATED`,`FORBIDDEN`,`VALIDATION_ERROR`,`NOT_FOUND`,`CONFIG_MISSING`,`OUT_OF_STOCK`,`INTERNAL`.

## DB tables touched
orders/order_items/order_status_events/shipments/tracking_events/payment_sessions/store_payment_settings/insurance_* /risk_* /branches/devices/employees/drawers/drawer_sessions/ledger_entries/returns/return_items/refunds.
