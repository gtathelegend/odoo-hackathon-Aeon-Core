import { Router } from 'express';
import { bookingController } from '../../controllers/booking.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  availabilityQuerySchema,
  bookingActionSchema,
  bookingListQuerySchema,
  createBookingSchema,
  idParamSchema,
  updateBookingSchema,
} from '../../validators/booking';

const router = Router();
router.use(authMiddleware);

router.get(
  '/availability',
  validate(availabilityQuerySchema, 'query'),
  bookingController.availability,
);
router.get('/', validate(bookingListQuerySchema, 'query'), bookingController.list);
router.get('/:id', validate(idParamSchema, 'params'), bookingController.getById);
router.post('/', validate(createBookingSchema), bookingController.create);
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateBookingSchema),
  bookingController.update,
);
router.post(
  '/:id/action',
  validate(idParamSchema, 'params'),
  validate(bookingActionSchema),
  bookingController.action,
);

export default router;
