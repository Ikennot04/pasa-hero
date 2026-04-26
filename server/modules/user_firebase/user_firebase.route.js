import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  verifyToken,
  changeEmail,
} from './user_firebase.controller.js';

const router = express.Router();

// User routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// Auth routes
router.post('/auth/verify', verifyToken);

// Email change route
router.post('/change-email', changeEmail);

export default router;
