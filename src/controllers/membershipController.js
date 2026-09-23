import Membership from "../models/Membership.js";
import { unlink } from 'node:fs/promises';

const duplicateMessage = 'An application with this email address already exists. Please contact us if you need to update it.';

export async function listMembers(req, res, next) {
  try {
    const members = await Membership.find({ status: 'approved' })
      .select('fullName designation institution country nationality interests contribution profilePicture')
      .sort({ fullName: 1 })
      .lean();
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
}

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
    const email = req.user.email;
    if (await Membership.exists({ $or: [{ email }, { user: req.user._id }] }).collation({ locale: 'en', strength: 2 })) {
      await removeRejectedUploads(req.files);
      return res.status(409).json({ success: false, message: duplicateMessage, errors: { email: 'This email address has already been used for an application.' } });
    }
    const membership = await Membership.create({
      ...req.body,
      email,
      user: req.user._id,
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

export async function getMyMembership(req, res, next) {
  try {
    const membership = await Membership.findOne({ user: req.user._id }).lean();
    res.json({ success: true, data: membership });
  } catch (error) { next(error); }
}
