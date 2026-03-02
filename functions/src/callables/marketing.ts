import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { upsertTouchpoint } from '../lib/marketing';
import { mapError } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

export const marketingCapture = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        sessionId: Joi.string().trim().min(8).max(128).required(),
        deviceIdHash: Joi.string().trim().max(191).allow(null, ''),
        touch: Joi.object({
          utm_source: Joi.string().allow('', null),
          utm_medium: Joi.string().allow('', null),
          utm_campaign: Joi.string().allow('', null),
          referrer: Joi.string().allow('', null),
          landingUrl: Joi.string().allow('', null),
          gclid: Joi.string().allow('', null),
          fbclid: Joi.string().allow('', null),
        })
          .unknown(true)
          .required(),
      }),
      request.data,
    );

    const row = await upsertTouchpoint({
      storeId: payload.storeId,
      sessionId: payload.sessionId,
      uid: request.auth?.uid ?? null,
      deviceIdHash: payload.deviceIdHash || null,
      touch: payload.touch,
    });

    return { touchpointId: row.id };
  } catch (error) {
    mapError(error);
  }
});
