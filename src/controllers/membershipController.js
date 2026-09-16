import Membership from "../models/Membership.js";
import { unlink } from 'node:fs/promises';

const duplicateMessage = 'An application with this email address already exists. Please contact us if you need to update it.';

async function removeRejectedUploads(files) {
  const paths = Object.values(files || {}).flat().map(file => file.path).filter(Boolean);
  await Promise.allSettled(paths.map(path => unlink(path)));
}

export async function createMembership(req, res, next) {
  try {
    if (!req.files?.profilePicture?.[0] || !req.files?.cv?.[0]) {
      return res
        .status(400)
        .json({
          success: false,
          message: "A profile picture and PDF CV are required.",
        });
    }
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : undefined;
    if (email && await Membership.exists({ email }).collation({ locale: 'en', strength: 2 })) {
      await removeRejectedUploads(req.files);
      return res.status(409).json({ success: false, message: duplicateMessage, errors: { email: 'This email address has already been used for an application.' } });
    }
    const membership = await Membership.create({
      ...req.body,
      email,
      interests: Array.isArray(req.body.interests)
        ? req.body.interests
        : [req.body.interests].filter(Boolean),
      profilePicture: `uploads/profiles/${req.files.profilePicture[0].filename}`,
      cv: `uploads/cvs/${req.files.cv[0].filename}`,
    });
    res
      .status(201)
      .json({
        success: true,
        message: "Application submitted successfully.",
        data: { id: membership.id, status: membership.status },
      });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      await removeRejectedUploads(req.files);
      return res.status(409).json({ success: false, message: duplicateMessage, errors: { email: 'This email address has already been used for an application.' } });
    }
    next(error);
  }
}
