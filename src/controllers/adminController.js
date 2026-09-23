import Membership from '../models/Membership.js';
import Publication from '../models/Publication.js';

export async function adminOverview(req, res, next) {
  try {
    const [memberships, publications] = await Promise.all([
      Membership.find().populate('user', 'name email').sort({ createdAt: -1 }).lean(),
      Publication.find().populate('user', 'name email').sort({ createdAt: -1 }).lean(),
    ]);
    res.json({ success: true, data: { memberships, publications } });
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
