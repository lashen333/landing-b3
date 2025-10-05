// src\routes\variant.routes.ts
import {Router} from "express";
import {createVariant, listVariants, updateVariant, deleteVariant, assignVariant, variantsOverview} from "../controllers/variant.controller";
import {validateBody} from "../middlewares/validate";
import {CreateVariantBodySchema, UpdateVariantBodySchema, AssignVariantBodySchema} from "../schemas/variant.schema";

const router = Router();

router.get("/", listVariants);
router.post("/", validateBody(CreateVariantBodySchema), createVariant);
router.patch("/:id", validateBody(UpdateVariantBodySchema), updateVariant);
router.delete("/:id", deleteVariant);

router.post("/assign", validateBody(AssignVariantBodySchema), assignVariant);
router.get("/analytics/overview", variantsOverview);

export default router;