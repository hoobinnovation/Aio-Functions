import { getAuth } from 'firebase-admin/auth';
import { onRequest } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { AdminStoreAccessEntity } from '../db/entities/AdminStoreAccessEntity';
import { OrderEntity } from '../db/entities/OrderEntity';
import { OrderItemEntity } from '../db/entities/OrderItemEntity';

const htmlEscape = (v: string): string =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const invoiceHttp = onRequest(async (req, res) => {
  try {
    const orderId = req.path.split('/').pop();
    const storeId = String(req.query.storeId ?? '');
    if (!orderId || !storeId) {
      res.status(400).send('Missing orderId/storeId');
      return;
    }

    const authHeader = req.headers.authorization ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).send('Unauthorized');
      return;
    }

    const token = authHeader.slice('Bearer '.length);
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const ds = await getDataSource();
    const order = await ds.getRepository(OrderEntity).findOne({ where: { id: orderId, storeId } });
    if (!order) {
      res.status(404).send('Order not found');
      return;
    }

    const isOwner = order.uid === uid;
    const isAdmin = await ds.getRepository(AdminStoreAccessEntity).findOne({ where: { adminUid: uid, storeId } });
    if (!isOwner && !isAdmin) {
      res.status(403).send('Forbidden');
      return;
    }

    const items = await ds.getRepository(OrderItemEntity).find({ where: { orderId: order.id } });

    const rows = items
      .map(
        (i) => `<tr><td>${htmlEscape(i.nameSnapshot)}</td><td>${htmlEscape(i.variantSummarySnapshot)}</td><td>${i.qty}</td><td>${i.unitPrice}</td><td>${i.lineTotal}</td></tr>`,
      )
      .join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${order.orderNumber}</title></head><body>
      <h1>Invoice #${htmlEscape(order.orderNumber)}</h1>
      <p>Status: ${htmlEscape(order.status)} / Payment: ${htmlEscape(order.paymentStatus)}</p>
      <p>Store: ${htmlEscape(order.storeId)}</p>
      <h3>Address</h3><pre>${htmlEscape(JSON.stringify(order.addressSnapshot, null, 2))}</pre>
      <table border="1" cellspacing="0" cellpadding="6"><thead><tr><th>Product</th><th>Variant</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <p>Subtotal: ${order.subtotal}</p>
      <p>Discount: ${order.discountTotal}</p>
      <p>Shipping: ${order.shippingTotal}</p>
      <p>Tax: ${order.taxTotal}</p>
      <h3>Grand Total: ${order.total} ${htmlEscape(order.currency)}</h3>
    </body></html>`;

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : 'internal error');
  }
});
