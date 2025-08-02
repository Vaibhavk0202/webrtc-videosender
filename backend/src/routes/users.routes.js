import { Router } from "express";
import { addToHistory, getUserHistory, login, register } from "../controllers/user.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";


const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/add_to_activity").post(authenticateToken, addToHistory);
router.route("/get_all_activity").get(authenticateToken, getUserHistory);

export default router;