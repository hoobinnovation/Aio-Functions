import assert from 'assert';
import {
  coercePresenceStatus,
  getAllowedDeliveryActions,
  normalizeDeliveryOrderStatus,
  resolveNextDeliveryStatus,
} from './status';

function run() {
  assert.strictEqual(normalizeDeliveryOrderStatus('accepted'), 'accepted');
  assert.strictEqual(normalizeDeliveryOrderStatus('out_for_delivery'), 'on_the_way');
  assert.strictEqual(coercePresenceStatus('online', true), 'driving');
  assert.deepStrictEqual(getAllowedDeliveryActions('assigned'), ['accept', 'reject']);
  assert.strictEqual(resolveNextDeliveryStatus('assigned', 'accept'), 'accepted');
  assert.strictEqual(resolveNextDeliveryStatus('arrived_dropoff', 'delivered'), 'delivered');
  assert.throws(() => resolveNextDeliveryStatus('assigned', 'delivered'), /Requested rider action is not legal/);
  assert.throws(() => resolveNextDeliveryStatus('assigned', 'reject'), /reason is required/i);
  console.log('delivery self-test passed');
}

run();
