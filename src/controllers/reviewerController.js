import Publication from '../models/Publication.js';

export async function listAssignments(req, res, next) {
  try {
    const items = await Publication.find({ assignedReviewer: req.user._id }).populate('user', 'name email').sort({ assignedAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (error) { next(error); }
}

export async function decidePublication(req, res, next) {
  try {
    const status = String(req.body.status || '');
    const reason = String(req.body.reason || '').trim();
    if (!['approved', 'rejected', 'revision-requested'].includes(status)) return res.status(400).json({ success: false, message: 'Choose a valid decision.' });
    if (status !== 'approved' && !reason) return res.status(400).json({ success: false, message: 'A reason or suggested improvements are required.' });
    const item = await Publication.findOneAndUpdate({ _id: req.params.id, assignedReviewer: req.user._id }, { status, reviewReason: reason, reviewedBy: req.user._id, reviewedAt: new Date(), publishedAt: status === 'approved' ? new Date() : null }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Assigned publication not found.' });
    res.json({ success: true, message: 'Review decision saved.', data: item });
  } catch (error) { next(error); }
}
