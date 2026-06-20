import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { CustomerController } from "./customer.controller";
import { createCustomerSchema, customerIdParamSchema, updateCustomerSchema } from "./customer.validation";

const router = Router();
router.get("/", CustomerController.getAll);
router.get("/:id", validateRequest(customerIdParamSchema, "params"), CustomerController.getById);
router.post("/", validateRequest(createCustomerSchema), CustomerController.create);
router.put("/:id", validateRequest(customerIdParamSchema, "params"), validateRequest(updateCustomerSchema), CustomerController.update);
router.delete("/:id", validateRequest(customerIdParamSchema, "params"), CustomerController.remove);
export const CustomerRoutes = router;
