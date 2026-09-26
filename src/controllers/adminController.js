import Membership from '../models/Membership.js';
import Publication from '../models/Publication.js';
import User from '../models/User.js';

export async function adminOverview(req, res, next) {
  try {
    const [memberships, publications, reviewers] = await Promise.all([
      Membership.find().populate('user', 'name email role').sort({ createdAt: -1 }).lean(),
      Publication.find().populate('user', 'name email').populate('assignedReviewer', 'name email').sort({ createdAt: -1 }).lean(),
      User.find({ role: 'reviewer' }).select('name email role').sort({ name: 1 }).lean(),
    ]);
    res.json({ success: true, data: { memberships, publications, reviewers } });
  } catch (error) { next(error); }
}

export async function reviewMembership(req, res, next) {
  try {
    const { status, reason = '' } = req.body;
    if (!['reviewing', 'approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Choose a valid review status.' });
    if (status === 'rejected' && !String(reason).trim()) return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
    const item = await Membership.findByIdAndUpdate(req.params.id, { status, reviewReason: String(reason).trim(), reviewedBy: req.user._id, reviewedAt: new Date() }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Membership application not found.' });
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
}

export async function reviewPublication(req, res, next) {
  try {
    const { status, reason = '' } = req.body;
    if (!['under-review', 'published', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Choose a valid review status.' });
    if (status === 'rejected' && !String(reason).trim()) return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
    const update = { status, reviewReason: String(reason).trim(), reviewedBy: req.user._id, reviewedAt: new Date(), publishedAt: status === 'published' ? new Date() : null };
    const item = await Publication.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Publication not found.' });
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
}

export async function setReviewerRole(req, res, next) {
  try {
    const membership = await Membership.findById(req.params.id).populate('user');
    if (!membership?.user) return res.status(404).json({ success: false, message: 'Member account not found.' });
    if (membership.status !== 'approved') return res.status(409).json({ success: false, message: 'Only approved members can become reviewers.' });
    const enabled = req.body.enabled !== false;
    membership.user.role = enabled ? 'reviewer' : 'user';
    await membership.user.save();
    res.json({ success: true, message: enabled ? 'Reviewer role assigned.' : 'Reviewer role removed.' });
  } catch (error) { next(error); }
}

export async function assignPublication(req, res, next) {
  try {
    const reviewer = await User.findOne({ _id: req.body.reviewerId, role: 'reviewer' });
    if (!reviewer || !await Membership.exists({ user: reviewer._id, status: 'approved' })) return res.status(400).json({ success: false, message: 'Select an approved reviewer.' });
    const item = await Publication.findByIdAndUpdate(req.params.id, { assignedReviewer: reviewer._id, assignedBy: req.user._id, assignedAt: new Date(), status: 'under-review' }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Publication not found.' });
    res.json({ success: true, message: 'Publication assigned to reviewer.', data: item });
  } catch (error) { next(error); }
}
